// ============================================================
// LESOTHO INTEGRATED GOVERNMENT SERVICES
// Backend Server — Single File
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");

// Firebase Admin — MODULAR IMPORT (works on all versions)
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// ============================================================
// 1. FIREBASE ADMIN INIT
// ============================================================
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT || "./FirebaseAccountKey.json";

const resolvedPath = path.resolve(serviceAccountPath.replace(/^\./, ""));

console.log("🔍 Looking for Firebase key at:", resolvedPath);

if (!fs.existsSync(resolvedPath)) {
  console.error("❌ Firebase service account key not found at:", resolvedPath);
  console.error("   Download it from Firebase Console → Project Settings → Service Accounts");
  process.exit(1);
}

const serviceAccount = require(resolvedPath);

initializeApp({
  credential: cert(serviceAccount)
});

const firebaseAuth = getAuth();

console.log("✅ Firebase Admin initialized");

// ============================================================
// 2. MYSQL CONNECTION POOL
// ============================================================
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lesotho_gov",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ MySQL connected");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error("   Check your .env DB_* values and make sure MySQL is running.");
    process.exit(1);
  }
})();

// ============================================================
// 3. EXPRESS APP SETUP
// ============================================================
const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000"
  ],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// 4. MIDDLEWARE — Verify Firebase ID Token
// ============================================================
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email || null;
    req.firebasePhone = decoded.phone_number || null;
    req.firebaseName = decoded.name || null;
    req.firebasePicture = decoded.picture || null;
    req.provider = decoded.firebase?.sign_in_provider || "unknown";

    const [rows] = await db.query(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    req.dbUser = rows[0] || null;

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ============================================================
// 5. HEALTH CHECK
// ============================================================
app.get("/", (req, res) => {
  res.json({
    service: "Lesotho Integrated Government Services API",
    status: "running",
    time: new Date().toISOString()
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", db: "connected", firebase: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ============================================================
// 6. REGISTRATION — CITIZEN
// ============================================================
app.post("/api/register/citizen", verifyToken, async (req, res) => {
  if (req.dbUser) {
    const [existingProfile] = await db.query(
      "SELECT * FROM citizen_profiles WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    return res.status(200).json({
      success: true,
      message: "Citizen already registered",
      user: req.dbUser,
      profile: existingProfile[0] || null
    });
  }

  const {
    nationalId,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    gender,
    maritalStatus,
    phone
  } = req.body;

  const derivedFirst =
    firstName || (req.firebaseName ? req.firebaseName.split(" ")[0] : null);
  const derivedLast =
    lastName ||
    (req.firebaseName
      ? req.firebaseName.split(" ").slice(1).join(" ")
      : null);

  if (!nationalId || !derivedFirst || !derivedLast) {
    return res
      .status(400)
      .json({ error: "nationalId, firstName, lastName are required" });
  }

  const finalPhone = phone || req.firebasePhone || null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.query(
      `INSERT INTO users
        (firebase_uid, email, phone, account_type, email_verified, phone_verified, account_verified, status)
       VALUES (?, ?, ?, 'citizen', ?, ?, ?, 'active')`,
      [
        req.firebaseUid,
        req.firebaseEmail,
        finalPhone,
        !!req.firebaseEmail,
        !!req.firebasePhone,
        !!req.firebaseEmail && !!req.firebasePhone
      ]
    );

    const userId = userResult.insertId;

    const [profileResult] = await conn.query(
      `INSERT INTO citizen_profiles
        (user_id, firebase_uid, national_id, first_name, middle_name, last_name,
         date_of_birth, gender, marital_status, phone, email, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        req.firebaseUid,
        nationalId,
        derivedFirst,
        middleName || null,
        derivedLast,
        dateOfBirth || null,
        gender || null,
        maritalStatus || null,
        finalPhone,
        req.firebaseEmail
      ]
    );

    await conn.commit();

    await logAudit(req.firebaseUid, "CREATE", "citizen_profiles", profileResult.insertId, null, {
      national_id: nationalId,
      method: req.provider
    });

    res.status(201).json({
      success: true,
      message: "Citizen registered successfully",
      userId,
      citizenId: profileResult.insertId
    });
  } catch (err) {
    await conn.rollback();
    console.error("Citizen registration error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Citizen already registered" });
    }
    res.status(500).json({ error: "Registration failed", details: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// 7. REGISTRATION — OFFICER
// ============================================================
app.post("/api/register/officer", verifyToken, async (req, res) => {
  if (req.dbUser) {
    const [existing] = await db.query(
      "SELECT * FROM officers WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    return res.status(200).json({
      success: true,
      message: "Officer already registered",
      user: req.dbUser,
      profile: existing[0] || null
    });
  }

  const { employeeNumber, firstName, lastName, phone, position, departmentId } = req.body;

  if (!employeeNumber || !firstName || !lastName || !departmentId) {
    return res.status(400).json({
      error: "employeeNumber, firstName, lastName, departmentId are required"
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.query(
      `INSERT INTO users
        (firebase_uid, email, phone, account_type, email_verified, phone_verified, account_verified, status)
       VALUES (?, ?, ?, 'officer', ?, ?, ?, 'active')`,
      [
        req.firebaseUid,
        req.firebaseEmail,
        phone || req.firebasePhone || null,
        !!req.firebaseEmail,
        !!req.firebasePhone,
        !!req.firebaseEmail && !!req.firebasePhone
      ]
    );

    const userId = userResult.insertId;

    const [officerResult] = await conn.query(
      `INSERT INTO officers
        (user_id, firebase_uid, employee_number, first_name, last_name, phone, position, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        req.firebaseUid,
        employeeNumber,
        firstName,
        lastName,
        phone || null,
        position || null,
        departmentId
      ]
    );

    await conn.commit();

    await logAudit(req.firebaseUid, "CREATE", "officers", officerResult.insertId, null, {
      employee_number: employeeNumber
    });

    res.status(201).json({
      success: true,
      message: "Officer registered successfully",
      userId,
      officerId: officerResult.insertId
    });
  } catch (err) {
    await conn.rollback();
    console.error("Officer registration error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Officer already registered" });
    }
    res.status(500).json({ error: "Registration failed", details: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// 8. LOGIN
// ============================================================
app.post("/api/login", verifyToken, async (req, res) => {
  if (!req.dbUser) {
    return res.status(404).json({
      error: "User not found in database",
      code: "NOT_REGISTERED",
      firebaseUid: req.firebaseUid,
      email: req.firebaseEmail,
      phone: req.firebasePhone,
      name: req.firebaseName,
      picture: req.firebasePicture
    });
  }

  if (req.dbUser.status !== "active") {
    return res.status(403).json({ error: "Account is not active" });
  }

  await db.query(
    "UPDATE users SET last_login = NOW() WHERE user_id = ?",
    [req.dbUser.user_id]
  );

  let profile = null;
  if (req.dbUser.account_type === "citizen") {
    const [rows] = await db.query(
      "SELECT * FROM citizen_profiles WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    profile = rows[0] || null;
  } else if (req.dbUser.account_type === "officer") {
    const [rows] = await db.query(
      "SELECT * FROM officers WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    profile = rows[0] || null;
  }

  await logLogin(req.firebaseUid, true, req.ip, req.headers["user-agent"]);

  res.json({
    success: true,
    user: {
      userId: req.dbUser.user_id,
      firebaseUid: req.dbUser.firebase_uid,
      email: req.dbUser.email,
      phone: req.dbUser.phone,
      accountType: req.dbUser.account_type,
      phoneVerified: !!req.dbUser.phone_verified,
      emailVerified: !!req.dbUser.email_verified,
      accountVerified: !!req.dbUser.account_verified
    },
    profile,
    provider: req.provider
  });
});

// ============================================================
// 9. PHONE OTP — SEND
// ============================================================
app.post("/api/otp/send", async (req, res) => {
  const { phone, purpose } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "phone is required" });
  }

  try {
    await db.query(
      `INSERT INTO otp_verifications
        (firebase_uid, phone, purpose, channel, status)
       VALUES (?, ?, ?, 'sms', 'pending')`,
      ["pending-" + Date.now(), phone, purpose || "registration"]
    );

    res.json({
      success: true,
      message: "OTP request logged",
      phone
    });
  } catch (err) {
    console.error("OTP send log error:", err);
    res.status(500).json({ error: "Failed to log OTP request" });
  }
});

// ============================================================
// 10. PHONE OTP — VERIFY
// ============================================================
app.post("/api/otp/verify", verifyToken, async (req, res) => {
  if (!req.firebasePhone) {
    return res.status(400).json({
      error: "No phone number in token. Firebase phone verification incomplete."
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (req.dbUser) {
      await conn.query(
        `UPDATE users
           SET phone_verified = TRUE,
               phone = COALESCE(phone, ?),
               account_verified = (email_verified AND TRUE)
         WHERE firebase_uid = ?`,
        [req.firebasePhone, req.firebaseUid]
      );
    } else {
      await conn.query(
        `INSERT INTO users
          (firebase_uid, email, phone, account_type, phone_verified, account_verified, status)
         VALUES (?, ?, ?, 'citizen', TRUE, FALSE, 'active')`,
        [req.firebaseUid, req.firebaseEmail, req.firebasePhone]
      );
    }

    await conn.query(
      `UPDATE otp_verifications
         SET status = 'verified',
             verified_at = NOW(),
             firebase_uid = ?
       WHERE phone = ? AND status = 'pending'
       ORDER BY otp_id DESC LIMIT 1`,
      [req.firebaseUid, req.firebasePhone]
    );

    await conn.query(
      `UPDATE citizen_profiles
         SET phone = COALESCE(phone, ?)
       WHERE firebase_uid = ?`,
      [req.firebasePhone, req.firebaseUid]
    );

    await conn.commit();

    await logAudit(req.firebaseUid, "UPDATE", "users", null,
      { phone_verified: false }, { phone_verified: true });

    res.json({
      success: true,
      message: "Phone verified successfully",
      phone: req.firebasePhone
    });
  } catch (err) {
    await conn.rollback();
    console.error("OTP verify error:", err);
    res.status(500).json({ error: "OTP verification failed", details: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// 11. GET CURRENT USER
// ============================================================
app.get("/api/me", verifyToken, async (req, res) => {
  if (!req.dbUser) {
    return res.status(404).json({ error: "User not found" });
  }

  let profile = null;
  if (req.dbUser.account_type === "citizen") {
    const [rows] = await db.query(
      "SELECT * FROM citizen_profiles WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    profile = rows[0] || null;
  } else if (req.dbUser.account_type === "officer") {
    const [rows] = await db.query(
      "SELECT * FROM officers WHERE firebase_uid = ?",
      [req.firebaseUid]
    );
    profile = rows[0] || null;
  }

  res.json({
    user: {
      userId: req.dbUser.user_id,
      firebaseUid: req.dbUser.firebase_uid,
      email: req.dbUser.email,
      phone: req.dbUser.phone,
      accountType: req.dbUser.account_type,
      phoneVerified: !!req.dbUser.phone_verified,
      emailVerified: !!req.dbUser.email_verified,
      accountVerified: !!req.dbUser.account_verified
    },
    profile
  });
});

// ============================================================
// 12. HELPERS
// ============================================================
async function logAudit(userId, action, tableName, recordId, oldValue, newValue) {
  try {
    await db.query(
      `INSERT INTO audit_logs
        (user_id, action, table_name, record_id, old_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        tableName,
        recordId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        null
      ]
    );
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
}

async function logLogin(userId, success, ip, device) {
  try {
    await db.query(
      `INSERT INTO login_history
        (user_id, login_time, ip_address, device, success)
       VALUES (?, NOW(), ?, ?, ?)`,
      [userId, ip || null, device || null, success]
    );
  } catch (err) {
    console.error("Login history error:", err.message);
  }
}

// ============================================================
// 13. START SERVER
// ============================================================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("");
  console.log("====================================================");
  console.log("🇱🇸  Lesotho Integrated Government Services API");
  console.log("====================================================");
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`🔐  Firebase Admin: connected`);
  console.log(`🗄️   MySQL: connected`);
  console.log("====================================================");
  console.log("");
});

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await db.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down...");
  await db.end();
  process.exit(0);
});