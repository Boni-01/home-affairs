// ============================================================
// LESOTHO INTEGRATED GOVERNMENT SERVICES — Backend
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");
const multer = require("multer");

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// ------------------------------------------------------------
// FIREBASE
// ------------------------------------------------------------
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT || "./FirebaseAccountKey.json";
const resolvedPath = path.resolve(serviceAccountPath.replace(/^\./, ""));
if (!fs.existsSync(resolvedPath)) {
  console.error("Firebase key not found at:", resolvedPath);
  process.exit(1);
}
const serviceAccount = require(resolvedPath);
initializeApp({ credential: cert(serviceAccount) });
const firebaseAuth = getAuth();
console.log("Firebase Admin initialized");

// ------------------------------------------------------------
// MYSQL
// ------------------------------------------------------------
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
    const c = await db.getConnection();
    console.log("MySQL connected →", process.env.DB_NAME || "lesotho_gov");
    c.release();
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
    process.exit(1);
  }
})();

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------
const ADMIN_EMAIL = "kramohlabi7@gmail.com";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// ------------------------------------------------------------
// FILE UPLOAD — two separate stores
// ------------------------------------------------------------
const DOCUMENTS_DIR = path.join(__dirname, "uploads", "documents");
const PHOTOS_DIR = path.join(__dirname, "uploads", "photos");
if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// Documents — any file type
const uploadDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DOCUMENTS_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Photos — only jpg/jpeg/png
const uploadPhoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTOS_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || ".jpg").toLowerCase();
      cb(null, `user_${req.uid}_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype);
    if (!ok) return cb(new Error("Only JPG, JPEG, or PNG photos are allowed"));
    cb(null, true);
  }
});

// ------------------------------------------------------------
// EXPRESS
// ------------------------------------------------------------
const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use((req, _, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function publicUrl(relative) {
  if (!relative) return null;
  if (relative.startsWith("http")) return relative;
  return `${BACKEND_URL}${relative}`;
}

async function userWithPhoto(row) {
  if (!row) return null;
  return {
    ...row,
    photo_url: publicUrl(row.photo_path)
  };
}

// ------------------------------------------------------------
// AUTH MIDDLEWARE
// ------------------------------------------------------------
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(authHeader.split(" ")[1]);
    req.uid = decoded.uid;
    req.email = (decoded.email || "").toLowerCase().trim();
    req.phone = decoded.phone_number || null;
    req.name = decoded.name || null;
    req.provider = decoded.firebase?.sign_in_provider || "unknown";

    const [rows] = await db.query(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [req.uid]
    );
    req.dbUser = rows[0] || null;
    req.isAdmin = req.email === ADMIN_EMAIL;

    if (req.isAdmin && req.dbUser &&
        (req.dbUser.role !== "admin" || req.dbUser.account_type !== "admin")) {
      await db.query(
        "UPDATE users SET role = 'admin', account_type = 'admin' WHERE user_id = ?",
        [req.dbUser.user_id]
      );
      req.dbUser.role = "admin";
      req.dbUser.account_type = "admin";
    }

    next();
  } catch (err) {
    console.error("Token error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ------------------------------------------------------------
// HELPERS (IDs, refs, audit)
// ------------------------------------------------------------
async function generateNationalId(conn) {
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM citizen_national_ids"
  );
  return `LS${String(n + 1).padStart(9, "0")}`;
}

async function generateReference(conn, module) {
  const prefix =
    module === "NICR" ? "NICR" :
    module === "IMMIGRATION" ? "IMM" :
    module === "LRMIS" ? "LRM" : "HA";
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM applications WHERE reference_number LIKE ?",
    [`${prefix}-%`]
  );
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function logAudit(userId, applicationId, action, entityType, entityId, details, ip) {
  try {
    await db.query(
      `INSERT INTO audit_logs
        (user_id, application_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [String(userId || ""), applicationId, action, entityType, entityId,
       details ? JSON.stringify(details) : null, ip]
    );
  } catch (err) { console.error("Audit error:", err.message); }
}

// ------------------------------------------------------------
// HEALTH
// ------------------------------------------------------------
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", db: "connected", firebase: "connected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AUTH: REGISTER
// ============================================================
app.post("/api/register", verifyToken, async (req, res) => {
  const { full_name, national_id, phone } = req.body || {};
  if (!full_name) return res.status(400).json({ error: "full_name is required" });

  if (req.dbUser) {
    return res.json({
      success: true,
      user: await userWithPhoto(req.dbUser),
      alreadyRegistered: true,
      isAdmin: req.dbUser.role === "admin"
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const role = req.isAdmin ? "admin" : "client";
    const accountType = req.isAdmin ? "admin" : "citizen";

    const [userResult] = await conn.query(
      `INSERT INTO users
        (firebase_uid, full_name, email, phone, national_id, password_hash, role,
         account_type, account_status, status,
         email_verified, phone_verified, account_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'active', ?, ?, ?)`,
      [
        req.uid,
        full_name,
        req.email || null,
        phone || req.phone || null,
        national_id || null,
        "firebase-managed",
        role,
        accountType,
        !!req.email ? 1 : 0,
        req.phone ? 1 : 0,
        (!!req.email && req.phone) ? 1 : 0
      ]
    );

    const userId = userResult.insertId;
    const newNationalId = await generateNationalId(conn);
    await conn.query(
      "INSERT INTO citizen_national_ids (user_id, national_id_number) VALUES (?, ?)",
      [userId, newNationalId]
    );

    if (!national_id) {
      await conn.query(
        "UPDATE users SET national_id = ? WHERE user_id = ?",
        [newNationalId, userId]
      );
    }

    await conn.commit();

    const [rows] = await conn.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    res.status(201).json({
      success: true,
      user: await userWithPhoto(rows[0]),
      nationalId: newNationalId,
      isAdmin: rows[0].role === "admin"
    });
  } catch (err) {
    await conn.rollback();
    console.error("Register error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Registration failed: " + err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// AUTH: LOGIN
// ============================================================
app.post("/api/login", verifyToken, async (req, res) => {
  if (!req.dbUser) {
    return res.status(404).json({
      code: "NOT_REGISTERED",
      email: req.email,
      phone: req.phone,
      name: req.name
    });
  }

  if (req.dbUser.account_status && req.dbUser.account_status !== "active") {
    return res.status(403).json({ error: "Account suspended" });
  }

  await db.query("UPDATE users SET last_login = NOW() WHERE user_id = ?", [req.dbUser.user_id]);

  const [nid] = await db.query(
    "SELECT national_id_number FROM citizen_national_ids WHERE user_id = ?",
    [req.dbUser.user_id]
  );

  res.json({
    success: true,
    user: await userWithPhoto({
      ...req.dbUser,
      national_id_number: nid[0]?.national_id_number || req.dbUser.national_id
    }),
    isAdmin: req.dbUser.role === "admin"
  });
});

// ============================================================
// AUTH: ME
// ============================================================
app.get("/api/me", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(404).json({ error: "Not registered" });
  const [nid] = await db.query(
    "SELECT national_id_number FROM citizen_national_ids WHERE user_id = ?",
    [req.dbUser.user_id]
  );
  res.json({
    user: await userWithPhoto({
      ...req.dbUser,
      national_id_number: nid[0]?.national_id_number || req.dbUser.national_id
    }),
    isAdmin: req.dbUser.role === "admin"
  });
});

// ============================================================
// UPLOAD MY PHOTO
// ============================================================
app.post(
  "/api/me/photo",
  verifyToken,
  uploadPhoto.single("photo"),
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });
    if (!req.file) return res.status(400).json({ error: "Photo file required" });

    const relativePath = `/uploads/photos/${req.file.filename}`;

    // Delete old photo file if any
    if (req.dbUser.photo_path) {
      const oldPath = path.join(__dirname, req.dbUser.photo_path);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); }
      catch (e) { console.warn("Could not delete old photo:", e.message); }
    }

    await db.query(
      "UPDATE users SET photo_path = ? WHERE user_id = ?",
      [relativePath, req.dbUser.user_id]
    );

    await logAudit(req.dbUser.user_id, null, "PHOTO_UPLOADED",
      "users", req.dbUser.user_id, { path: relativePath }, req.ip);

    const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [req.dbUser.user_id]);
    res.json({ success: true, user: await userWithPhoto(rows[0]) });
  }
);

// ============================================================
// SERVICES
// ============================================================
app.get("/api/services", async (req, res) => {
  try {
    const { module } = req.query;
    let sql = `SELECT * FROM service_catalog WHERE active = 1`;
    const params = [];
    if (module) { sql += " AND module = ?"; params.push(module); }
    sql += " ORDER BY module, service_name";
    const [rows] = await db.query(sql, params);
    res.json({ services: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

app.get("/api/services/:id", async (req, res) => {
  try {
    const [s] = await db.query(
      "SELECT * FROM service_catalog WHERE service_id = ?", [req.params.id]
    );
    if (!s.length) return res.status(404).json({ error: "Service not found" });

    const [f] = await db.query(
      `SELECT field_key, label, field_type, options_json, required,
              help_text, placeholder, sort_order
       FROM service_form_fields WHERE service_id = ? ORDER BY sort_order`,
      [req.params.id]
    );

    res.json({
      service: s[0],
      fields: f.map(row => ({
        ...row,
        options: row.options_json
          ? (typeof row.options_json === "string" ? JSON.parse(row.options_json) : row.options_json)
          : null,
        required: !!row.required
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load service" });
  }
});

// ============================================================
// SUBMIT APPLICATION
// ============================================================
app.post(
  "/api/applications",
  verifyToken,
  uploadDocuments.array("documents", 10),
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });

    const { serviceId, fields: fieldsJson } = req.body;
    if (!serviceId) return res.status(400).json({ error: "serviceId is required" });

    let fields = {};
    try {
      fields = typeof fieldsJson === "string" ? JSON.parse(fieldsJson) : (fieldsJson || {});
    } catch {
      return res.status(400).json({ error: "Invalid fields payload" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [svcRows] = await conn.query(
        "SELECT * FROM service_catalog WHERE service_id = ? AND active = 1",
        [serviceId]
      );
      if (!svcRows.length) throw new Error("Service not available");
      const service = svcRows[0];

      const [defs] = await conn.query(
        "SELECT field_key, required FROM service_form_fields WHERE service_id = ?",
        [serviceId]
      );
      for (const def of defs) {
        if (def.required && !fields[def.field_key]) {
          throw new Error(`Missing required field: ${def.field_key}`);
        }
      }

      const ref = await generateReference(conn, service.module);
      const [appResult] = await conn.query(
        `INSERT INTO applications
          (reference_number, user_id, service_id, module, service_type, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, 'submitted', NOW())`,
        [ref, req.dbUser.user_id, service.service_id, service.module, service.service_name]
      );
      const appId = appResult.insertId;

      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === "") continue;
        await conn.query(
          `INSERT INTO application_field_values (application_id, field_key, field_value)
           VALUES (?, ?, ?)`,
          [appId, key, String(value)]
        );
      }

      if (service.module === "NICR") {
        await conn.query(
          `INSERT INTO civil_record_requests
            (application_id, request_type, subject_full_name, date_of_event, requested_changes)
           VALUES (?, ?, ?, ?, ?)`,
          [
            appId,
            mapNICRRequestType(service.service_code),
            fields.child_first_name
              ? `${fields.child_first_name} ${fields.child_middle_name || ""} ${fields.child_last_name || ""}`.trim()
              : fields.subject_full_name || fields.certificate_holder_name ||
                fields.deceased_full_name || fields.full_name || req.dbUser.full_name,
            fields.child_dob || fields.date_of_birth || fields.date_of_death ||
              fields.marriage_date || null,
            JSON.stringify(fields)
          ]
        );
      } else if (service.module === "IMMIGRATION") {
        await conn.query(
          `INSERT INTO immigration_applications
            (application_id, immigration_type, category, passport_number,
             nationality, date_of_birth, intended_stay_start, intended_stay_end,
             purpose_of_stay, employer_or_institution, residential_address, application_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appId,
            mapImmigrationType(service.service_code),
            fields.visa_category || fields.permit_category || "General",
            fields.passport_number || null,
            fields.nationality || "Unknown",
            fields.date_of_birth || null,
            fields.intended_arrival || fields.intended_stay_start || null,
            fields.intended_departure || fields.intended_stay_end || null,
            fields.purpose_of_visit || fields.purpose_of_stay || null,
            fields.employer_or_institution || null,
            fields.residential_address || null,
            JSON.stringify(fields)
          ]
        );
      } else if (service.module === "LRMIS") {
        let [owners] = await conn.query(
          "SELECT owner_id FROM livestock_owners WHERE user_id = ?",
          [req.dbUser.user_id]
        );
        let ownerId;
        if (!owners.length) {
          const [ownerResult] = await conn.query(
            `INSERT INTO livestock_owners
              (user_id, owner_type, registration_number, physical_address, district, community_or_village, registration_status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
              req.dbUser.user_id,
              fields.owner_type ? fields.owner_type.toLowerCase() : "individual",
              `LO-${Date.now()}`,
              fields.physical_address || "Unknown",
              fields.district || null,
              fields.community_or_village || null
            ]
          );
          ownerId = ownerResult.insertId;
        } else {
          ownerId = owners[0].owner_id;
        }

        if (service.service_code === "LRMIS_ANIMAL_REG") {
          await conn.query(
            `INSERT INTO livestock_animals
              (owner_id, animal_reference, species, sex, breed, date_of_birth, colour, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ownerId,
              fields.animal_reference || `AN-${Date.now()}`,
              (fields.species || "other").toLowerCase(),
              (fields.sex || "unknown").toLowerCase(),
              fields.breed || null,
              fields.date_of_birth || null,
              fields.colour || null,
              fields.location || null
            ]
          );
        } else if (service.service_code === "LRMIS_BRAND") {
          await conn.query(
            `INSERT INTO livestock_marks (owner_id, mark_code, mark_description, mark_status)
             VALUES (?, ?, ?, 'pending')`,
            [ownerId, `MK-${Date.now()}`, fields.mark_description || null]
          );
        }
      }

      const files = req.files || [];
      for (const file of files) {
        await conn.query(
          `INSERT INTO documents
            (application_id, document_type, original_filename, storage_path, mime_type, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            appId,
            file.fieldname || "attachment",
            file.originalname,
            `/uploads/documents/${file.filename}`,
            file.mimetype,
            file.size
          ]
        );
      }

      await conn.query(
        `INSERT INTO notifications (user_id, application_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          req.dbUser.user_id,
          appId,
          "Application received",
          `Your application ${ref} for ${service.service_name} has been submitted.`
        ]
      );

      await logAudit(req.dbUser.user_id, appId, "APPLICATION_SUBMITTED",
        "applications", appId, { reference: ref }, req.ip);

      await conn.commit();

      res.status(201).json({
        success: true,
        applicationId: appId,
        referenceNumber: ref,
        status: "submitted"
      });
    } catch (err) {
      await conn.rollback();
      console.error("Submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);

function mapNICRRequestType(code) {
  const map = {
    NICR_BIRTH_REG: "birth_registration",
    NICR_BIRTH_CERT: "birth_certificate",
    NICR_LATE_BIRTH: "late_birth_registration",
    NICR_DEATH_REG: "death_registration",
    NICR_DEATH_CERT: "death_certificate",
    NICR_ID_NEW: "national_id",
    NICR_ID_RENEW: "id_renewal",
    NICR_ID_LOST: "id_replacement",
    NICR_ID_CORRECT: "record_correction",
    NICR_NAME_CHANGE: "name_change",
    NICR_MARRIAGE_REG: "marriage_record",
    NICR_MARRIAGE_CERT: "marriage_certificate",
    NICR_CIVIL_AMEND: "civil_amendment",
    NICR_VERIFY: "record_verification"
  };
  return map[code] || "birth_registration";
}

function mapImmigrationType(code) {
  if (code === "IMM_VISA") return "visa";
  if (code === "IMM_CITIZENSHIP" || code === "IMM_RESTORE") return "citizenship";
  return "residence_permit";
}

// ============================================================
// MY APPLICATIONS
// ============================================================
app.get("/api/applications/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ applications: [] });
  try {
    const [rows] = await db.query(
      `SELECT application_id, reference_number, module, service_type, status,
              submitted_at, decision_at, decision_notes, fee_amount, payment_status
       FROM applications WHERE user_id = ?
       ORDER BY submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load" });
  }
});

// ============================================================
// APPLICATION DETAIL
// ============================================================
app.get("/api/applications/:id", verifyToken, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT a.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path
       FROM applications a
       JOIN users u ON u.user_id = a.user_id
       WHERE a.application_id = ?`,
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });

    const app = apps[0];
    const isOwner = app.user_id === req.dbUser?.user_id;
    if (!isOwner && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [values] = await db.query(
      "SELECT field_key, field_value FROM application_field_values WHERE application_id = ?",
      [app.application_id]
    );

    const [docs] = await db.query(
      `SELECT document_id, document_type, original_filename, storage_path, mime_type, size_bytes, uploaded_at
       FROM documents WHERE application_id = ?`,
      [app.application_id]
    );

    const [history] = await db.query(
      `SELECT action, entity_type, details, created_at
       FROM audit_logs WHERE application_id = ?
       ORDER BY created_at ASC`,
      [app.application_id]
    );

    let extra = null;
    if (app.module === "NICR") {
      const [r] = await db.query(
        "SELECT * FROM civil_record_requests WHERE application_id = ?",
        [app.application_id]
      );
      extra = r[0] || null;
    } else if (app.module === "IMMIGRATION") {
      const [r] = await db.query(
        "SELECT * FROM immigration_applications WHERE application_id = ?",
        [app.application_id]
      );
      extra = r[0] || null;
    } else if (app.module === "LRMIS") {
      const [r] = await db.query(
        `SELECT la.* FROM livestock_animals la
         JOIN livestock_owners lo ON lo.owner_id = la.owner_id
         WHERE lo.user_id = ?
         ORDER BY la.registered_at DESC LIMIT 1`,
        [app.user_id]
      );
      extra = r[0] || null;
    }

    res.json({
      application: { ...app, photo_url: publicUrl(app.photo_path) },
      values,
      documents: docs,
      history,
      extra
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
app.get("/api/notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      "UPDATE notifications SET read_at = NOW() WHERE notification_id = ? AND user_id = ?",
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// ADMIN
// ============================================================
function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });
  next();
}

app.get("/api/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM applications GROUP BY status"
    );
    const [byModule] = await db.query(
      "SELECT module, COUNT(*) AS count FROM applications GROUP BY module"
    );
    const [users] = await db.query(
      "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
    );
    const [applicationsCount] = await db.query(
      "SELECT COUNT(*) AS total FROM applications"
    );
    const [usersCount] = await db.query(
      "SELECT COUNT(*) AS total FROM users"
    );
    res.json({
      byStatus, byModule, users,
      totalApplications: applicationsCount[0].total,
      totalUsers: usersCount[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/admin/applications", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, module } = req.query;
    let sql = `
      SELECT a.application_id, a.reference_number, a.status, a.module,
             a.service_type, a.submitted_at, a.decision_at,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM applications a
      JOIN users u ON u.user_id = a.user_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    if (module) { sql += " AND a.module = ?"; params.push(module); }
    sql += " ORDER BY a.submitted_at ASC";

    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => ({
        ...r,
        photo_url: publicUrl(r.photo_path)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/admin/applications/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "under_review", "more_information_required", "awaiting_payment",
    "payment_verified", "approved", "rejected",
    "ready_for_collection", "completed", "cancelled"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    await conn.query(
      `UPDATE applications
         SET status = ?, decision_notes = ?,
             decision_at = CASE WHEN ? IN ('approved','rejected','completed')
                                THEN NOW() ELSE decision_at END
       WHERE application_id = ?`,
      [newStatus, note || app.decision_notes, newStatus, req.params.id]
    );

    await conn.query(
      `INSERT INTO application_status_history
        (application_id, old_status, new_status, changed_by_uid, changed_by_role, note)
       VALUES (?, ?, ?, ?, 'admin', ?)`,
      [app.application_id, app.status, newStatus, req.uid, note || null]
    );

    await conn.query(
      `INSERT INTO notifications (user_id, application_id, title, message)
       VALUES (?, ?, ?, ?)`,
      [
        app.user_id,
        app.application_id,
        "Application status updated",
        `Application ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`
      ]
    );

    await conn.commit();

    await logAudit(req.dbUser.user_id, app.application_id, "STATUS_CHANGED",
      "applications", app.application_id,
      { from: app.status, to: newStatus, note }, req.ip);

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ============================================================
// CERTIFICATE VIEW (returns photo URL)
// ============================================================
app.get("/api/certificates/:applicationId", verifyToken, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT a.*, u.full_name, u.national_id, u.email, u.phone, u.photo_path
       FROM applications a JOIN users u ON u.user_id = a.user_id
       WHERE a.application_id = ?`,
      [req.params.applicationId]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });
    const app = apps[0];

    if (app.user_id !== req.dbUser?.user_id && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (!["approved", "ready_for_collection", "completed"].includes(app.status)) {
      return res.status(400).json({ error: "Certificate not available yet" });
    }

    const [values] = await db.query(
      "SELECT field_key, field_value FROM application_field_values WHERE application_id = ?",
      [app.application_id]
    );
    const data = {};
    for (const v of values) data[v.field_key] = v.field_value;

    res.json({
      application: { ...app, photo_url: publicUrl(app.photo_path) },
      data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("");
  console.log("====================================================");
  console.log("Lesotho Government Services API");
  console.log("====================================================");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin email: ${ADMIN_EMAIL}`);
  console.log("====================================================");
});

process.on("SIGINT", async () => { await db.end(); process.exit(0); });
process.on("SIGTERM", async () => { await db.end(); process.exit(0); });