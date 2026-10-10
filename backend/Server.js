// ============================================================
// LESOTHO INTEGRATED GOVERNMENT SERVICES — Backend (PART 1/2)
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");
const multer = require("multer");

const { PDFDocument, rgb } = require("pdf-lib");

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
// FILE UPLOAD — base directories
// ------------------------------------------------------------
const DOCUMENTS_DIR        = path.join(__dirname, "uploads", "documents");
const PHOTOS_DIR           = path.join(__dirname, "uploads", "photos");
const PASSPORT_PHOTOS_DIR  = path.join(__dirname, "uploads", "passport_photos");
const POLICE_EVIDENCE_DIR  = path.join(__dirname, "uploads", "police_evidence");
const POLICE_CERTIFIED_DIR = path.join(__dirname, "uploads", "police_certified");
const POLICE_LETTERS_DIR   = path.join(__dirname, "uploads", "police_letters");

for (const d of [
  DOCUMENTS_DIR,
  PHOTOS_DIR,
  PASSPORT_PHOTOS_DIR,
  POLICE_EVIDENCE_DIR,
  POLICE_CERTIFIED_DIR,
  POLICE_LETTERS_DIR
]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Path to the police stamp image (transparent PNG)
const POLICE_STAMP_PATH = path.join(__dirname, "police_stamp.png");
if (!fs.existsSync(POLICE_STAMP_PATH)) {
  console.warn("⚠️  police_stamp.png NOT found at:", POLICE_STAMP_PATH);
  console.warn("    Certified documents will be produced WITHOUT a stamp.");
}

// ------------------------------------------------------------
// FILE UPLOAD — multer instances
// ------------------------------------------------------------
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

const uploadPhoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTOS_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || ".jpg").toLowerCase();
      cb(null, `user_${req.uid}_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype);
    if (!ok) return cb(new Error("Only JPG, JPEG, or PNG photos are allowed"));
    cb(null, true);
  }
});

const uploadPassportApplication = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DOCUMENTS_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const passportApplyUploads = uploadPassportApplication.array("documents", 10);

const uploadPoliceEvidence = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, POLICE_EVIDENCE_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});
const policeApplyUploads = uploadPoliceEvidence.array("evidence", 10);

const uploadCertifiedOriginal = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, POLICE_CERTIFIED_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `orig_${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});
const certOriginalUpload = uploadCertifiedOriginal.single("document");

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
  return { ...row, photo_url: publicUrl(row.photo_path) };
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
    module === "LRMIS" ? "LRM" :
    module === "PASSPORT" ? "PP" : "HA";
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM applications WHERE reference_number LIKE ?",
    [`${prefix}-%`]
  );
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function generatePassportReference(conn) {
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM passport_applications WHERE reference_number LIKE 'PP-%'"
  );
  const year = new Date().getFullYear();
  return `PP-${year}-${String(n + 1).padStart(6, "0")}`;
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

const PASSPORT_TIER_META = {
  standard:   { label: "Standard",   color: "#175cd3", note: "Best value" },
  urgent:     { label: "Urgent",     color: "#b45309", note: "Faster processing" },
  express:    { label: "Express",    color: "#b3261e", note: "Fastest tier" },
  emergency:  { label: "Emergency",  color: "#7a1fa2", note: "48 hours — proof required" },
  official:   { label: "Official",   color: "#0f766e", note: "Government business" },
  diplomatic: { label: "Diplomatic", color: "#334155", note: "Foreign Affairs only" }
};

// ============================================================
// HEALTH
// ============================================================
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
        req.uid, full_name, req.email || null, phone || req.phone || null,
        national_id || null, "firebase-managed", role, accountType,
        !!req.email ? 1 : 0, req.phone ? 1 : 0,
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
      email: req.email, phone: req.phone, name: req.name
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
// HOME AFFAIRS — SERVICES
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
// HOME AFFAIRS — SUBMIT APPLICATION
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
    } catch { return res.status(400).json({ error: "Invalid fields payload" }); }

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
          [appId, mapNICRRequestType(service.service_code),
           fields.child_first_name
             ? `${fields.child_first_name} ${fields.child_middle_name || ""} ${fields.child_last_name || ""}`.trim()
             : fields.subject_full_name || fields.certificate_holder_name ||
               fields.deceased_full_name || fields.full_name || req.dbUser.full_name,
           fields.child_dob || fields.date_of_birth || fields.date_of_death ||
             fields.marriage_date || null,
           JSON.stringify(fields)]
        );
      } else if (service.module === "IMMIGRATION") {
        await conn.query(
          `INSERT INTO immigration_applications
            (application_id, immigration_type, category, passport_number,
             nationality, date_of_birth, intended_stay_start, intended_stay_end,
             purpose_of_stay, employer_or_institution, residential_address, application_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [appId, mapImmigrationType(service.service_code),
           fields.visa_category || fields.permit_category || "General",
           fields.passport_number || null, fields.nationality || "Unknown",
           fields.date_of_birth || null,
           fields.intended_arrival || fields.intended_stay_start || null,
           fields.intended_departure || fields.intended_stay_end || null,
           fields.purpose_of_visit || fields.purpose_of_stay || null,
           fields.employer_or_institution || null,
           fields.residential_address || null,
           JSON.stringify(fields)]
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
            [req.dbUser.user_id,
             fields.owner_type ? fields.owner_type.toLowerCase() : "individual",
             `LO-${Date.now()}`, fields.physical_address || "Unknown",
             fields.district || null, fields.community_or_village || null]
          );
          ownerId = ownerResult.insertId;
        } else { ownerId = owners[0].owner_id; }

        if (service.service_code === "LRMIS_ANIMAL_REG") {
          await conn.query(
            `INSERT INTO livestock_animals
              (owner_id, animal_reference, species, sex, breed, date_of_birth, colour, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [ownerId, fields.animal_reference || `AN-${Date.now()}`,
             (fields.species || "other").toLowerCase(),
             (fields.sex || "unknown").toLowerCase(),
             fields.breed || null, fields.date_of_birth || null,
             fields.colour || null, fields.location || null]
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
          [appId, file.fieldname || "attachment", file.originalname,
           `/uploads/documents/${file.filename}`, file.mimetype, file.size]
        );
      }

      await conn.query(
        `INSERT INTO notifications (user_id, application_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [req.dbUser.user_id, appId, "Application received",
         `Your application ${ref} for ${service.service_name} has been submitted.`]
      );

      await logAudit(req.dbUser.user_id, appId, "APPLICATION_SUBMITTED",
        "applications", appId, { reference: ref }, req.ip);

      await conn.commit();
      res.status(201).json({
        success: true, applicationId: appId,
        referenceNumber: ref, status: "submitted"
      });
    } catch (err) {
      await conn.rollback();
      console.error("Submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally { conn.release(); }
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
// HOME AFFAIRS — MY APPLICATIONS
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
// HOME AFFAIRS — APPLICATION DETAIL
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
      values, documents: docs, history, extra
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// HOME AFFAIRS — NOTIFICATIONS
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
// HOME AFFAIRS — ADMIN
// ============================================================
function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: "Admin only" });
  next();
}

app.get("/api/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      `SELECT status, COUNT(*) AS count FROM applications
        WHERE module IN ('NICR','IMMIGRATION','LRMIS')
        GROUP BY status`
    );
    const [byModule] = await db.query(
      `SELECT module, COUNT(*) AS count FROM applications
        WHERE module IN ('NICR','IMMIGRATION','LRMIS')
        GROUP BY module`
    );
    const [users] = await db.query(
      "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
    );
    const [applicationsCount] = await db.query(
      `SELECT COUNT(*) AS total FROM applications
        WHERE module IN ('NICR','IMMIGRATION','LRMIS')`
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
      WHERE a.module IN ('NICR','IMMIGRATION','LRMIS')
    `;
    const params = [];
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    if (module && ["NICR","IMMIGRATION","LRMIS"].includes(module)) {
      sql += " AND a.module = ?";
      params.push(module);
    }
    sql += " ORDER BY a.submitted_at ASC";
    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
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

    if (!["NICR","IMMIGRATION","LRMIS"].includes(app.module)) {
      throw new Error("This application belongs to a different office");
    }

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
      [app.user_id, app.application_id, "Application status updated",
       `Application ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`]
    );

    await conn.commit();
    await logAudit(req.dbUser.user_id, app.application_id, "STATUS_CHANGED",
      "applications", app.application_id,
      { from: app.status, to: newStatus, note }, req.ip);

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally { conn.release(); }
});

// ============================================================
// HOME AFFAIRS — CERTIFICATE
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
// PASSPORT OFFICE MODULE
// ============================================================

// ------------------------------------------------------------
// PASSPORT — SERVICES (grouped by tier)
// ------------------------------------------------------------
app.get("/api/passport/services", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM passport_services
        WHERE active = 1
        ORDER BY
          FIELD(processing_tier,'standard','urgent','express','emergency','official','diplomatic'),
          fee_amount ASC`
    );

    const services = rows.map(r => ({
      ...r,
      tier_label: PASSPORT_TIER_META[r.processing_tier]?.label || r.processing_tier,
      tier_color: PASSPORT_TIER_META[r.processing_tier]?.color || "#175cd3",
      tier_note:  PASSPORT_TIER_META[r.processing_tier]?.note  || ""
    }));

    const grouped = {};
    for (const s of services) {
      grouped[s.application_type] = grouped[s.application_type] || {};
      grouped[s.application_type][s.processing_tier] =
        grouped[s.application_type][s.processing_tier] || [];
      grouped[s.application_type][s.processing_tier].push(s);
    }

    res.json({ services, grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load passport services" });
  }
});

app.get("/api/passport/services/:id", async (req, res) => {
  try {
    const [s] = await db.query(
      "SELECT * FROM passport_services WHERE service_id = ?",
      [req.params.id]
    );
    if (!s.length) return res.status(404).json({ error: "Service not found" });

    const [f] = await db.query(
      `SELECT field_key, label, field_type, options_json, required,
              help_text, placeholder, sort_order
       FROM passport_service_fields WHERE service_id = ? ORDER BY sort_order`,
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

// ------------------------------------------------------------
// PASSPORT — SUBMIT APPLICATION
// ------------------------------------------------------------
app.post(
  "/api/passport/applications",
  verifyToken,
  passportApplyUploads,
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

    if (!req.dbUser.photo_path) {
      return res.status(400).json({
        error: "Please upload your ID photo on your Profile page before applying for a passport."
      });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [svcRows] = await conn.query(
        "SELECT * FROM passport_services WHERE service_id = ? AND active = 1",
        [serviceId]
      );
      if (!svcRows.length) throw new Error("Passport service not available");
      const service = svcRows[0];

      if (["emergency", "official", "diplomatic"].includes(service.processing_tier)) {
        if (!fields.reason || String(fields.reason).trim().length < 10) {
          throw new Error(
            `A written reason is required for ${service.processing_tier} passport applications`
          );
        }
      }

      const [defs] = await conn.query(
        "SELECT field_key, required FROM passport_service_fields WHERE service_id = ?",
        [serviceId]
      );
      for (const def of defs) {
        if (def.required && !fields[def.field_key]) {
          throw new Error(`Missing required field: ${def.field_key}`);
        }
      }

      const ref = await generatePassportReference(conn);
      const photoRelativePath = req.dbUser.photo_path;

      const [appResult] = await conn.query(
        `INSERT INTO passport_applications
           (reference_number, user_id, service_id, application_type, passport_type,
            status, submitted_at, passport_photo_path)
         VALUES (?, ?, ?, ?, 'ordinary', 'submitted', NOW(), ?)`,
        [
          ref,
          req.dbUser.user_id,
          service.service_id,
          service.application_type,
          photoRelativePath
        ]
      );
      const appId = appResult.insertId;

      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === "") continue;
        await conn.query(
          `INSERT INTO passport_application_values (application_id, field_key, field_value)
           VALUES (?, ?, ?)`,
          [appId, key, String(value)]
        );
      }

      const docs = req.files || [];
      for (const file of docs) {
        await conn.query(
          `INSERT INTO passport_documents
             (application_id, document_type, original_filename, storage_path, mime_type, size_bytes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            appId,
            "supporting_document",
            file.originalname,
            `/uploads/documents/${file.filename}`,
            file.mimetype,
            file.size
          ]
        );
      }

      await conn.query(
        `INSERT INTO passport_notifications (user_id, application_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          req.dbUser.user_id,
          appId,
          "Passport application received",
          `Your passport application ${ref} for ${service.service_name} has been submitted.`
        ]
      );

      await conn.query(
        `INSERT INTO passport_status_history
           (application_id, old_status, new_status, changed_by_uid, changed_by_role, change_reason)
         VALUES (?, NULL, 'submitted', ?, 'citizen', 'Application submitted by citizen')`,
        [appId, req.uid]
      );

      await logAudit(
        req.dbUser.user_id,
        appId,
        "PASSPORT_APPLICATION_SUBMITTED",
        "passport_applications",
        appId,
        { reference: ref, tier: service.processing_tier, photo_source: "profile" },
        req.ip
      );

      await conn.commit();
      res.status(201).json({
        success: true,
        applicationId: appId,
        referenceNumber: ref,
        status: "submitted",
        tier: service.processing_tier,
        fee: service.fee_amount
      });
    } catch (err) {
      await conn.rollback();
      console.error("Passport submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);

// ------------------------------------------------------------
// PASSPORT — DELETE MY APPLICATION
// ------------------------------------------------------------
app.delete("/api/passport/applications/:id", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM passport_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    if (app.user_id !== req.dbUser.user_id) {
      throw new Error("Not authorized");
    }

    const deletableStatuses = ["submitted", "more_information_required"];
    if (!deletableStatuses.includes(app.status)) {
      throw new Error(
        `This application can no longer be deleted (status: ${app.status.replace(/_/g, " ")}). ` +
        `Please contact the Passport Office if you need to cancel it.`
      );
    }

    await conn.query(
      "DELETE FROM passport_applications WHERE application_id = ?",
      [app.application_id]
    );

    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      app.application_id,
      "PASSPORT_APPLICATION_DELETED",
      "passport_applications",
      app.application_id,
      { reference: app.reference_number, previous_status: app.status },
      req.ip
    );

    res.json({ success: true, deleted: app.reference_number });
  } catch (err) {
    await conn.rollback();
    console.error("Passport delete error:", err);
    const code =
      err.message === "Not authorized" ? 403 :
      err.message === "Application not found" ? 404 : 400;
    res.status(code).json({ error: err.message || "Delete failed" });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// PASSPORT — MY APPLICATIONS
// ------------------------------------------------------------
app.get("/api/passport/applications/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ applications: [] });
  try {
    const [rows] = await db.query(
      `SELECT pa.application_id, pa.reference_number, pa.application_type,
              pa.passport_type, pa.status, pa.submitted_at, pa.decision_at,
              pa.admin_notes, pa.rejection_reason, pa.passport_photo_path,
              ps.service_name, ps.fee_amount, ps.processing_tier, ps.processing_days
       FROM passport_applications pa
       JOIN passport_services ps ON ps.service_id = pa.service_id
       WHERE pa.user_id = ?
       ORDER BY pa.submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({
      applications: rows.map(r => ({
        ...r,
        passport_photo_url: publicUrl(r.passport_photo_path)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load" });
  }
});

// ------------------------------------------------------------
// PASSPORT — APPLICATION DETAIL
// ------------------------------------------------------------
app.get("/api/passport/applications/:id", verifyToken, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT pa.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path,
              ps.service_name, ps.fee_amount, ps.processing_days,
              ps.processing_tier, ps.application_type AS svc_application_type
       FROM passport_applications pa
       JOIN users u ON u.user_id = pa.user_id
       JOIN passport_services ps ON ps.service_id = pa.service_id
       WHERE pa.application_id = ?`,
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });

    const app = apps[0];
    const isOwner = app.user_id === req.dbUser?.user_id;
    if (!isOwner && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [values] = await db.query(
      "SELECT field_key, field_value FROM passport_application_values WHERE application_id = ?",
      [app.application_id]
    );
    const [docs] = await db.query(
      `SELECT document_id, document_type, original_filename, storage_path, mime_type, size_bytes, uploaded_at
       FROM passport_documents WHERE application_id = ?`,
      [app.application_id]
    );
    const [appts] = await db.query(
      `SELECT appointment_id, appointment_date, appointment_type,
              appointment_status, office_location, admin_notes
       FROM passport_appointments WHERE application_id = ?
       ORDER BY appointment_date ASC`,
      [app.application_id]
    );
    const [bio] = await db.query(
      "SELECT * FROM passport_biometrics WHERE application_id = ?",
      [app.application_id]
    );
    const [pay] = await db.query(
      `SELECT payment_id, fee_type, amount, currency, payment_method,
              payment_status, payment_date, transaction_reference
       FROM passport_payments WHERE application_id = ?`,
      [app.application_id]
    );
    const [history] = await db.query(
      `SELECT old_status, new_status, change_reason, changed_by_role, changed_at
       FROM passport_status_history WHERE application_id = ?
       ORDER BY changed_at ASC`,
      [app.application_id]
    );
    const [passport] = await db.query(
      "SELECT * FROM passports WHERE application_id = ?",
      [app.application_id]
    );

    const passportPhotoPath = app.passport_photo_path || app.photo_path || null;

    res.json({
      application: {
        ...app,
        module: "PASSPORT",
        photo_url: publicUrl(app.photo_path),
        passport_photo_url: publicUrl(passportPhotoPath)
      },
      values,
      documents: docs,
      appointments: appts,
      biometrics: bio[0] || null,
      payments: pay,
      history,
      passport: passport[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PASSPORT — NOTIFICATIONS
// ------------------------------------------------------------
app.get("/api/passport/notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM passport_notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/passport/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      "UPDATE passport_notifications SET read_at = NOW() WHERE notification_id = ? AND user_id = ?",
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PASSPORT — COMPLAINTS (citizen side)
// ------------------------------------------------------------
app.post("/api/passport/complaints", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { application_id, subject, description } = req.body || {};
  if (!subject || !description) {
    return res.status(400).json({ error: "subject and description are required" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO passport_complaints (user_id, application_id, subject, description)
       VALUES (?, ?, ?, ?)`,
      [req.dbUser.user_id, application_id || null, subject, description]
    );
    res.status(201).json({ success: true, complaintId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

app.get("/api/passport/complaints/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ complaints: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM passport_complaints WHERE user_id = ?
       ORDER BY submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ complaints: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN STATS
// ------------------------------------------------------------
app.get("/api/passport/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM passport_applications GROUP BY status"
    );
    const [byType] = await db.query(
      "SELECT application_type, COUNT(*) AS count FROM passport_applications GROUP BY application_type"
    );
    const [byTier] = await db.query(
      `SELECT ps.processing_tier, COUNT(*) AS count
       FROM passport_applications pa
       JOIN passport_services ps ON ps.service_id = pa.service_id
       GROUP BY ps.processing_tier`
    );
    const [total] = await db.query(
      "SELECT COUNT(*) AS total FROM passport_applications"
    );
    const [readyForCollection] = await db.query(
      "SELECT COUNT(*) AS total FROM passport_applications WHERE status = 'ready_for_collection'"
    );
    const [pending] = await db.query(
      "SELECT COUNT(*) AS total FROM passport_applications WHERE status IN ('submitted','under_review','more_information_required','awaiting_payment','awaiting_appointment','awaiting_biometrics')"
    );
    const [approved] = await db.query(
      "SELECT COUNT(*) AS total FROM passport_applications WHERE status IN ('approved','in_production')"
    );
    const [openComplaints] = await db.query(
      "SELECT COUNT(*) AS total FROM passport_complaints WHERE complaint_status IN ('submitted','under_review','awaiting_response')"
    );

    res.json({
      byStatus, byType, byTier,
      totalApplications: total[0].total,
      pendingApplications: pending[0].total,
      approvedApplications: approved[0].total,
      readyForCollection: readyForCollection[0].total,
      openComplaints: openComplaints[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN QUEUE
// ------------------------------------------------------------
app.get("/api/passport/admin/applications", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, application_type, processing_tier } = req.query;
    let sql = `
      SELECT pa.application_id, pa.reference_number, pa.status,
             pa.application_type, pa.passport_type, pa.submitted_at,
             pa.decision_at, pa.admin_notes, pa.passport_photo_path,
             ps.service_name, ps.processing_tier, ps.fee_amount,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM passport_applications pa
      JOIN users u ON u.user_id = pa.user_id
      JOIN passport_services ps ON ps.service_id = pa.service_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND pa.status = ?"; params.push(status); }
    if (application_type) { sql += " AND pa.application_type = ?"; params.push(application_type); }
    if (processing_tier) { sql += " AND ps.processing_tier = ?"; params.push(processing_tier); }
    sql += " ORDER BY pa.submitted_at ASC";

    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => {
        const passportPhotoPath = r.passport_photo_path || r.photo_path || null;
        return {
          ...r,
          module: "PASSPORT",
          photo_url: publicUrl(r.photo_path),
          passport_photo_url: publicUrl(passportPhotoPath)
        };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN UPDATE STATUS
// ------------------------------------------------------------
app.post("/api/passport/admin/applications/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "under_review", "more_information_required", "awaiting_payment",
    "awaiting_appointment", "awaiting_biometrics",
    "approved", "in_production", "ready_for_collection",
    "collected", "rejected", "cancelled"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM passport_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    const isRejection = newStatus === "rejected";

    await conn.query(
      `UPDATE passport_applications
         SET status = ?, admin_notes = COALESCE(?, admin_notes),
             rejection_reason = CASE WHEN ? THEN ? ELSE rejection_reason END,
             decision_at = CASE WHEN ? IN ('approved','rejected','collected')
                                THEN NOW() ELSE decision_at END
       WHERE application_id = ?`,
      [newStatus, note || null, isRejection ? 1 : 0,
       isRejection ? (note || "Not specified") : null,
       newStatus, req.params.id]
    );

    await conn.query(
      `INSERT INTO passport_status_history
        (application_id, old_status, new_status, changed_by_uid, changed_by_role, change_reason)
       VALUES (?, ?, ?, ?, 'admin', ?)`,
      [app.application_id, app.status, newStatus, req.uid, note || null]
    );

    await conn.query(
      `INSERT INTO passport_notifications (user_id, application_id, title, message)
       VALUES (?, ?, ?, ?)`,
      [app.user_id, app.application_id, "Passport application updated",
       `Your passport application ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`]
    );

    if (newStatus === "approved" || newStatus === "in_production") {
      const [existing] = await conn.query(
        "SELECT passport_id FROM passports WHERE application_id = ?",
        [app.application_id]
      );
      if (!existing.length) {
        await conn.query(
          `INSERT INTO passports (application_id, passport_type, production_status)
           VALUES (?, ?, 'in_production')`,
          [app.application_id, app.passport_type]
        );
      }
    }

    await conn.commit();

    await logAudit(req.dbUser.user_id, app.application_id, "PASSPORT_STATUS_CHANGED",
      "passport_applications", app.application_id,
      { from: app.status, to: newStatus, note }, req.ip);

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN RECORD ISSUED PASSPORT
// ------------------------------------------------------------
app.post("/api/passport/admin/applications/:id/issue", verifyToken, requireAdmin, async (req, res) => {
  const { passport_number, issue_date, expiry_date } = req.body || {};
  if (!passport_number || !issue_date || !expiry_date) {
    return res.status(400).json({
      error: "passport_number, issue_date, expiry_date are required"
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM passport_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    await conn.query(
      `INSERT INTO passports
        (application_id, passport_number, passport_type, issue_date, expiry_date, production_status)
       VALUES (?, ?, ?, ?, ?, 'ready_for_collection')
       ON DUPLICATE KEY UPDATE
         passport_number = VALUES(passport_number),
         issue_date = VALUES(issue_date),
         expiry_date = VALUES(expiry_date),
         production_status = 'ready_for_collection'`,
      [app.application_id, passport_number, app.passport_type, issue_date, expiry_date]
    );

    await conn.query(
      `UPDATE passport_applications
         SET status = 'ready_for_collection' WHERE application_id = ?`,
      [app.application_id]
    );

    await conn.query(
      `INSERT INTO passport_status_history
        (application_id, old_status, new_status, changed_by_uid, changed_by_role, change_reason)
       VALUES (?, ?, 'ready_for_collection', ?, 'admin', ?)`,
      [app.application_id, app.status, req.uid,
       `Passport ${passport_number} issued and ready for collection`]
    );

    await conn.query(
      `INSERT INTO passport_notifications (user_id, application_id, title, message)
       VALUES (?, ?, ?, ?)`,
      [app.user_id, app.application_id, "Passport ready for collection",
       `Your passport ${passport_number} is ready. Please collect it from the Passport Office.`]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN RECORD COLLECTION
// ------------------------------------------------------------
app.post("/api/passport/admin/applications/:id/collect", verifyToken, requireAdmin, async (req, res) => {
  const { collection_confirmation, collection_notes } = req.body || {};

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM passport_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    await conn.query(
      `UPDATE passports
         SET production_status = 'collected',
             collection_date = NOW(),
             collection_confirmation = ?,
             collection_notes = ?
       WHERE application_id = ?`,
      [collection_confirmation || null, collection_notes || null, app.application_id]
    );

    await conn.query(
      `UPDATE passport_applications
         SET status = 'collected' WHERE application_id = ?`,
      [app.application_id]
    );

    await conn.query(
      `INSERT INTO passport_status_history
        (application_id, old_status, new_status, changed_by_uid, changed_by_role, change_reason)
       VALUES (?, ?, 'collected', ?, 'admin', 'Passport collected by recipient')`,
      [app.application_id, app.status, req.uid]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN BIO UPDATE
// ------------------------------------------------------------
app.post("/api/passport/admin/applications/:id/biometrics", verifyToken, requireAdmin, async (req, res) => {
  const { fingerprints_captured, photograph_captured, signature_captured, enrolment_reference, notes } = req.body || {};

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM passport_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    const [existing] = await conn.query(
      "SELECT biometric_id FROM passport_biometrics WHERE application_id = ?",
      [app.application_id]
    );

    const allCaptured = !!(fingerprints_captured && photograph_captured && signature_captured);

    if (existing.length) {
      await conn.query(
        `UPDATE passport_biometrics
           SET fingerprints_captured = ?, photograph_captured = ?, signature_captured = ?,
               enrolment_status = ?, enrolment_reference = ?, notes = ?,
               enrolment_date = CASE WHEN ? = 'completed' THEN NOW() ELSE enrolment_date END
         WHERE application_id = ?`,
        [fingerprints_captured ? 1 : 0, photograph_captured ? 1 : 0, signature_captured ? 1 : 0,
         allCaptured ? "completed" : "incomplete",
         enrolment_reference || null, notes || null,
         allCaptured ? "completed" : "incomplete", app.application_id]
      );
    } else {
      await conn.query(
        `INSERT INTO passport_biometrics
          (application_id, fingerprints_captured, photograph_captured, signature_captured,
           enrolment_status, enrolment_reference, notes, enrolment_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [app.application_id, fingerprints_captured ? 1 : 0, photograph_captured ? 1 : 0,
         signature_captured ? 1 : 0, allCaptured ? "completed" : "incomplete",
         enrolment_reference || null, notes || null,
         allCaptured ? new Date() : null]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN APPOINTMENT
// ------------------------------------------------------------
app.post("/api/passport/admin/applications/:id/appointment", verifyToken, requireAdmin, async (req, res) => {
  const { appointment_date, appointment_type, office_location, admin_notes } = req.body || {};
  if (!appointment_date) return res.status(400).json({ error: "appointment_date required" });

  try {
    const [result] = await db.query(
      `INSERT INTO passport_appointments
        (application_id, appointment_date, appointment_type, office_location, admin_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, appointment_date, appointment_type || "biometrics",
       office_location || "Maseru Passport Office", admin_notes || null]
    );

    await db.query(
      `INSERT INTO passport_notifications (user_id, application_id, title, message)
       SELECT user_id, application_id, 'Appointment scheduled',
              CONCAT('An appointment has been scheduled for ', ?, '.')
       FROM passport_applications WHERE application_id = ?`,
      [appointment_date, req.params.id]
    );

    res.status(201).json({ success: true, appointmentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

app.post("/api/passport/admin/appointments/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["booked", "confirmed", "attended", "missed", "cancelled", "rescheduled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid appointment status" });
  }

  try {
    await db.query(
      `UPDATE passport_appointments
         SET appointment_status = ?,
             attendance_recorded_at = CASE WHEN ? IN ('attended','missed') THEN NOW() ELSE attendance_recorded_at END
       WHERE appointment_id = ?`,
      [status, status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN PAYMENTS
// ------------------------------------------------------------
app.post("/api/passport/admin/applications/:id/payment", verifyToken, requireAdmin, async (req, res) => {
  const { fee_type, amount, payment_method, transaction_reference, payment_status } = req.body || {};
  if (!amount) return res.status(400).json({ error: "amount required" });

  try {
    const [result] = await db.query(
      `INSERT INTO passport_payments
        (application_id, fee_type, amount, payment_method, transaction_reference,
         payment_status, payment_date, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id,
       fee_type || "Passport fee",
       amount,
       payment_method || "cash",
       transaction_reference || null,
       payment_status || "paid",
       new Date(),
       (payment_status === "paid") ? new Date() : null]
    );

    if (payment_status === "paid") {
      await db.query(
        `UPDATE passport_applications
           SET status = CASE
             WHEN status = 'awaiting_payment' THEN 'awaiting_appointment'
             ELSE status
           END
         WHERE application_id = ?`,
        [req.params.id]
      );
    }

    res.status(201).json({ success: true, paymentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});


// ------------------------------------------------------------
// PASSPORT — ADMIN COMPLAINTS
// ------------------------------------------------------------
app.get("/api/passport/admin/complaints", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pc.*, u.full_name, u.email
       FROM passport_complaints pc
       JOIN users u ON u.user_id = pc.user_id
       ORDER BY pc.submitted_at DESC`
    );
    res.json({ complaints: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/passport/admin/complaints/:id/respond", verifyToken, requireAdmin, async (req, res) => {
  const { admin_response, complaint_status } = req.body || {};
  if (!admin_response) return res.status(400).json({ error: "admin_response required" });

  try {
    await db.query(
      `UPDATE passport_complaints
         SET admin_response = ?, complaint_status = ?,
             resolved_at = CASE WHEN ? IN ('resolved','closed') THEN NOW() ELSE resolved_at END
       WHERE complaint_id = ?`,
      [admin_response, complaint_status || "under_review",
       complaint_status || "under_review", req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to respond" });
  }
});

// ------------------------------------------------------------
// PASSPORT — ADMIN AUDIT LOGS
// ------------------------------------------------------------
app.get("/api/passport/admin/audit", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.firebase_uid = al.user_id
       WHERE al.entity_type = 'passport_applications'
          OR al.action LIKE 'PASSPORT%'
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PASSPORT — CERTIFICATE / PASSPORT VIEW
// ------------------------------------------------------------
app.get("/api/passport/certificates/:applicationId", verifyToken, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT pa.*, u.full_name, u.national_id, u.email, u.phone, u.photo_path,
              ps.service_name, ps.fee_amount, ps.processing_tier, ps.processing_days
       FROM passport_applications pa
       JOIN users u ON u.user_id = pa.user_id
       JOIN passport_services ps ON ps.service_id = pa.service_id
       WHERE pa.application_id = ?`,
      [req.params.applicationId]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });
    const app = apps[0];

    if (app.user_id !== req.dbUser?.user_id && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (!["approved", "in_production", "ready_for_collection", "collected"].includes(app.status)) {
      return res.status(400).json({ error: "Document not available yet" });
    }

    const [values] = await db.query(
      "SELECT field_key, field_value FROM passport_application_values WHERE application_id = ?",
      [app.application_id]
    );
    const data = {};
    for (const v of values) data[v.field_key] = v.field_value;

    const [passport] = await db.query(
      "SELECT * FROM passports WHERE application_id = ?",
      [app.application_id]
    );

    const passportPhotoPath = app.passport_photo_path || app.photo_path || null;

    res.json({
      application: {
        ...app,
        photo_url: publicUrl(app.photo_path),
        passport_photo_url: publicUrl(passportPhotoPath)
      },
      data,
      passport: passport[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// ============================================================
// POLICE SERVICES MODULE
// ============================================================
// ============================================================

const POLICE_STATUS_META = {
  submitted:                 { label: "Submitted",                 color: "#175cd3", bg: "#eff8ff" },
  received:                  { label: "Received",                  color: "#175cd3", bg: "#eff8ff" },
  under_review:              { label: "Under review",              color: "#b45309", bg: "#fff4df" },
  more_information_required: { label: "More info required",        color: "#b45309", bg: "#fff4df" },
  awaiting_payment:          { label: "Awaiting payment",          color: "#b45309", bg: "#fff4df" },
  referred:                  { label: "Referred to officers",      color: "#7a1fa2", bg: "#f5e9fb" },
  in_progress:               { label: "In progress",               color: "#0f766e", bg: "#e6f4f1" },
  approved:                  { label: "Approved",                  color: "#067647", bg: "#ecfdf3" },
  rejected:                  { label: "Rejected",                  color: "#b3261e", bg: "#fdecea" },
  ready_for_collection:      { label: "Ready for collection",      color: "#067647", bg: "#ecfdf3" },
  completed:                 { label: "Completed",                 color: "#6651aa", bg: "#f0edfc" },
  cancelled:                 { label: "Cancelled",                 color: "#475569", bg: "#f1f5f9" }
};

// ------------------------------------------------------------
// POLICE — reference generator
// ------------------------------------------------------------
async function generatePoliceReference(conn, application_type) {
  const prefix =
    application_type === "police_clearance"            ? "CLR" :
    application_type === "police_report_request"       ? "PRQ" :
    application_type === "police_conduct_complaint"    ? "CMP" :
    application_type === "missing_person_report"       ? "MPR" :
    application_type === "traffic_incident"            ? "TRF" :
    application_type === "fraud_report"                ? "FRD" :
    application_type === "cybercrime_report"           ? "CYB" :
    application_type === "witness_information"         ? "WIT" :
    application_type === "additional_evidence"         ? "EVD" :
    application_type === "feedback"                    ? "FBK" :
    application_type === "theft_report"                ? "THF" :
    application_type === "lost_item_report"            ? "LST" : "CRM";
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM police_applications WHERE reference_number LIKE ?",
    [`${prefix}-%`]
  );
  return `${prefix}-${year}-${String(n + 1).padStart(6, "0")}`;
}

// ------------------------------------------------------------
// POLICE — categories (public)
// ------------------------------------------------------------
app.get("/api/police/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM police_service_categories WHERE is_active = 1 ORDER BY category_name"
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// ------------------------------------------------------------
// POLICE — submit application
// ------------------------------------------------------------
app.post(
  "/api/police/applications",
  verifyToken,
  policeApplyUploads,
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });

    const { categoryId, applicationType, title, description, fields: fieldsJson } = req.body;
    if (!applicationType) return res.status(400).json({ error: "applicationType is required" });
    if (!title || !description) return res.status(400).json({ error: "title and description are required" });

    let fields = {};
    try {
      fields = typeof fieldsJson === "string" ? JSON.parse(fieldsJson) : (fieldsJson || {});
    } catch {
      return res.status(400).json({ error: "Invalid fields payload" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let catId = categoryId;
      if (!catId) {
        const [c] = await conn.query(
          "SELECT category_id FROM police_service_categories LIMIT 1"
        );
        catId = c[0]?.category_id;
      }
      if (!catId) throw new Error("No service category configured");

      const ref = await generatePoliceReference(conn, applicationType);

      const [result] = await conn.query(
        `INSERT INTO police_applications
          (reference_number, user_id, category_id, application_type,
           title, description, incident_date, incident_location,
           district, village_or_area, urgency, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW())`,
        [
          ref,
          req.dbUser.user_id,
          catId,
          applicationType,
          title,
          description,
          fields.incident_date || null,
          fields.incident_location || null,
          fields.district || null,
          fields.village_or_area || null,
          fields.urgency || "normal"
        ]
      );
      const appId = result.insertId;

      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            await conn.query(
              `INSERT INTO police_application_values
                 (application_id, field_key, field_value) VALUES (?, ?, ?)`,
              [appId, key, String(v)]
            );
          }
        } else {
          await conn.query(
            `INSERT INTO police_application_values
               (application_id, field_key, field_value) VALUES (?, ?, ?)`,
            [appId, key, String(value)]
          );
        }
      }

      const files = req.files || [];
      for (const file of files) {
        await conn.query(
          `INSERT INTO police_evidence
            (application_id, uploaded_by, original_filename, storage_path,
             mime_type, file_size_bytes, evidence_description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            appId,
            req.dbUser.user_id,
            file.originalname,
            `/uploads/police_evidence/${file.filename}`,
            file.mimetype,
            file.size,
            "Citizen upload"
          ]
        );
      }

      await conn.query(
        `INSERT INTO police_status_history
          (application_id, old_status, new_status, changed_by_uid, changed_by_role, change_reason)
         VALUES (?, NULL, 'submitted', ?, 'citizen', 'Application submitted by citizen')`,
        [appId, req.uid]
      );

      await conn.query(
        `INSERT INTO police_notifications (user_id, application_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          req.dbUser.user_id,
          appId,
          "Report received",
          `Your police ${applicationType.replace(/_/g, " ")} (${ref}) has been submitted.`
        ]
      );

      await conn.commit();

      await logAudit(
        req.dbUser.user_id,
        appId,
        "POLICE_APPLICATION_SUBMITTED",
        "police_applications",
        appId,
        { reference: ref, applicationType },
        req.ip
      );

      res.status(201).json({
        success: true,
        applicationId: appId,
        referenceNumber: ref,
        status: "submitted"
      });
    } catch (err) {
      await conn.rollback();
      console.error("Police submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);

// ------------------------------------------------------------
// POLICE — my applications
// ------------------------------------------------------------
app.get("/api/police/applications/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ applications: [] });
  try {
    const [rows] = await db.query(
      `SELECT a.application_id, a.reference_number, a.application_type,
              a.title, a.status, a.urgency, a.submitted_at, a.updated_at,
              a.admin_notes, a.decision_notes, a.rejection_reason,
              c.category_name
       FROM police_applications a
       JOIN police_service_categories c ON c.category_id = a.category_id
       WHERE a.user_id = ?
       ORDER BY a.submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load" });
  }
});

// ------------------------------------------------------------
// POLICE — application detail
// ------------------------------------------------------------
app.get("/api/police/applications/:id", verifyToken, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT a.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path,
              c.category_name, c.category_code
       FROM police_applications a
       JOIN users u ON u.user_id = a.user_id
       JOIN police_service_categories c ON c.category_id = a.category_id
       WHERE a.application_id = ?`,
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });

    const app = apps[0];
    const isOwner = app.user_id === req.dbUser?.user_id;
    if (!isOwner && !req.isAdmin) return res.status(403).json({ error: "Not authorized" });

    const [values] = await db.query(
      "SELECT field_key, field_value FROM police_application_values WHERE application_id = ?",
      [app.application_id]
    );
    const [evidence] = await db.query(
      `SELECT evidence_id, original_filename, storage_path, mime_type,
              file_size_bytes, evidence_description, verification_status, uploaded_at
       FROM police_evidence WHERE application_id = ?`,
      [app.application_id]
    );
    const [history] = await db.query(
      `SELECT old_status, new_status, change_reason, changed_by_role, changed_at
       FROM police_status_history WHERE application_id = ?
       ORDER BY changed_at ASC`,
      [app.application_id]
    );
    const [appointments] = await db.query(
      `SELECT appointment_id, appointment_date, appointment_type,
              appointment_status, office_location, admin_notes
       FROM police_appointments WHERE application_id = ?
       ORDER BY appointment_date ASC`,
      [app.application_id]
    );
    const [payments] = await db.query(
      `SELECT payment_id, fee_type, amount, currency, payment_method,
              payment_status, payment_date, transaction_reference
       FROM police_payments WHERE application_id = ?`,
      [app.application_id]
    );

    res.json({
      application: {
        ...app,
        photo_url: publicUrl(app.photo_path)
      },
      values,
      evidence,
      history,
      appointments,
      payments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// POLICE — delete my application
// ------------------------------------------------------------
app.delete("/api/police/applications/:id", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM police_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    if (app.user_id !== req.dbUser.user_id) throw new Error("Not authorized");

    const deletable = ["submitted", "received", "more_information_required"];
    if (!deletable.includes(app.status)) {
      throw new Error(
        `This application can no longer be deleted (status: ${app.status.replace(/_/g, " ")}).`
      );
    }

    await conn.query(
      "DELETE FROM police_applications WHERE application_id = ?",
      [app.application_id]
    );
    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      app.application_id,
      "POLICE_APPLICATION_DELETED",
      "police_applications",
      app.application_id,
      { reference: app.reference_number, previous_status: app.status },
      req.ip
    );

    res.json({ success: true, deleted: app.reference_number });
  } catch (err) {
    await conn.rollback();
    console.error("Police delete error:", err);
    const code =
      err.message === "Not authorized" ? 403 :
      err.message === "Application not found" ? 404 : 400;
    res.status(code).json({ error: err.message || "Delete failed" });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// POLICE — notifications
// ------------------------------------------------------------
app.get("/api/police/notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM police_notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/police/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      "UPDATE police_notifications SET read_at = NOW() WHERE notification_id = ? AND user_id = ?",
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// POLICE — feedback
// ------------------------------------------------------------
app.post("/api/police/feedback", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { application_id, rating, comments } = req.body || {};
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be 1–5" });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO police_feedback (user_id, application_id, rating, comments)
       VALUES (?, ?, ?, ?)`,
      [req.dbUser.user_id, application_id || null, rating, comments || null]
    );
    res.status(201).json({ success: true, feedbackId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

app.get("/api/police/feedback/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ feedback: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM police_feedback WHERE user_id = ?
       ORDER BY submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ feedback: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN stats
// ------------------------------------------------------------
app.get("/api/police/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM police_applications GROUP BY status"
    );
    const [byType] = await db.query(
      "SELECT application_type, COUNT(*) AS count FROM police_applications GROUP BY application_type"
    );
    const [byUrgency] = await db.query(
      "SELECT urgency, COUNT(*) AS count FROM police_applications GROUP BY urgency"
    );
    const [total] = await db.query(
      "SELECT COUNT(*) AS total FROM police_applications"
    );
    const [pending] = await db.query(
      `SELECT COUNT(*) AS total FROM police_applications
        WHERE status IN ('submitted','received','under_review',
                         'more_information_required','awaiting_payment','referred','in_progress')`
    );
    const [resolved] = await db.query(
      `SELECT COUNT(*) AS total FROM police_applications
        WHERE status IN ('approved','ready_for_collection','completed')`
    );
    const [rejected] = await db.query(
      `SELECT COUNT(*) AS total FROM police_applications
        WHERE status = 'rejected'`
    );
    const [openFeedback] = await db.query(
      "SELECT COUNT(*) AS total FROM police_feedback"
    );

    res.json({
      byStatus, byType, byUrgency,
      totalApplications: total[0].total,
      pendingApplications: pending[0].total,
      resolvedApplications: resolved[0].total,
      rejectedApplications: rejected[0].total,
      totalFeedback: openFeedback[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN queue
// ------------------------------------------------------------
app.get("/api/police/admin/applications", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, application_type, urgency } = req.query;
    let sql = `
      SELECT a.application_id, a.reference_number, a.application_type,
             a.title, a.status, a.urgency, a.submitted_at, a.updated_at,
             a.admin_notes, a.incident_location, a.district,
             c.category_name,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM police_applications a
      JOIN users u ON u.user_id = a.user_id
      JOIN police_service_categories c ON c.category_id = a.category_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    if (application_type) { sql += " AND a.application_type = ?"; params.push(application_type); }
    if (urgency) { sql += " AND a.urgency = ?"; params.push(urgency); }
    sql += " ORDER BY FIELD(a.urgency,'urgent','high','normal','low'), a.submitted_at ASC";

    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN update status
// ------------------------------------------------------------
app.post("/api/police/admin/applications/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "received","under_review","more_information_required","awaiting_payment",
    "referred","in_progress","approved","rejected",
    "ready_for_collection","completed","cancelled"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM police_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    const isRejection = newStatus === "rejected";

    await conn.query(
      `UPDATE police_applications
         SET status = ?, admin_notes = COALESCE(?, admin_notes),
             rejection_reason = CASE WHEN ? THEN ? ELSE rejection_reason END,
             decision_at = CASE WHEN ? IN ('approved','rejected','completed')
                                THEN NOW() ELSE decision_at END
       WHERE application_id = ?`,
      [newStatus, note || null, isRejection ? 1 : 0,
       isRejection ? (note || "Not specified") : null,
       newStatus, req.params.id]
    );

    await conn.query(
      `INSERT INTO police_status_history
        (application_id, old_status, new_status, changed_by_uid, changed_by_role, change_reason)
       VALUES (?, ?, ?, ?, 'admin', ?)`,
      [app.application_id, app.status, newStatus, req.uid, note || null]
    );

    await conn.query(
      `INSERT INTO police_notifications (user_id, application_id, title, message)
       VALUES (?, ?, ?, ?)`,
      [app.user_id, app.application_id, "Police report updated",
       `Your report ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`]
    );

    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      app.application_id,
      "POLICE_STATUS_CHANGED",
      "police_applications",
      app.application_id,
      { from: app.status, to: newStatus, note },
      req.ip
    );

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ------------------------------------------------------------
// POLICE — ADMIN record payment
// ------------------------------------------------------------
app.post("/api/police/admin/applications/:id/payment", verifyToken, requireAdmin, async (req, res) => {
  const { fee_type, amount, payment_method, transaction_reference, payment_status } = req.body || {};
  if (!amount) return res.status(400).json({ error: "amount required" });

  try {
    const [result] = await db.query(
      `INSERT INTO police_payments
        (application_id, fee_type, amount, payment_method, transaction_reference,
         payment_status, payment_date, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        fee_type || "Police service fee",
        amount,
        payment_method || "cash",
        transaction_reference || null,
        payment_status || "paid",
        new Date(),
        (payment_status === "paid") ? new Date() : null
      ]
    );

    if (payment_status === "paid") {
      await db.query(
        `UPDATE police_applications
           SET status = CASE
             WHEN status = 'awaiting_payment' THEN 'in_progress'
             ELSE status
           END
         WHERE application_id = ?`,
        [req.params.id]
      );
    }

    res.status(201).json({ success: true, paymentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN schedule appointment
// ------------------------------------------------------------
app.post("/api/police/admin/applications/:id/appointment", verifyToken, requireAdmin, async (req, res) => {
  const { appointment_date, appointment_type, office_location, admin_notes } = req.body || {};
  if (!appointment_date) return res.status(400).json({ error: "appointment_date required" });

  try {
    const [result] = await db.query(
      `INSERT INTO police_appointments
        (application_id, appointment_date, appointment_type, office_location, admin_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.params.id,
        appointment_date,
        appointment_type || "statement",
        office_location || "Maseru Police HQ",
        admin_notes || null
      ]
    );

    await db.query(
      `INSERT INTO police_notifications (user_id, application_id, title, message)
       SELECT user_id, application_id, 'Appointment scheduled',
              CONCAT('An appointment has been scheduled for ', ?, '.')
       FROM police_applications WHERE application_id = ?`,
      [appointment_date, req.params.id]
    );

    res.status(201).json({ success: true, appointmentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

app.post("/api/police/admin/appointments/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["booked","confirmed","attended","missed","cancelled","rescheduled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid appointment status" });
  }
  try {
    await db.query(
      `UPDATE police_appointments
         SET appointment_status = ?,
             attendance_recorded_at = CASE WHEN ? IN ('attended','missed')
                                           THEN NOW() ELSE attendance_recorded_at END
       WHERE appointment_id = ?`,
      [status, status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN verify evidence
// ------------------------------------------------------------
app.post("/api/police/admin/evidence/:id/verify", verifyToken, requireAdmin, async (req, res) => {
  const { verification_status, notes } = req.body || {};
  const allowed = ["pending","verified","rejected"];
  if (!allowed.includes(verification_status)) {
    return res.status(400).json({ error: "Invalid verification_status" });
  }
  try {
    await db.query(
      `UPDATE police_evidence
         SET verification_status = ?,
             evidence_description = COALESCE(?, evidence_description)
       WHERE evidence_id = ?`,
      [verification_status, notes || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update evidence" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN feedback list
// ------------------------------------------------------------
app.get("/api/police/admin/feedback", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, u.full_name, u.email
       FROM police_feedback f
       JOIN users u ON u.user_id = f.user_id
       ORDER BY f.submitted_at DESC LIMIT 200`
    );
    res.json({ feedback: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// POLICE — ADMIN audit log
// ------------------------------------------------------------
app.get("/api/police/admin/audit", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.firebase_uid = al.user_id
       WHERE al.entity_type = 'police_applications'
          OR al.action LIKE 'POLICE%'
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// POLICE — LETTERS & CERTIFIED DOCUMENTS
// ============================================================

// ------------------------------------------------------------
// Letters — templates + reference generators
// ------------------------------------------------------------
const POLICE_LETTER_TEMPLATES = {
  report_acknowledgement: {
    label: "Acknowledgement of Report",
    build: (ctx) => ({
      title: `Acknowledgement of Report ${ctx.reference}`,
      body:
`Kingdom of Lesotho
Lesotho Mounted Police Service

ACKNOWLEDGEMENT OF REPORT

Reference: ${ctx.reference}
Date: ${ctx.date}
Reported by: ${ctx.fullName}
National ID: ${ctx.nationalId}
Report title: ${ctx.title}
Report type: ${ctx.type}
District: ${ctx.district || "—"}

This letter confirms that the above-mentioned report has been received by the
Lesotho Mounted Police Service and given the reference number shown above.
Please quote this reference in all future correspondence.

Current status: ${ctx.status.replace(/_/g, " ")}

This letter is issued for official purposes only.

_____________________________
Issued by the Police Services Portal
Lesotho Mounted Police Service`
    })
  },
  affidavit: {
    label: "Affidavit (Statement of Facts)",
    build: (ctx) => ({
      title: `Affidavit — ${ctx.fullName}`,
      body:
`AFFIDAVIT

I, ${ctx.fullName}, holder of National ID ${ctx.nationalId || "—"}, of
${ctx.district || "—"} district, do hereby make oath and state as follows:

1. I am the deponent herein and the facts deposed to are within my personal knowledge.

2. ${ctx.statement || "I wish to place on record the following facts in support of my report."}

3. I make this affidavit in support of reference ${ctx.reference} submitted to
   the Lesotho Mounted Police Service on ${ctx.date}.

4. I declare that the contents of this affidavit are true and correct to the best
   of my knowledge and belief.

_____________________________
Signature of Deponent: ${ctx.fullName}
Date: ${ctx.date}

Sworn to and signed before me:

_____________________________
Commissioner of Oaths / Police Officer`
    })
  },
  loss_report: {
    label: "Loss Report Letter",
    build: (ctx) => ({
      title: `Loss Report Letter — ${ctx.reference}`,
      body:
`Lesotho Mounted Police Service
LOSS REPORT LETTER

Reference: ${ctx.reference}
Date: ${ctx.date}
Reporter: ${ctx.fullName}
National ID: ${ctx.nationalId || "—"}
Contact: ${ctx.contact || "—"}

Items lost or stolen: ${ctx.items || "see attached report"}
Approximate loss date: ${ctx.incidentDate || "—"}
Location: ${ctx.location || "—"}

This letter serves as confirmation that the above loss was reported to the
Lesotho Mounted Police Service on ${ctx.date} and is currently recorded under
reference ${ctx.reference}.

Status: ${ctx.status.replace(/_/g, " ")}

_____________________________
Issued by the Police Services Portal`
    })
  },
  confirmation_of_report: {
    label: "Confirmation of Report",
    build: (ctx) => ({
      title: `Confirmation of Report — ${ctx.reference}`,
      body:
`Lesotho Mounted Police Service
CONFIRMATION OF REPORT

This is to confirm that a report with the following details is on record:

Reference: ${ctx.reference}
Report type: ${ctx.type}
Title: ${ctx.title}
Submitted by: ${ctx.fullName}
National ID: ${ctx.nationalId || "—"}
Submitted on: ${ctx.date}
District: ${ctx.district || "—"}
Current status: ${ctx.status.replace(/_/g, " ")}

This confirmation is issued for presentation to third parties (banks,
insurers, employers, or legal representatives) and should be verified by
contacting the issuing station using the reference above.

_____________________________
Issued by the Police Services Portal`
    })
  },
  clearance_collection_notice: {
    label: "Clearance Collection Notice",
    build: (ctx) => ({
      title: `Clearance Collection Notice — ${ctx.reference}`,
      body:
`Lesotho Mounted Police Service
CLEARANCE COLLECTION NOTICE

Reference: ${ctx.reference}
Date: ${ctx.date}
Applicant: ${ctx.fullName}
National ID: ${ctx.nationalId || "—"}

Your police clearance application with the reference shown above has been
processed and is ready for collection.

Please bring the following when collecting:
  • This notice
  • Your National ID or passport
  • Any receipt or payment confirmation if applicable

Status: ${ctx.status.replace(/_/g, " ")}

_____________________________
Issued by the Police Services Portal`
    })
  },
  witness_statement: {
    label: "Witness Statement Letter",
    build: (ctx) => ({
      title: `Witness Statement — ${ctx.reference}`,
      body:
`Lesotho Mounted Police Service
WITNESS STATEMENT LETTER

Reference: ${ctx.reference}
Date: ${ctx.date}
Witness: ${ctx.fullName}
Related report: ${ctx.relatedReference || "—"}

Statement:
${ctx.statement || "See attached witness statement."}

I confirm that the above statement is a true and accurate account of what I
witnessed to the best of my recollection.

_____________________________
Signature of Witness
Date: ${ctx.date}`
    })
  },
  general_letter: {
    label: "General Police Letter",
    build: (ctx) => ({
      title: `Police Letter — ${ctx.reference}`,
      body:
`Lesotho Mounted Police Service

Date: ${ctx.date}
Reference: ${ctx.reference}
Issued to: ${ctx.fullName}
National ID: ${ctx.nationalId || "—"}

${ctx.statement || "This letter is issued for official purposes."}

_____________________________
Issued by the Police Services Portal`
    })
  }
};

async function generatePoliceLetterReference(conn) {
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM police_letters WHERE reference_number LIKE 'PLT-%'"
  );
  return `PLT-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function generateCertifiedDocReference(conn) {
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM police_certified_documents WHERE reference_number LIKE 'CDT-%'"
  );
  return `CDT-${year}-${String(n + 1).padStart(6, "0")}`;
}

// ------------------------------------------------------------
// LETTERS — list templates
// ------------------------------------------------------------
app.get("/api/police/letter-templates", async (req, res) => {
  const out = Object.entries(POLICE_LETTER_TEMPLATES).map(([key, t]) => ({
    key,
    label: t.label
  }));
  res.json({ templates: out });
});

// ------------------------------------------------------------
// LETTERS — issue a letter
// ------------------------------------------------------------
app.post("/api/police/letters", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { letter_type, application_id, fields } = req.body || {};

  if (!letter_type || !POLICE_LETTER_TEMPLATES[letter_type]) {
    return res.status(400).json({ error: "Invalid letter_type" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let appRow = null;
    if (application_id) {
      const [rows] = await conn.query(
        `SELECT a.*, c.category_name
         FROM police_applications a
         JOIN police_service_categories c ON c.category_id = a.category_id
         WHERE a.application_id = ? AND a.user_id = ?`,
        [application_id, req.dbUser.user_id]
      );
      appRow = rows[0] || null;
    }

    const reference =
      appRow?.reference_number ||
      (await generatePoliceLetterReference(conn));

    const ctx = {
      reference,
      date: new Date().toLocaleString("en-LS"),
      fullName: req.dbUser.full_name || "",
      nationalId:
        req.dbUser.national_id_number || req.dbUser.national_id || "",
      contact: req.dbUser.phone || "",
      title: appRow?.title || (fields?.title || ""),
      type: appRow?.application_type?.replace(/_/g, " ") || "",
      district: appRow?.district || fields?.district || "",
      location: appRow?.incident_location || fields?.location || "",
      incidentDate: appRow?.incident_date
        ? new Date(appRow.incident_date).toLocaleString("en-LS")
        : fields?.incident_date || "",
      status: appRow?.status || "submitted",
      items: fields?.items || "",
      statement: fields?.statement || "",
      relatedReference: fields?.related_reference || reference
    };

    const rendered = POLICE_LETTER_TEMPLATES[letter_type].build(ctx);
    const letterRef = await generatePoliceLetterReference(conn);

    const [result] = await conn.query(
      `INSERT INTO police_letters
        (reference_number, user_id, application_id, letter_type,
         title, body, status, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, 'issued', NOW())`,
      [
        letterRef,
        req.dbUser.user_id,
        application_id || null,
        letter_type,
        rendered.title,
        rendered.body
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      letterId: result.insertId,
      reference: letterRef,
      title: rendered.title,
      body: rendered.body
    });
  } catch (err) {
    await conn.rollback();
    console.error("Police letter error:", err);
    res.status(400).json({ error: err.message || "Failed to issue letter" });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// LETTERS — list mine
// ------------------------------------------------------------
app.get("/api/police/letters/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ letters: [] });
  try {
    const [rows] = await db.query(
      `SELECT letter_id, reference_number, letter_type, title, status,
              issued_at, application_id
       FROM police_letters
       WHERE user_id = ?
       ORDER BY issued_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ letters: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// LETTERS — get one
// ------------------------------------------------------------
app.get("/api/police/letters/:id", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, u.full_name, u.national_id
       FROM police_letters l
       JOIN users u ON u.user_id = l.user_id
       WHERE l.letter_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const letter = rows[0];

    if (letter.user_id !== req.dbUser?.user_id && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }
    res.json({ letter });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// CERTIFIED DOCS — submit
// ------------------------------------------------------------
app.post(
  "/api/police/certified-documents",
  verifyToken,
  certOriginalUpload,
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });
    if (!req.file) return res.status(400).json({ error: "Document is required" });

    const { document_title, purpose, notes } = req.body || {};
    if (!document_title) {
      return res.status(400).json({ error: "document_title is required" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const ref = await generateCertifiedDocReference(conn);

      const [result] = await conn.query(
        `INSERT INTO police_certified_documents
          (reference_number, user_id, document_title, purpose, notes,
           original_filename, original_storage_path, original_mime_type,
           original_size_bytes, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW())`,
        [
          ref,
          req.dbUser.user_id,
          document_title,
          purpose || null,
          notes || null,
          req.file.originalname,
          `/uploads/police_certified/${req.file.filename}`,
          req.file.mimetype,
          req.file.size
        ]
      );
      const docId = result.insertId;

      await conn.query(
        `INSERT INTO police_certified_document_notifications
          (user_id, certified_doc_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          req.dbUser.user_id,
          docId,
          "Certification request received",
          `Your document "${document_title}" (${ref}) has been received for certification.`
        ]
      );

      await conn.commit();

      await logAudit(
        req.dbUser.user_id,
        null,
        "POLICE_CERTIFIED_DOC_SUBMITTED",
        "police_certified_documents",
        docId,
        { reference: ref, document_title },
        req.ip
      );

      res.status(201).json({
        success: true,
        certifiedDocId: docId,
        reference: ref,
        status: "submitted"
      });
    } catch (err) {
      await conn.rollback();
      console.error("Certified doc submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);

// ------------------------------------------------------------
// CERTIFIED DOCS — list mine
// ------------------------------------------------------------
app.get("/api/police/certified-documents/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ documents: [] });
  try {
    const [rows] = await db.query(
      `SELECT certified_doc_id, reference_number, document_title, purpose,
              status, submitted_at, certified_at, certified_filename,
              original_filename, admin_notes, rejection_reason
       FROM police_certified_documents
       WHERE user_id = ?
       ORDER BY submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({
      documents: rows.map(r => ({
        ...r,
        certified_available: !!r.certified_filename,
        download_url: r.certified_filename
          ? `/api/police/certified-documents/${r.certified_doc_id}/download`
          : null
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// CERTIFIED DOCS — get one
// ------------------------------------------------------------
app.get("/api/police/certified-documents/:id", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, u.full_name, u.email, u.phone, u.national_id
       FROM police_certified_documents d
       JOIN users u ON u.user_id = d.user_id
       WHERE d.certified_doc_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const doc = rows[0];

    if (doc.user_id !== req.dbUser?.user_id && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [payments] = await db.query(
      `SELECT payment_id, fee_type, amount, currency, payment_method,
              payment_status, payment_date, transaction_reference
       FROM police_certified_document_payments
       WHERE certified_doc_id = ?`,
      [doc.certified_doc_id]
    );

    res.json({
      document: {
        ...doc,
        original_url: `/uploads/police_certified/${path.basename(doc.original_storage_path)}`,
        certified_url: doc.certified_storage_path
          ? `/uploads/police_certified/${path.basename(doc.certified_storage_path)}`
          : null
      },
      payments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// CERTIFIED DOCS — download certified file
// ------------------------------------------------------------
app.get(
  "/api/police/certified-documents/:id/download",
  verifyToken,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT * FROM police_certified_documents WHERE certified_doc_id = ?",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const doc = rows[0];

      if (doc.user_id !== req.dbUser?.user_id && !req.isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (!doc.certified_storage_path) {
        return res.status(400).json({ error: "Certified copy not yet available" });
      }

      const filePath = path.join(
        __dirname,
        doc.certified_storage_path.replace(/^\/+/, "")
      );
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }
      res.download(filePath, doc.certified_filename || "certified_document");
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed" });
    }
  }
);

// ------------------------------------------------------------
// CERTIFIED DOCS — notifications
// ------------------------------------------------------------
app.get("/api/police/certified-documents-notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM police_certified_document_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/police/certified-documents-notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE police_certified_document_notifications
       SET read_at = NOW()
       WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// CERTIFIED DOCS — ADMIN queue
// ------------------------------------------------------------
app.get(
  "/api/police/admin/certified-documents",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { status } = req.query;
      let sql = `
        SELECT d.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path
        FROM police_certified_documents d
        JOIN users u ON u.user_id = d.user_id
        WHERE 1 = 1
      `;
      const params = [];
      if (status) { sql += " AND d.status = ?"; params.push(status); }
      sql += " ORDER BY d.submitted_at ASC";

      const [rows] = await db.query(sql, params);
      res.json({
        documents: rows.map(r => ({
          ...r,
          photo_url: publicUrl(r.photo_path),
          original_url: `/uploads/police_certified/${path.basename(r.original_storage_path)}`,
          certified_url: r.certified_storage_path
            ? `/uploads/police_certified/${path.basename(r.certified_storage_path)}`
            : null
        }))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed" });
    }
  }
);

// ------------------------------------------------------------
// CERTIFIED DOCS — ADMIN update status
// ------------------------------------------------------------
app.post(
  "/api/police/admin/certified-documents/:id/status",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { newStatus, note } = req.body || {};
    const allowed = [
      "under_review","more_information_required","awaiting_payment",
      "certified","rejected","cancelled"
    ];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const [rows] = await db.query(
        "SELECT * FROM police_certified_documents WHERE certified_doc_id = ?",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const doc = rows[0];

      const isReject = newStatus === "rejected";

      await db.query(
        `UPDATE police_certified_documents
           SET status = ?,
               admin_notes = COALESCE(?, admin_notes),
               rejection_reason = CASE WHEN ? THEN ? ELSE rejection_reason END,
               certified_at = CASE WHEN ? = 'certified' THEN NOW() ELSE certified_at END
         WHERE certified_doc_id = ?`,
        [
          newStatus,
          note || null,
          isReject ? 1 : 0,
          isReject ? (note || "Not specified") : null,
          newStatus,
          doc.certified_doc_id
        ]
      );

      await db.query(
        `INSERT INTO police_certified_document_notifications
          (user_id, certified_doc_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          doc.user_id,
          doc.certified_doc_id,
          "Certification request updated",
          `Your certified document ${doc.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`
        ]
      );

      await logAudit(
        req.dbUser.user_id,
        null,
        "POLICE_CERTIFIED_DOC_STATUS_CHANGED",
        "police_certified_documents",
        doc.certified_doc_id,
        { from: doc.status, to: newStatus, note },
        req.ip
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed" });
    }
  }
);

// ------------------------------------------------------------
// CERTIFIED DOCS — build stamped PDF
// Overlays the police stamp image on the first page of the doc.
// For images, converts the image to a PDF first, then stamps it.
// ------------------------------------------------------------
async function buildStampedPdf({
  originalPath,
  originalMime,
  doc,
  officerName
}) {
  const originalBytes = fs.readFileSync(originalPath);
  let pdf;

  // --- Load or create the PDF that will receive the stamp
  if ((originalMime || "").includes("pdf")) {
    pdf = await PDFDocument.load(originalBytes);
  } else if (
    (originalMime || "").includes("image/jpeg") ||
    (originalMime || "").includes("image/jpg") ||
    (originalMime || "").includes("image/png")
  ) {
    pdf = await PDFDocument.create();
    const img = (originalMime || "").includes("png")
      ? await pdf.embedPng(originalBytes)
      : await pdf.embedJpg(originalBytes);

    // A4 portrait
    const A4W = 595, A4H = 842;
    const page = pdf.addPage([A4W, A4H]);
    const margin = 36;
    const maxW = A4W - margin * 2;
    const maxH = A4H - margin * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    page.drawImage(img, {
      x: (A4W - w) / 2,
      y: (A4H - h) / 2,
      width: w,
      height: h
    });
  } else {
    // Last resort — try loading as a PDF
    pdf = await PDFDocument.load(originalBytes);
  }

  // --- Grab the first page
  const pages = pdf.getPages();
  if (!pages.length) {
    // Shouldn't happen, but guard anyway
    pdf.addPage([595, 842]);
  }
  const firstPage = pdf.getPages()[0];
  const { width: pageW, height: pageH } = firstPage.getSize();

  // --- Overlay the stamp image
  if (fs.existsSync(POLICE_STAMP_PATH)) {
    const stampBytes = fs.readFileSync(POLICE_STAMP_PATH);
    const stampImage = await pdf.embedPng(stampBytes);

    // Target stamp size: ~35% of page width, kept proportional
    const stampTargetW = Math.min(pageW * 0.35, 240);
    const stampRatio = stampImage.height / stampImage.width;
    const stampW = stampTargetW;
    const stampH = stampTargetW * stampRatio;

    // Position: bottom-right corner with a small margin, so it looks
    // like a real rubber stamp was pressed on the paper.
    const padding = 40;
    const stampX = pageW - stampW - padding;
    const stampY = padding;

    firstPage.drawImage(stampImage, {
      x: stampX,
      y: stampY,
      width: stampW,
      height: stampH,
      opacity: 0.92
    });

    // Small caption below the stamp for traceability
    const captionFont = await pdf.embedFont("Times-Roman");
    const caption =
      `Certified · Ref ${doc.reference_number} · ${officerName || "Police Officer"} · ` +
      new Date().toLocaleDateString("en-LS");

    firstPage.drawText(caption, {
      x: padding,
      y: padding / 2,
      size: 8,
      font: captionFont,
      color: rgb(0.35, 0.35, 0.4)
    });
  } else {
    // Fallback: simple text if the stamp image is missing
    const font = await pdf.embedFont("Times-Roman");
    firstPage.drawText(
      `CERTIFIED — Ref ${doc.reference_number} — ${officerName || "Police Officer"}`,
      { x: 40, y: 40, size: 12, font, color: rgb(0.7, 0.05, 0.05) }
    );
  }

  return Buffer.from(await pdf.save());
}

// ------------------------------------------------------------
// CERTIFIED DOCS — ADMIN mark as certified (auto-stamp)
// ------------------------------------------------------------
app.post(
  "/api/police/admin/certified-documents/:id/certify",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const { note, certifying_officer } = req.body || {};

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        `SELECT d.*, u.full_name, u.national_id
         FROM police_certified_documents d
         JOIN users u ON u.user_id = d.user_id
         WHERE d.certified_doc_id = ?`,
        [req.params.id]
      );
      if (!rows.length) throw new Error("Not found");
      const doc = rows[0];

      const originalPath = path.join(__dirname, doc.original_storage_path);
      if (!fs.existsSync(originalPath)) {
        throw new Error("Original file missing on server");
      }

      const officer =
        certifying_officer || req.dbUser.full_name || "Police Officer";

      const stampedBytes = await buildStampedPdf({
        originalPath,
        originalMime: doc.original_mime_type,
        doc: { ...doc, full_name: doc.full_name, national_id: doc.national_id },
        officerName: officer
      });

      const certifiedFilename = `cert_${doc.reference_number}.pdf`;
      const certifiedRelative =
        `/uploads/police_certified/cert_${doc.reference_number}_${Date.now()}.pdf`;
      const certifiedAbsolute = path.join(__dirname, certifiedRelative);

      fs.writeFileSync(certifiedAbsolute, stampedBytes);

      await conn.query(
        `UPDATE police_certified_documents
           SET status = 'certified',
               certified_filename = ?,
               certified_storage_path = ?,
               certified_mime_type = 'application/pdf',
               certified_size_bytes = ?,
               certifying_officer = ?,
               certified_at = NOW(),
               admin_notes = COALESCE(?, admin_notes)
         WHERE certified_doc_id = ?`,
        [
          certifiedFilename,
          certifiedRelative,
          stampedBytes.length,
          officer,
          note || null,
          doc.certified_doc_id
        ]
      );

      await conn.query(
        `INSERT INTO police_certified_document_notifications
          (user_id, certified_doc_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          doc.user_id,
          doc.certified_doc_id,
          "Certified document ready",
          `Your document ${doc.reference_number} has been certified. You can download it from the portal.`
        ]
      );

      await conn.commit();

      await logAudit(
        req.dbUser.user_id,
        null,
        "POLICE_CERTIFIED_DOC_AUTO_STAMPED",
        "police_certified_documents",
        doc.certified_doc_id,
        { officer, reference: doc.reference_number },
        req.ip
      );

      res.json({
        success: true,
        certified_filename: certifiedFilename,
        download_url: `/api/police/certified-documents/${doc.certified_doc_id}/download`
      });
    } catch (err) {
      await conn.rollback();
      console.error("Certify error:", err);
      res.status(400).json({ error: err.message || "Certification failed" });
    } finally {
      conn.release();
    }
  }
);

// ------------------------------------------------------------
// CERTIFIED DOCS — ADMIN record payment
// ------------------------------------------------------------
app.post(
  "/api/police/admin/certified-documents/:id/payment",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    const {
      fee_type, amount, payment_method,
      transaction_reference, payment_status
    } = req.body || {};
    if (!amount) return res.status(400).json({ error: "amount required" });

    try {
      const [result] = await db.query(
        `INSERT INTO police_certified_document_payments
          (certified_doc_id, fee_type, amount, payment_method, transaction_reference,
           payment_status, payment_date, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          fee_type || "Certification fee",
          amount,
          payment_method || "cash",
          transaction_reference || null,
          payment_status || "paid",
          new Date(),
          payment_status === "paid" ? new Date() : null
        ]
      );

      if (payment_status === "paid") {
        await db.query(
          `UPDATE police_certified_documents
             SET status = CASE WHEN status = 'awaiting_payment'
                               THEN 'under_review' ELSE status END
           WHERE certified_doc_id = ?`,
          [req.params.id]
        );
      }

      res.status(201).json({ success: true, paymentId: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed" });
    }
  }
);

// ------------------------------------------------------------
// LETTERS — ADMIN list
// ------------------------------------------------------------
app.get("/api/police/admin/letters", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, u.full_name, u.email
       FROM police_letters l
       JOIN users u ON u.user_id = l.user_id
       ORDER BY l.issued_at DESC LIMIT 200`
    );
    res.json({ letters: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});


// ============================================================
// ============================================================
// FINANCE MODULE — Ministry of Finance
// ============================================================
// ============================================================

const FINANCE_DOCS_DIR = path.join(__dirname, "uploads", "finance_documents");
if (!fs.existsSync(FINANCE_DOCS_DIR)) {
  fs.mkdirSync(FINANCE_DOCS_DIR, { recursive: true });
}

const uploadFinanceDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, FINANCE_DOCS_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const financeSubmitUploads = uploadFinanceDocuments.array("documents", 10);

const FINANCE_STATUS_META = {
  DRAFT:           { label: "Draft",              color: "#475569" },
  SUBMITTED:       { label: "Submitted",          color: "#175cd3" },
  VALIDATING:      { label: "Validating",         color: "#175cd3" },
  UNDER_REVIEW:    { label: "Under review",       color: "#b45309" },
  ACTION_REQUIRED: { label: "Action required",    color: "#b45309" },
  APPROVED:        { label: "Approved",           color: "#067647" },
  REJECTED:        { label: "Rejected",           color: "#b3261e" },
  PROCESSING:      { label: "Processing",         color: "#0f766e" },
  COMPLETED:       { label: "Completed",          color: "#6651aa" },
  CANCELLED:       { label: "Cancelled",          color: "#475569" }
};

// ------------------------------------------------------------
// Finance — reference generators
// ------------------------------------------------------------
async function generateFinanceReference(conn, request_type) {
  const prefix =
    request_type === "TAX_REQUEST"           ? "TAX" :
    request_type === "TAX_CLEARANCE"         ? "CLR" :
    request_type === "TAX_DECLARATION"       ? "DCL" :
    request_type === "SUPPLIER_REGISTRATION" ? "SUP" :
    request_type === "INVOICE_CLAIM"         ? "INV" :
    request_type === "TAX_REFUND"            ? "REF" :
    request_type === "GENERAL_ENQUIRY"       ? "ENQ" : "FIN";
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    `SELECT COUNT(*) AS n FROM finance_service_requests
      WHERE reference_no LIKE ?`,
    [`${prefix}-%`]
  );
  return `${prefix}-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function generateFinanceTicketReference(conn) {
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM finance_tickets WHERE ticket_reference LIKE 'TKT-%'"
  );
  return `TKT-${year}-${String(n + 1).padStart(6, "0")}`;
}

// ------------------------------------------------------------
// FINANCE — public service catalogue
// ------------------------------------------------------------
app.get("/api/finance/services", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM finance_services WHERE is_active = 1 ORDER BY service_name"
    );
    res.json({ services: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load finance services" });
  }
});

// ------------------------------------------------------------
// FINANCE — submit request (generic handler for all types)
// Fields: serviceId, requestType, subject, description, amount?
// + fields JSON payload + up to 10 documents
// ------------------------------------------------------------
app.post(
  "/api/finance/requests",
  verifyToken,
  financeSubmitUploads,
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });

    const {
      serviceId, requestType, subject, description,
      amount, fields: fieldsJson
    } = req.body || {};

    if (!requestType) return res.status(400).json({ error: "requestType is required" });
    if (!subject || !description) {
      return res.status(400).json({ error: "subject and description are required" });
    }
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
        "SELECT * FROM finance_services WHERE service_id = ? AND is_active = 1",
        [serviceId]
      );
      if (!svcRows.length) throw new Error("Finance service not available");
      const service = svcRows[0];

      const ref = await generateFinanceReference(conn, requestType);

      const [result] = await conn.query(
        `INSERT INTO finance_service_requests
           (reference_no, user_id, service_id, request_type,
            subject, description, amount, currency, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'LSL', 'SUBMITTED', NOW())`,
        [
          ref,
          req.dbUser.user_id,
          service.service_id,
          requestType,
          subject,
          description,
          amount ? Number(amount) : null
        ]
      );
      const reqId = result.insertId;

      // Free-form fields
      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            await conn.query(
              `INSERT INTO finance_request_values
                 (request_id, field_key, field_value) VALUES (?, ?, ?)`,
              [reqId, key, String(v)]
            );
          }
        } else {
          await conn.query(
            `INSERT INTO finance_request_values
               (request_id, field_key, field_value) VALUES (?, ?, ?)`,
            [reqId, key, String(value)]
          );
        }
      }

      // Documents
      const files = req.files || [];
      for (const file of files) {
        await conn.query(
          `INSERT INTO finance_request_documents
             (request_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            reqId,
            file.fieldname || "supporting_document",
            file.originalname,
            `/uploads/finance_documents/${file.filename}`,
            file.mimetype,
            file.size,
            req.dbUser.user_id
          ]
        );
      }

      // Type-specific side tables
      if (requestType === "SUPPLIER_REGISTRATION") {
        const [supResult] = await conn.query(
          `INSERT INTO finance_suppliers
             (user_id, legal_business_name, trading_name, company_registration_no,
              tax_identification_no, contact_person, business_email, business_phone,
              address, bank_name, bank_account_name, bank_account_last4,
              registration_status, validation_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 'PENDING')`,
          [
            req.dbUser.user_id,
            fields.legal_business_name || subject,
            fields.trading_name || null,
            fields.company_registration_no || null,
            fields.tax_identification_no || null,
            fields.contact_person || null,
            fields.business_email || req.dbUser.email || null,
            fields.business_phone || req.dbUser.phone || null,
            fields.address || null,
            fields.bank_name || null,
            fields.bank_account_name || null,
            (fields.bank_account_number || "").slice(-4) || null
          ]
        );
        // link into the request values (we keep it simple; supplier_id referenced via supplier request later)
        await conn.query(
          `INSERT INTO finance_request_values
             (request_id, field_key, field_value) VALUES (?, 'supplier_id', ?)`,
          [reqId, String(supResult.insertId)]
        );
      } else if (requestType === "TAX_REFUND") {
        await conn.query(
          `INSERT INTO finance_tax_refunds
             (request_id, tax_id, tax_period, amount_claimed,
              amount_approved, workflow_status, validation_status)
           VALUES (?, ?, ?, ?, NULL, 'SUBMITTED', 'PENDING')`,
          [
            reqId,
            fields.tax_id || fields.tax_identification_no || "",
            fields.tax_period || "",
            amount ? Number(amount) : (fields.amount_claimed ? Number(fields.amount_claimed) : 0)
          ]
        );
      } else if (requestType === "TAX_REQUEST" ||
                 requestType === "TAX_CLEARANCE" ||
                 requestType === "TAX_DECLARATION") {
        const taxType =
          requestType === "TAX_CLEARANCE"   ? "TAX_CLEARANCE" :
          requestType === "TAX_DECLARATION" ? "TAX_DECLARATION" : "GENERAL_TAX";

        await conn.query(
          `INSERT INTO finance_tax_requests
             (request_id, taxpayer_type, tax_id, tax_request_type,
              tax_period, validation_status)
           VALUES (?, ?, ?, ?, ?, 'PENDING')`,
          [
            reqId,
            fields.taxpayer_type || "INDIVIDUAL",
            fields.tax_id || fields.tax_identification_no || null,
            taxType,
            fields.tax_period || null
          ]
        );
      } else if (requestType === "INVOICE_CLAIM") {
        // need a supplier record
        let [supRows] = await conn.query(
          "SELECT supplier_id FROM finance_suppliers WHERE user_id = ? LIMIT 1",
          [req.dbUser.user_id]
        );
        let supplierId = supRows[0]?.supplier_id;

        if (!supplierId) {
          // Auto-create a lightweight supplier record
          const [sResult] = await conn.query(
            `INSERT INTO finance_suppliers
               (user_id, legal_business_name, trading_name,
                registration_status, validation_status)
             VALUES (?, ?, ?, 'UNDER_REVIEW', 'PENDING')`,
            [
              req.dbUser.user_id,
              fields.legal_business_name || req.dbUser.full_name,
              fields.trading_name || null
            ]
          );
          supplierId = sResult.insertId;
        }

        await conn.query(
          `INSERT INTO finance_invoice_claims
             (request_id, supplier_id, invoice_number, purchase_order_no,
              contract_reference, delivery_note_reference, issuing_ministry,
              invoice_date, due_date, amount, currency,
              validation_status, workflow_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LSL', 'PENDING', 'SUBMITTED')`,
          [
            reqId,
            supplierId,
            fields.invoice_number || "",
            fields.purchase_order_no || null,
            fields.contract_reference || null,
            fields.delivery_note_reference || null,
            fields.issuing_ministry || null,
            fields.invoice_date || null,
            fields.due_date || null,
            amount ? Number(amount) : (fields.amount ? Number(fields.amount) : 0)
          ]
        );
      }

      // Status history
      await conn.query(
        `INSERT INTO finance_status_history
           (request_id, old_status, new_status, changed_by, note)
         VALUES (?, NULL, 'SUBMITTED', ?, 'Submitted by user')`,
        [reqId, req.dbUser.user_id]
      );

      // Notify user
      await conn.query(
        `INSERT INTO finance_notifications
           (user_id, request_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [
          req.dbUser.user_id,
          reqId,
          "Finance request received",
          `Your request ${ref} (${service.service_name}) has been submitted.`
        ]
      );

      await conn.commit();

      await logAudit(
        req.dbUser.user_id,
        null,
        "FINANCE_REQUEST_SUBMITTED",
        "finance_service_requests",
        reqId,
        { reference: ref, requestType },
        req.ip
      );

      res.status(201).json({
        success: true,
        requestId: reqId,
        referenceNumber: ref,
        status: "SUBMITTED"
      });
    } catch (err) {
      await conn.rollback();
      console.error("Finance submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);

// ------------------------------------------------------------
// FINANCE — my requests
// ------------------------------------------------------------
app.get("/api/finance/requests/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ requests: [] });
  try {
    const [rows] = await db.query(
      `SELECT r.request_id, r.reference_no, r.request_type, r.subject,
              r.amount, r.currency, r.status, r.submitted_at,
              r.decision_notes, r.admin_notes,
              s.service_name
       FROM finance_service_requests r
       JOIN finance_services s ON s.service_id = r.service_id
       WHERE r.user_id = ?
       ORDER BY r.submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ requests: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load" });
  }
});

// ------------------------------------------------------------
// FINANCE — request detail
// ------------------------------------------------------------
app.get("/api/finance/requests/:id", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path,
              s.service_name
       FROM finance_service_requests r
       JOIN users u ON u.user_id = r.user_id
       JOIN finance_services s ON s.service_id = r.service_id
       WHERE r.request_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const request = rows[0];

    const isOwner = request.user_id === req.dbUser?.user_id;
    if (!isOwner && !req.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [values] = await db.query(
      "SELECT field_key, field_value FROM finance_request_values WHERE request_id = ?",
      [request.request_id]
    );
    const [documents] = await db.query(
      `SELECT document_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes, validation_status, validation_notes, uploaded_at
       FROM finance_request_documents WHERE request_id = ?`,
      [request.request_id]
    );
    const [history] = await db.query(
      `SELECT old_status, new_status, note, changed_at
       FROM finance_status_history WHERE request_id = ?
       ORDER BY changed_at ASC`,
      [request.request_id]
    );
    const [payments] = await db.query(
      `SELECT payment_id, transaction_reference, payment_purpose, amount, currency,
              payment_method, status, receipt_number, paid_at
       FROM finance_payments WHERE request_id = ?`,
      [request.request_id]
    );

    res.json({
      request: { ...request, photo_url: publicUrl(request.photo_path) },
      values,
      documents,
      history,
      payments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — delete my request (only early statuses)
// ------------------------------------------------------------
app.delete("/api/finance/requests/:id", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM finance_service_requests WHERE request_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Request not found");
    const request = rows[0];

    if (request.user_id !== req.dbUser.user_id) throw new Error("Not authorized");

    const deletable = ["DRAFT", "SUBMITTED", "ACTION_REQUIRED"];
    if (!deletable.includes(request.status)) {
      throw new Error(
        `This request can no longer be deleted (status: ${request.status}).`
      );
    }

    await conn.query(
      "DELETE FROM finance_service_requests WHERE request_id = ?",
      [request.request_id]
    );
    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      null,
      "FINANCE_REQUEST_DELETED",
      "finance_service_requests",
      request.request_id,
      { reference: request.reference_no, previous_status: request.status },
      req.ip
    );

    res.json({ success: true, deleted: request.reference_no });
  } catch (err) {
    await conn.rollback();
    console.error("Finance delete error:", err);
    const code =
      err.message === "Not authorized" ? 403 :
      err.message === "Request not found" ? 404 : 400;
    res.status(code).json({ error: err.message || "Delete failed" });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// FINANCE — my payments (government payments, fees)
// ------------------------------------------------------------
app.get("/api/finance/payments/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ payments: [] });
  try {
    const [rows] = await db.query(
      `SELECT payment_id, transaction_reference, payment_purpose, amount, currency,
              payment_method, status, receipt_number, paid_at, request_id
       FROM finance_payments WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ payments: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — submit an enquiry / complaint
// ------------------------------------------------------------
app.post("/api/finance/tickets", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { request_id, category, subject, message } = req.body || {};
  if (!category || !subject || !message) {
    return res.status(400).json({ error: "category, subject and message are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const ref = await generateFinanceTicketReference(conn);

    const [result] = await conn.query(
      `INSERT INTO finance_tickets
         (ticket_reference, user_id, request_id, category, subject, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ref, req.dbUser.user_id, request_id || null, category, subject, message]
    );

    await conn.commit();
    res.status(201).json({ success: true, ticketId: result.insertId, reference: ref });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || "Failed" });
  } finally {
    conn.release();
  }
});

app.get("/api/finance/tickets/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ tickets: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM finance_tickets WHERE user_id = ?
       ORDER BY opened_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ tickets: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — my notifications
// ------------------------------------------------------------
app.get("/api/finance/notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM finance_notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE finance_notifications
         SET read_at = NOW(), delivery_status = 'READ'
       WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — my suppliers
// ------------------------------------------------------------
app.get("/api/finance/suppliers/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ suppliers: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM finance_suppliers WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ suppliers: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// FINANCE — ADMIN endpoints
// ============================================================

// ------------------------------------------------------------
// FINANCE — ADMIN stats
// ------------------------------------------------------------
app.get("/api/finance/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM finance_service_requests GROUP BY status"
    );
    const [byType] = await db.query(
      "SELECT request_type, COUNT(*) AS count FROM finance_service_requests GROUP BY request_type"
    );
    const [total] = await db.query(
      "SELECT COUNT(*) AS total FROM finance_service_requests"
    );
    const [pending] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_service_requests
        WHERE status IN ('SUBMITTED','VALIDATING','UNDER_REVIEW','ACTION_REQUIRED','PROCESSING')`
    );
    const [completed] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_service_requests
        WHERE status IN ('APPROVED','COMPLETED')`
    );
    const [rejected] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_service_requests WHERE status = 'REJECTED'`
    );
    const [suppliers] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_suppliers WHERE registration_status IN ('SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED')`
    );
    const [openTickets] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_tickets WHERE status IN ('OPEN','UNDER_REVIEW','WAITING_FOR_USER')`
    );
    const [pendingInvoices] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_invoice_claims
        WHERE workflow_status IN ('SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED','FORWARDED_FOR_APPROVAL')`
    );
    const [pendingRefunds] = await db.query(
      `SELECT COUNT(*) AS total FROM finance_tax_refunds
        WHERE workflow_status IN ('SUBMITTED','VALIDATING','UNDER_REVIEW','ACTION_REQUIRED','FORWARDED_TO_RSL','PAYMENT_PROCESSING')`
    );

    res.json({
      byStatus, byType,
      totalRequests: total[0].total,
      pendingRequests: pending[0].total,
      completedRequests: completed[0].total,
      rejectedRequests: rejected[0].total,
      pendingSuppliers: suppliers[0].total,
      openTickets: openTickets[0].total,
      pendingInvoices: pendingInvoices[0].total,
      pendingRefunds: pendingRefunds[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN queue of requests
// ------------------------------------------------------------
app.get("/api/finance/admin/requests", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, request_type } = req.query;
    let sql = `
      SELECT r.request_id, r.reference_no, r.request_type, r.subject,
             r.amount, r.currency, r.status, r.submitted_at, r.updated_at,
             r.admin_notes,
             s.service_name,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM finance_service_requests r
      JOIN users u ON u.user_id = r.user_id
      JOIN finance_services s ON s.service_id = r.service_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND r.status = ?"; params.push(status); }
    if (request_type) { sql += " AND r.request_type = ?"; params.push(request_type); }
    sql += " ORDER BY r.submitted_at ASC";

    const [rows] = await db.query(sql, params);
    res.json({
      requests: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN update status
// ------------------------------------------------------------
app.post("/api/finance/admin/requests/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "VALIDATING","UNDER_REVIEW","ACTION_REQUIRED",
    "APPROVED","REJECTED","PROCESSING","COMPLETED","CANCELLED"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM finance_service_requests WHERE request_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Request not found");
    const request = rows[0];

    await conn.query(
      `UPDATE finance_service_requests
         SET status = ?,
             admin_notes = COALESCE(?, admin_notes),
             decision_notes = CASE WHEN ? IN ('APPROVED','REJECTED','COMPLETED')
                                   THEN ? ELSE decision_notes END,
             completed_at = CASE WHEN ? IN ('COMPLETED','REJECTED')
                                 THEN NOW() ELSE completed_at END,
             assigned_admin_id = COALESCE(assigned_admin_id, ?)
       WHERE request_id = ?`,
      [
        newStatus,
        note || null,
        newStatus,
        note || null,
        newStatus,
        req.dbUser.user_id,
        request.request_id
      ]
    );

    await conn.query(
      `INSERT INTO finance_status_history
         (request_id, old_status, new_status, changed_by, note)
       VALUES (?, ?, ?, ?, ?)`,
      [request.request_id, request.status, newStatus, req.dbUser.user_id, note || null]
    );

    await conn.query(
      `INSERT INTO finance_notifications
         (user_id, request_id, title, message)
       VALUES (?, ?, ?, ?)`,
      [
        request.user_id,
        request.request_id,
        "Finance request updated",
        `Your request ${request.reference_no} is now: ${newStatus.replace(/_/g, " ")}.`
      ]
    );

    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      null,
      "FINANCE_STATUS_CHANGED",
      "finance_service_requests",
      request.request_id,
      { from: request.status, to: newStatus, note },
      req.ip
    );

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN supplier queue
// ------------------------------------------------------------
app.get("/api/finance/admin/suppliers", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT s.*, u.full_name, u.email, u.phone, u.national_id
      FROM finance_suppliers s
      JOIN users u ON u.user_id = s.user_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND s.registration_status = ?"; params.push(status); }
    sql += " ORDER BY s.created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json({ suppliers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/admin/suppliers/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { registration_status, validation_status, note } = req.body || {};
  const allowedReg = ["UNDER_REVIEW","ACTION_REQUIRED","ACCEPTED","REJECTED"];
  const allowedVal = ["PENDING","VERIFIED","FAILED","ACTION_REQUIRED","NOT_CHECKED"];
  if (registration_status && !allowedReg.includes(registration_status)) {
    return res.status(400).json({ error: "Invalid registration_status" });
  }
  if (validation_status && !allowedVal.includes(validation_status)) {
    return res.status(400).json({ error: "Invalid validation_status" });
  }
  try {
    await db.query(
      `UPDATE finance_suppliers
         SET registration_status = COALESCE(?, registration_status),
             validation_status = COALESCE(?, validation_status),
             reviewed_by = ?,
             reviewed_at = NOW()
       WHERE supplier_id = ?`,
      [registration_status || null, validation_status || null,
       req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN invoice claims
// ------------------------------------------------------------
app.get("/api/finance/admin/invoices", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, r.reference_no, r.user_id, r.status AS request_status,
              u.full_name, u.email, u.phone
       FROM finance_invoice_claims c
       JOIN finance_service_requests r ON r.request_id = c.request_id
       JOIN users u ON u.user_id = r.user_id
       ORDER BY c.created_at DESC`
    );
    res.json({ invoices: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/admin/invoices/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { workflow_status, validation_status, validation_notes, external_ifmis_reference } = req.body || {};
  const allowedWf = [
    "VALIDATION_FAILED","UNDER_REVIEW","ACTION_REQUIRED",
    "FORWARDED_FOR_APPROVAL","APPROVED_BY_AUTHORITY","REJECTED","PAID"
  ];
  const allowedVal = ["PENDING","PASSED","FAILED","MISMATCH","MANUAL_REVIEW"];
  if (workflow_status && !allowedWf.includes(workflow_status)) {
    return res.status(400).json({ error: "Invalid workflow_status" });
  }
  if (validation_status && !allowedVal.includes(validation_status)) {
    return res.status(400).json({ error: "Invalid validation_status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM finance_invoice_claims WHERE claim_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Invoice not found");
    const claim = rows[0];

    await conn.query(
      `UPDATE finance_invoice_claims
         SET workflow_status = COALESCE(?, workflow_status),
             validation_status = COALESCE(?, validation_status),
             validation_notes = COALESCE(?, validation_notes),
             external_ifmis_reference = COALESCE(?, external_ifmis_reference)
       WHERE claim_id = ?`,
      [workflow_status || null, validation_status || null,
       validation_notes || null, external_ifmis_reference || null,
       claim.claim_id]
    );

    // Mirror the workflow status into the parent request
    const mirroredStatus =
      workflow_status === "PAID"                      ? "COMPLETED" :
      workflow_status === "REJECTED"                  ? "REJECTED" :
      workflow_status === "APPROVED_BY_AUTHORITY"     ? "APPROVED" :
      workflow_status === "ACTION_REQUIRED"           ? "ACTION_REQUIRED" :
      workflow_status === "UNDER_REVIEW"              ? "UNDER_REVIEW" :
      workflow_status === "FORWARDED_FOR_APPROVAL"    ? "PROCESSING" : null;

    if (mirroredStatus) {
      await conn.query(
        `UPDATE finance_service_requests SET status = ? WHERE request_id = ?`,
        [mirroredStatus, claim.request_id]
      );
    }

    await conn.query(
      `INSERT INTO finance_status_history
         (request_id, old_status, new_status, changed_by, note)
       VALUES (?, NULL, ?, ?, ?)`,
      [
        claim.request_id,
        workflow_status || "UPDATE",
        req.dbUser.user_id,
        validation_notes || "Invoice status updated"
      ]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN tax refunds
// ------------------------------------------------------------
app.get("/api/finance/admin/refunds", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, r.reference_no, r.user_id,
              u.full_name, u.email, u.phone
       FROM finance_tax_refunds f
       JOIN finance_service_requests r ON r.request_id = f.request_id
       JOIN users u ON u.user_id = r.user_id
       ORDER BY f.created_at DESC`
    );
    res.json({ refunds: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/admin/refunds/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const {
    workflow_status, validation_status, amount_approved,
    approval_reference, external_rsl_reference
  } = req.body || {};
  const allowedWf = [
    "VALIDATING","UNDER_REVIEW","ACTION_REQUIRED","FORWARDED_TO_RSL",
    "APPROVED_BY_AUTHORITY","REJECTED","PAYMENT_PROCESSING","PAID"
  ];
  const allowedVal = ["PENDING","PASSED","FAILED","MANUAL_REVIEW"];
  if (workflow_status && !allowedWf.includes(workflow_status)) {
    return res.status(400).json({ error: "Invalid workflow_status" });
  }
  if (validation_status && !allowedVal.includes(validation_status)) {
    return res.status(400).json({ error: "Invalid validation_status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM finance_tax_refunds WHERE refund_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Refund not found");
    const refund = rows[0];

    await conn.query(
      `UPDATE finance_tax_refunds
         SET workflow_status = COALESCE(?, workflow_status),
             validation_status = COALESCE(?, validation_status),
             amount_approved = COALESCE(?, amount_approved),
             approval_reference = COALESCE(?, approval_reference),
             external_rsl_reference = COALESCE(?, external_rsl_reference)
       WHERE refund_id = ?`,
      [
        workflow_status || null,
        validation_status || null,
        amount_approved !== undefined && amount_approved !== null
          ? Number(amount_approved)
          : null,
        approval_reference || null,
        external_rsl_reference || null,
        refund.refund_id
      ]
    );

    const mirroredStatus =
      workflow_status === "PAID"                  ? "COMPLETED" :
      workflow_status === "REJECTED"              ? "REJECTED" :
      workflow_status === "APPROVED_BY_AUTHORITY" ? "APPROVED" :
      workflow_status === "ACTION_REQUIRED"       ? "ACTION_REQUIRED" :
      workflow_status === "UNDER_REVIEW"          ? "UNDER_REVIEW" :
      workflow_status === "FORWARDED_TO_RSL"      ? "PROCESSING" :
      workflow_status === "PAYMENT_PROCESSING"    ? "PROCESSING" : null;

    if (mirroredStatus) {
      await conn.query(
        `UPDATE finance_service_requests SET status = ? WHERE request_id = ?`,
        [mirroredStatus, refund.request_id]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN payments list + record
// ------------------------------------------------------------
app.get("/api/finance/admin/payments", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.full_name, u.email
       FROM finance_payments p
       JOIN users u ON u.user_id = p.user_id
       ORDER BY p.created_at DESC LIMIT 500`
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/admin/payments", verifyToken, requireAdmin, async (req, res) => {
  const {
    user_id, request_id, payment_purpose, amount,
    payment_method, transaction_reference, status,
    external_system, external_reference
  } = req.body || {};
  if (!user_id || !amount) return res.status(400).json({ error: "user_id and amount required" });

  try {
    const trx =
      transaction_reference ||
      `FIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await db.query(
      `INSERT INTO finance_payments
         (user_id, request_id, transaction_reference, payment_purpose,
          amount, currency, payment_method, status,
          paid_at, external_system, external_reference)
       VALUES (?, ?, ?, ?, ?, 'LSL', ?, ?, ?, ?, ?)`,
      [
        user_id,
        request_id || null,
        trx,
        payment_purpose || "GOVERNMENT_PAYMENT",
        Number(amount),
        payment_method || "bank_transfer",
        status || "SUCCESS",
        status === "SUCCESS" ? new Date() : null,
        external_system || null,
        external_reference || null
      ]
    );

    res.status(201).json({ success: true, paymentId: result.insertId, transaction_reference: trx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN tickets (enquiries/complaints)
// ------------------------------------------------------------
app.get("/api/finance/admin/tickets", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.full_name, u.email
       FROM finance_tickets t
       JOIN users u ON u.user_id = t.user_id
       ORDER BY t.opened_at DESC`
    );
    res.json({ tickets: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/finance/admin/tickets/:id/respond", verifyToken, requireAdmin, async (req, res) => {
  const { response_text, status } = req.body || {};
  if (!response_text) return res.status(400).json({ error: "response_text required" });
  const allowed = ["OPEN","UNDER_REVIEW","WAITING_FOR_USER","RESOLVED","CLOSED"];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    await db.query(
      `UPDATE finance_tickets
         SET response_text = ?,
             status = COALESCE(?, status),
             handled_by = ?,
             resolved_at = CASE WHEN ? IN ('RESOLVED','CLOSED') THEN NOW() ELSE resolved_at END
       WHERE ticket_id = ?`,
      [response_text, status || null, req.dbUser.user_id,
       status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// FINANCE — ADMIN audit log
// ------------------------------------------------------------
app.get("/api/finance/admin/audit", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.firebase_uid = al.user_id
       WHERE al.entity_type = 'finance_service_requests'
          OR al.action LIKE 'FINANCE%'
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// ============================================================
// PENSIONS MODULE — Ministry of Pensions
// ============================================================
// ============================================================

const PENSION_DOCS_DIR = path.join(__dirname, "uploads", "pension_documents");
if (!fs.existsSync(PENSION_DOCS_DIR)) {
  fs.mkdirSync(PENSION_DOCS_DIR, { recursive: true });
}

const uploadPensionDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PENSION_DOCS_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const pensionSubmitUploads = uploadPensionDocuments.array("documents", 10);

const PENSION_STATUS_META = {
  DRAFT:                       { label: "Draft",                    color: "#475569" },
  SUBMITTED:                   { label: "Submitted",                color: "#175cd3" },
  UNDER_REVIEW:                { label: "Under review",             color: "#b45309" },
  MORE_INFORMATION_REQUIRED:   { label: "More info required",       color: "#b45309" },
  VERIFICATION_PENDING:        { label: "Verification pending",     color: "#b45309" },
  APPROVED:                    { label: "Approved",                 color: "#067647" },
  REJECTED:                    { label: "Rejected",                 color: "#b3261e" },
  PAYMENT_PENDING:             { label: "Payment pending",          color: "#0f766e" },
  PAID:                        { label: "Paid",                     color: "#6651aa" },
  CLOSED:                      { label: "Closed",                   color: "#475569" },
  CANCELLED:                   { label: "Cancelled",                color: "#475569" }
};

// ------------------------------------------------------------
// PENSIONS — reference generators
// ------------------------------------------------------------
async function generatePensionReference(conn, application_type) {
  const prefix =
    application_type === "REGISTRATION"           ? "PEN-REG" :
    application_type === "RETIREMENT_BENEFIT"     ? "PEN-RET" :
    application_type === "RESIGNATION_BENEFIT"    ? "PEN-RES" :
    application_type === "TERMINATION_BENEFIT"    ? "PEN-TRM" :
    application_type === "RETRENCHMENT_BENEFIT"   ? "PEN-RTN" :
    application_type === "DISABILITY_BENEFIT"     ? "PEN-DIS" :
    application_type === "DEATH_BENEFIT"          ? "PEN-DTH" :
    application_type === "OLD_AGE_PENSION"        ? "PEN-OAP" :
    application_type === "RECORD_CORRECTION"      ? "PEN-COR" :
    "PEN-APP";
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM pension_applications WHERE reference_number LIKE ?",
    [`${prefix}-%`]
  );
  return `${prefix}-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function generatePensionEnquiryReference(conn) {
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM pension_enquiries WHERE reference_number LIKE 'PEQ-%'"
  );
  return `PEQ-${year}-${String(n + 1).padStart(6, "0")}`;
}

// ------------------------------------------------------------
// PENSIONS — public programmes list
// ------------------------------------------------------------
app.get("/api/pensions/programmes", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM pension_programmes WHERE is_active = 1 ORDER BY programme_name"
    );
    res.json({ programmes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load pension programmes" });
  }
});

// ------------------------------------------------------------
// PENSIONS — my profile (member + programme + contributions summary)
// ------------------------------------------------------------
app.get("/api/pensions/me", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(404).json({ error: "Register first" });
  try {
    const [members] = await db.query(
      `SELECT m.*, p.programme_code, p.programme_name, p.description AS programme_description,
              p.eligibility_notes
       FROM pension_members m
       JOIN pension_programmes p ON p.programme_id = m.programme_id
       WHERE m.user_id = ?`,
      [req.dbUser.user_id]
    );

    if (!members.length) {
      return res.json({ member: null, programme: null, contributions_summary: null });
    }

    const member = members[0];

    const [[summary]] = await db.query(
      `SELECT COUNT(*) AS months_recorded,
              COALESCE(SUM(member_contribution), 0) AS total_member,
              COALESCE(SUM(employer_contribution), 0) AS total_employer,
              COALESCE(SUM(member_contribution) + SUM(employer_contribution), 0) AS total_combined
       FROM pension_contributions
       WHERE member_id = ?`,
      [member.member_id]
    );

    res.json({
      member,
      programme: {
        programme_code: member.programme_code,
        programme_name: member.programme_name,
        programme_description: member.programme_description,
        eligibility_notes: member.eligibility_notes
      },
      contributions_summary: summary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — my contributions
// ------------------------------------------------------------
app.get("/api/pensions/contributions/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ contributions: [] });
  try {
    const [members] = await db.query(
      "SELECT member_id FROM pension_members WHERE user_id = ?",
      [req.dbUser.user_id]
    );
    if (!members.length) return res.json({ contributions: [] });

    const [rows] = await db.query(
      `SELECT contribution_id, contribution_period, member_contribution,
              employer_contribution, currency, source_system,
              reconciliation_status, imported_at
       FROM pension_contributions
       WHERE member_id = ?
       ORDER BY contribution_period DESC`,
      [members[0].member_id]
    );
    res.json({ contributions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — my payments
// ------------------------------------------------------------
app.get("/api/pensions/payments/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ payments: [] });
  try {
    const [rows] = await db.query(
      `SELECT p.payment_id, p.payment_reference, p.payment_period, p.amount,
              p.currency, p.payment_method, p.status, p.paid_at,
              p.failure_reason, p.created_at
       FROM pension_payments p
       LEFT JOIN pension_members m ON m.member_id = p.member_id
       LEFT JOIN pension_beneficiaries b ON b.beneficiary_id = p.beneficiary_id
       WHERE m.user_id = ? OR b.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.dbUser.user_id, req.dbUser.user_id]
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — my benefit estimates (based on recorded contributions)
// ------------------------------------------------------------
app.get("/api/pensions/estimate/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  try {
    const [members] = await db.query(
      `SELECT m.*, p.programme_code, p.programme_name
       FROM pension_members m
       JOIN pension_programmes p ON p.programme_id = m.programme_id
       WHERE m.user_id = ?`,
      [req.dbUser.user_id]
    );
    if (!members.length) {
      return res.json({ estimate: null, reason: "You are not registered as a member yet." });
    }
    const member = members[0];

    const [[totals]] = await db.query(
      `SELECT COUNT(*) AS months_recorded,
              COALESCE(SUM(member_contribution), 0) AS total_member,
              COALESCE(SUM(employer_contribution), 0) AS total_employer
       FROM pension_contributions
       WHERE member_id = ? AND reconciliation_status IN ('MATCHED','CONFIRMED')`,
      [member.member_id]
    );

    const combined = Number(totals.total_member) + Number(totals.total_employer);
    const monthlyEquivalent = totals.months_recorded > 0
      ? combined / totals.months_recorded : 0;

    // Simple illustrative estimate — not an authoritative amount
    const illustrativeAnnual = monthlyEquivalent * 12 * 0.40;

    res.json({
      estimate: {
        months_recorded: totals.months_recorded,
        total_member: Number(totals.total_member),
        total_employer: Number(totals.total_employer),
        total_combined: combined,
        illustrative_monthly_benefit: Number(monthlyEquivalent.toFixed(2)),
        illustrative_annual_benefit: Number(illustrativeAnnual.toFixed(2)),
        note:
          "Illustrative only — the authoritative amount is determined by the Fund " +
          "based on applicable rules and verified records."
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — register as a member
// ------------------------------------------------------------
// ------------------------------------------------------------
// PENSIONS — register as a member
// ------------------------------------------------------------
app.post("/api/pensions/register", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const {
    programme_code,
    date_of_birth,
    employment_number,
    employer_name,
    employment_start_date,
    employment_end_date
  } = req.body || {};

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Resolve programme: by code, or first active programme
    let programme = null;
    if (programme_code) {
      const [progs] = await conn.query(
        "SELECT * FROM pension_programmes WHERE programme_code = ? AND is_active = 1",
        [programme_code]
      );
      programme = progs[0] || null;
    }
    if (!programme) {
      const [progs] = await conn.query(
        "SELECT * FROM pension_programmes WHERE is_active = 1 ORDER BY programme_id LIMIT 1"
      );
      programme = progs[0] || null;
    }
    if (!programme) throw new Error("No pension programme is configured");

    const [existing] = await conn.query(
      "SELECT member_id FROM pension_members WHERE user_id = ?",
      [req.dbUser.user_id]
    );
    if (existing.length) {
      throw new Error("You are already registered as a pension member");
    }

    const memberNumber = `MBR-${Date.now()}`;

    const [mRes] = await conn.query(
      `INSERT INTO pension_members
         (user_id, programme_id, member_number, date_of_birth,
          employment_number, employer_name, employment_start_date, employment_end_date,
          membership_status, identity_verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_VERIFICATION', 'PENDING')`,
      [
        req.dbUser.user_id,
        programme.programme_id,
        memberNumber,
        date_of_birth || null,
        employment_number || null,
        employer_name || null,
        employment_start_date || null,
        employment_end_date || null
      ]
    );
    const memberId = mRes.insertId;

    const ref = await generatePensionReference(conn, "REGISTRATION");

    const [aRes] = await conn.query(
      `INSERT INTO pension_applications
         (reference_number, applicant_user_id, member_id, programme_id,
          application_type, submitted_details, status, submitted_at)
       VALUES (?, ?, ?, ?, 'REGISTRATION', ?, 'SUBMITTED', NOW())`,
      [ref, req.dbUser.user_id, memberId, programme.programme_id, JSON.stringify(req.body)]
    );
    const appId = aRes.insertId;

    const docs = req.files || [];
    for (const file of docs) {
      await conn.query(
        `INSERT INTO pension_application_documents
           (application_id, document_type, original_filename, storage_key,
            mime_type, file_size_bytes, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          appId,
          file.fieldname || "supporting_document",
          file.originalname,
          `/uploads/pension_documents/${file.filename}`,
          file.mimetype,
          file.size,
          req.dbUser.user_id
        ]
      );
    }

    await conn.query(
      `INSERT INTO pension_status_history
         (application_id, old_status, new_status, changed_by, change_reason)
       VALUES (?, NULL, 'SUBMITTED', ?, 'Registration submitted')`,
      [appId, req.dbUser.user_id]
    );

    await conn.query(
      `INSERT INTO pension_notifications
         (user_id, application_id, subject, message)
       VALUES (?, ?, ?, ?)`,
      [
        req.dbUser.user_id,
        appId,
        "Pension registration received",
        `Your pension registration ${ref} has been submitted for verification.`
      ]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      memberId,
      applicationId: appId,
      referenceNumber: ref
    });
  } catch (err) {
    await conn.rollback();
    console.error("Pension register error:", err);
    res.status(400).json({ error: err.message || "Registration failed" });
  } finally {
    conn.release();
  }
});
// ------------------------------------------------------------
// PENSIONS — submit a benefit application
// ------------------------------------------------------------
app.post(
  "/api/pensions/applications",
  verifyToken,
  pensionSubmitUploads,
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });

    const { application_type, programme_code, details: detailsJson } = req.body || {};
    if (!application_type) {
      return res.status(400).json({ error: "application_type is required" });
    }

    const allowedTypes = [
      "RETIREMENT_BENEFIT","RESIGNATION_BENEFIT","TERMINATION_BENEFIT",
      "RETRENCHMENT_BENEFIT","DISABILITY_BENEFIT","DEATH_BENEFIT",
      "OLD_AGE_PENSION","RECORD_CORRECTION","OTHER"
    ];
    if (!allowedTypes.includes(application_type)) {
      return res.status(400).json({ error: "Invalid application_type" });
    }

    let details = {};
    try {
      details = typeof detailsJson === "string" ? JSON.parse(detailsJson) : (detailsJson || {});
    } catch {
      return res.status(400).json({ error: "Invalid details payload" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Try to resolve the member (may not exist yet)
      let member = null;
      const [members] = await conn.query(
        "SELECT * FROM pension_members WHERE user_id = ?",
        [req.dbUser.user_id]
      );
      if (members.length) member = members[0];

      // 2. Resolve the programme:
      //    a) by explicit programme_code
      //    b) by the member's programme
      //    c) fallback to the first active programme
      let programme = null;

      if (programme_code) {
        const [progs] = await conn.query(
          "SELECT * FROM pension_programmes WHERE programme_code = ? AND is_active = 1",
          [programme_code]
        );
        programme = progs[0] || null;
      }

      if (!programme && member) {
        const [progs] = await conn.query(
          "SELECT * FROM pension_programmes WHERE programme_id = ? AND is_active = 1",
          [member.programme_id]
        );
        programme = progs[0] || null;
      }

      if (!programme) {
        const [progs] = await conn.query(
          "SELECT * FROM pension_programmes WHERE is_active = 1 ORDER BY programme_id LIMIT 1"
        );
        programme = progs[0] || null;
      }

      if (!programme) {
        throw new Error("No pension programme is configured");
      }

      const ref = await generatePensionReference(conn, application_type);

      const [aRes] = await conn.query(
        `INSERT INTO pension_applications
           (reference_number, applicant_user_id, member_id, programme_id,
            application_type, submitted_details, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', NOW())`,
        [
          ref,
          req.dbUser.user_id,
          member?.member_id || null,
          programme.programme_id,
          application_type,
          JSON.stringify(details)
        ]
      );
      const appId = aRes.insertId;

      const docs = req.files || [];
      for (const file of docs) {
        await conn.query(
          `INSERT INTO pension_application_documents
             (application_id, document_type, original_filename, storage_key,
              mime_type, file_size_bytes, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            appId,
            file.fieldname || "supporting_document",
            file.originalname,
            `/uploads/pension_documents/${file.filename}`,
            file.mimetype,
            file.size,
            req.dbUser.user_id
          ]
        );
      }

      await conn.query(
        `INSERT INTO pension_status_history
           (application_id, old_status, new_status, changed_by, change_reason)
         VALUES (?, NULL, 'SUBMITTED', ?, ?)`,
        [appId, req.dbUser.user_id, `${application_type} submitted`]
      );

      await conn.query(
        `INSERT INTO pension_notifications
           (user_id, application_id, subject, message)
         VALUES (?, ?, ?, ?)`,
        [
          req.dbUser.user_id,
          appId,
          "Pension application received",
          `Your application ${ref} (${application_type.replace(/_/g, " ")}) has been submitted.`
        ]
      );

      await conn.commit();
      res.status(201).json({
        success: true,
        applicationId: appId,
        referenceNumber: ref,
        status: "SUBMITTED",
        programme: programme.programme_code
      });
    } catch (err) {
      await conn.rollback();
      console.error("Pension submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);
// ------------------------------------------------------------
// PENSIONS — my applications
// ------------------------------------------------------------
app.get("/api/pensions/applications/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ applications: [] });
  try {
    const [rows] = await db.query(
      `SELECT a.application_id, a.reference_number, a.application_type,
              a.status, a.submitted_at, a.decided_at, a.decision_summary,
              p.programme_name
       FROM pension_applications a
       JOIN pension_programmes p ON p.programme_id = a.programme_id
       WHERE a.applicant_user_id = ?
       ORDER BY a.submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — application detail
// ------------------------------------------------------------
app.get("/api/pensions/applications/:id", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path,
              p.programme_name, p.programme_code
       FROM pension_applications a
       JOIN users u ON u.user_id = a.applicant_user_id
       JOIN pension_programmes p ON p.programme_id = a.programme_id
       WHERE a.application_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const app = rows[0];

    const isOwner = app.applicant_user_id === req.dbUser?.user_id;
    if (!isOwner && !req.isAdmin) return res.status(403).json({ error: "Not authorized" });

    const [documents] = await db.query(
      `SELECT document_id, document_type, original_filename, storage_key,
              mime_type, file_size_bytes, review_status, review_notes, uploaded_at
       FROM pension_application_documents
       WHERE application_id = ?`,
      [app.application_id]
    );
    const [history] = await db.query(
      `SELECT old_status, new_status, change_reason, changed_at
       FROM pension_status_history
       WHERE application_id = ?
       ORDER BY changed_at ASC`,
      [app.application_id]
    );
    const [assessments] = await db.query(
      `SELECT assessment_id, gross_amount, currency, calculation_notes,
              approval_status, assessed_at
       FROM pension_benefit_assessments
       WHERE application_id = ?`,
      [app.application_id]
    );
    const [payments] = await db.query(
      `SELECT payment_id, payment_reference, payment_period, amount, currency,
              payment_method, status, paid_at
       FROM pension_payments
       WHERE application_id = ?`,
      [app.application_id]
    );

    res.json({
      application: { ...app, photo_url: publicUrl(app.photo_path) },
      documents, history, assessments, payments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — delete my application (early status only)
// ------------------------------------------------------------
app.delete("/api/pensions/applications/:id", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM pension_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    if (app.applicant_user_id !== req.dbUser.user_id) throw new Error("Not authorized");

    const deletable = ["DRAFT", "SUBMITTED", "MORE_INFORMATION_REQUIRED"];
    if (!deletable.includes(app.status)) {
      throw new Error(
        `This application can no longer be deleted (status: ${app.status}).`
      );
    }

    await conn.query(
      "DELETE FROM pension_applications WHERE application_id = ?",
      [app.application_id]
    );
    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      null,
      "PENSION_APPLICATION_DELETED",
      "pension_applications",
      app.application_id,
      { reference: app.reference_number, previous_status: app.status },
      req.ip
    );

    res.json({ success: true, deleted: app.reference_number });
  } catch (err) {
    await conn.rollback();
    console.error("Pension delete error:", err);
    const code =
      err.message === "Not authorized" ? 403 :
      err.message === "Application not found" ? 404 : 400;
    res.status(code).json({ error: err.message || "Delete failed" });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// PENSIONS — enquiries/complaints
// ------------------------------------------------------------
app.post("/api/pensions/enquiries", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { enquiry_type, subject, description, related_application_id } = req.body || {};
  if (!enquiry_type || !subject || !description) {
    return res.status(400).json({ error: "enquiry_type, subject and description required" });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const ref = await generatePensionEnquiryReference(conn);

    const [result] = await conn.query(
      `INSERT INTO pension_enquiries
         (user_id, reference_number, related_application_id, enquiry_type, subject, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.dbUser.user_id,
        ref,
        related_application_id || null,
        enquiry_type,
        subject,
        description
      ]
    );
    await conn.commit();
    res.status(201).json({ success: true, enquiryId: result.insertId, reference: ref });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || "Failed" });
  } finally {
    conn.release();
  }
});

app.get("/api/pensions/enquiries/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ enquiries: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM pension_enquiries WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ enquiries: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — notifications
// ------------------------------------------------------------
app.get("/api/pensions/notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM pension_notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/pensions/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE pension_notifications
         SET read_at = NOW(), delivery_status = 'READ'
       WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// PENSIONS — ADMIN endpoints
// ============================================================

// ------------------------------------------------------------
// PENSIONS — ADMIN stats
// ------------------------------------------------------------
app.get("/api/pensions/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM pension_applications GROUP BY status"
    );
    const [byType] = await db.query(
      "SELECT application_type, COUNT(*) AS count FROM pension_applications GROUP BY application_type"
    );
    const [total] = await db.query(
      "SELECT COUNT(*) AS total FROM pension_applications"
    );
    const [pending] = await db.query(
      `SELECT COUNT(*) AS total FROM pension_applications
        WHERE status IN ('SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','VERIFICATION_PENDING')`
    );
    const [approved] = await db.query(
      "SELECT COUNT(*) AS total FROM pension_applications WHERE status = 'APPROVED'"
    );
    const [rejected] = await db.query(
      "SELECT COUNT(*) AS total FROM pension_applications WHERE status = 'REJECTED'"
    );
    const [paid] = await db.query(
      "SELECT COUNT(*) AS total FROM pension_applications WHERE status = 'PAID'"
    );
    const [members] = await db.query(
      "SELECT COUNT(*) AS total FROM pension_members"
    );
    const [openEnquiries] = await db.query(
      `SELECT COUNT(*) AS total FROM pension_enquiries
        WHERE status IN ('OPEN','UNDER_REVIEW','MORE_INFORMATION_REQUIRED')`
    );
    const [paymentsPending] = await db.query(
      `SELECT COUNT(*) AS total FROM pension_payments
        WHERE status IN ('PENDING','PROCESSING','SCHEDULED','RECONCILIATION_REQUIRED')`
    );

    res.json({
      byStatus, byType,
      totalApplications: total[0].total,
      pendingApplications: pending[0].total,
      approvedApplications: approved[0].total,
      rejectedApplications: rejected[0].total,
      paidApplications: paid[0].total,
      totalMembers: members[0].total,
      openEnquiries: openEnquiries[0].total,
      pendingPayments: paymentsPending[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN queue
// ------------------------------------------------------------
app.get("/api/pensions/admin/applications", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, application_type } = req.query;
    let sql = `
      SELECT a.application_id, a.reference_number, a.application_type,
             a.status, a.submitted_at, a.decided_at, a.decision_summary,
             p.programme_name,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM pension_applications a
      JOIN users u ON u.user_id = a.applicant_user_id
      JOIN pension_programmes p ON p.programme_id = a.programme_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    if (application_type) { sql += " AND a.application_type = ?"; params.push(application_type); }
    sql += " ORDER BY a.submitted_at ASC";
    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN update status
// ------------------------------------------------------------
app.post("/api/pensions/admin/applications/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "UNDER_REVIEW","MORE_INFORMATION_REQUIRED","VERIFICATION_PENDING",
    "APPROVED","REJECTED","PAYMENT_PENDING","PAID","CLOSED","CANCELLED"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM pension_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    const isRejection = newStatus === "REJECTED";
    const isDecision = ["APPROVED","REJECTED"].includes(newStatus);

    await conn.query(
      `UPDATE pension_applications
         SET status = ?,
             decision_summary = COALESCE(?, decision_summary),
             decision_reference = COALESCE(?, decision_reference),
             decided_at = CASE WHEN ? THEN NOW() ELSE decided_at END,
             assigned_admin_id = COALESCE(assigned_admin_id, ?)
       WHERE application_id = ?`,
      [
        newStatus,
        note || null,
        isRejection ? `Rejected at ${new Date().toISOString()}` : null,
        isDecision ? 1 : 0,
        req.dbUser.user_id,
        app.application_id
      ]
    );

    await conn.query(
      `INSERT INTO pension_status_history
         (application_id, old_status, new_status, changed_by, change_reason)
       VALUES (?, ?, ?, ?, ?)`,
      [app.application_id, app.status, newStatus, req.dbUser.user_id, note || null]
    );

    await conn.query(
      `INSERT INTO pension_notifications
         (user_id, application_id, subject, message)
       VALUES (?, ?, ?, ?)`,
      [
        app.applicant_user_id,
        app.application_id,
        "Pension application updated",
        `Your application ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`
      ]
    );

    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      null,
      "PENSION_STATUS_CHANGED",
      "pension_applications",
      app.application_id,
      { from: app.status, to: newStatus, note },
      req.ip
    );

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN record decision / assessment
// ------------------------------------------------------------
app.post("/api/pensions/admin/applications/:id/assessment", verifyToken, requireAdmin, async (req, res) => {
  const { gross_amount, currency, calculation_notes, approval_status } = req.body || {};
  if (gross_amount == null) return res.status(400).json({ error: "gross_amount required" });

  try {
    const [apps] = await db.query(
      "SELECT * FROM pension_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });

    const [result] = await db.query(
      `INSERT INTO pension_benefit_assessments
         (application_id, gross_amount, currency, calculation_notes,
          assessed_by, approval_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        Number(gross_amount),
        currency || "LSL",
        calculation_notes || null,
        req.dbUser.user_id,
        approval_status || "PENDING_AUTHORITY"
      ]
    );
    res.status(201).json({ success: true, assessmentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN verify member
// ------------------------------------------------------------
app.get("/api/pensions/admin/members", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT m.*, p.programme_name,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM pension_members m
      JOIN users u ON u.user_id = m.user_id
      JOIN pension_programmes p ON p.programme_id = m.programme_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND m.membership_status = ?"; params.push(status); }
    sql += " ORDER BY m.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({
      members: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/pensions/admin/members/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { membership_status, identity_verification_status, note } = req.body || {};
  const allowedMember = ["PENDING_VERIFICATION","ACTIVE","RETIRED","RESIGNED","TERMINATED","DECEASED","SUSPENDED"];
  const allowedIdentity = ["NOT_CHECKED","PENDING","VERIFIED","FAILED"];
  if (membership_status && !allowedMember.includes(membership_status)) {
    return res.status(400).json({ error: "Invalid membership_status" });
  }
  if (identity_verification_status && !allowedIdentity.includes(identity_verification_status)) {
    return res.status(400).json({ error: "Invalid identity_verification_status" });
  }
  try {
    await db.query(
      `UPDATE pension_members
         SET membership_status = COALESCE(?, membership_status),
             identity_verification_status = COALESCE(?, identity_verification_status),
             verified_by = ?,
             verified_at = NOW()
       WHERE member_id = ?`,
      [membership_status || null, identity_verification_status || null,
       req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN contributions list (per member)
// ------------------------------------------------------------
app.get("/api/pensions/admin/members/:id/contributions", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM pension_contributions WHERE member_id = ?
       ORDER BY contribution_period DESC`,
      [req.params.id]
    );
    res.json({ contributions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/pensions/admin/contributions", verifyToken, requireAdmin, async (req, res) => {
  const { member_id, contribution_period, member_contribution, employer_contribution, source_system, external_reference } = req.body || {};
  if (!member_id || !contribution_period) {
    return res.status(400).json({ error: "member_id and contribution_period required" });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO pension_contributions
         (member_id, contribution_period, member_contribution, employer_contribution,
          source_system, external_reference, reconciliation_status, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', NOW())`,
      [
        member_id,
        contribution_period,
        Number(member_contribution || 0),
        Number(employer_contribution || 0),
        source_system || "ADMIN",
        external_reference || null
      ]
    );
    res.status(201).json({ success: true, contributionId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN payments
// ------------------------------------------------------------
app.get("/api/pensions/admin/payments", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.full_name, u.email
       FROM pension_payments p
       LEFT JOIN pension_members m ON m.member_id = p.member_id
       LEFT JOIN pension_beneficiaries b ON b.beneficiary_id = p.beneficiary_id
       LEFT JOIN users u ON u.user_id = COALESCE(m.user_id, b.user_id)
       ORDER BY p.created_at DESC LIMIT 500`
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/pensions/admin/payments", verifyToken, requireAdmin, async (req, res) => {
  const {
    application_id, member_id, beneficiary_id, programme_code,
    payment_period, amount, payment_method, status, provider_reference
  } = req.body || {};

  if (!programme_code || !amount) {
    return res.status(400).json({ error: "programme_code and amount required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [progs] = await conn.query(
      "SELECT programme_id FROM pension_programmes WHERE programme_code = ?",
      [programme_code]
    );
    if (!progs.length) throw new Error("Programme not found");

    const ref = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await conn.query(
      `INSERT INTO pension_payments
         (application_id, member_id, beneficiary_id, programme_id,
          payment_reference, payment_period, amount, currency,
          payment_method, status, provider_reference, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'LSL', ?, ?, ?, ?)`,
      [
        application_id || null,
        member_id || null,
        beneficiary_id || null,
        progs[0].programme_id,
        ref,
        payment_period || null,
        Number(amount),
        payment_method || "BANK",
        status || "PENDING",
        provider_reference || null,
        status === "PAID" ? new Date() : null
      ]
    );
    await conn.commit();
    res.status(201).json({ success: true, paymentId: result.insertId, payment_reference: ref });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN government debts (deduction enquiries)
// ------------------------------------------------------------
app.get("/api/pensions/admin/debts", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, m.member_number, u.full_name, u.email
       FROM pension_government_debts d
       JOIN pension_members m ON m.member_id = d.member_id
       JOIN users u ON u.user_id = m.user_id
       ORDER BY d.recorded_at DESC`
    );
    res.json({ debts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/pensions/admin/debts/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { verification_status, note } = req.body || {};
  const allowed = ["PENDING","VERIFIED","DISPUTED","NOT_CONFIRMED","RESOLVED"];
  if (!allowed.includes(verification_status)) {
    return res.status(400).json({ error: "Invalid verification_status" });
  }
  try {
    await db.query(
      `UPDATE pension_government_debts
         SET verification_status = ?, verified_by = ?, verified_at = NOW()
       WHERE debt_id = ?`,
      [verification_status, req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN enquiries
// ------------------------------------------------------------
app.get("/api/pensions/admin/enquiries", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, u.full_name, u.email
       FROM pension_enquiries e
       JOIN users u ON u.user_id = e.user_id
       ORDER BY e.created_at DESC`
    );
    res.json({ enquiries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/pensions/admin/enquiries/:id/respond", verifyToken, requireAdmin, async (req, res) => {
  const { response, status } = req.body || {};
  if (!response) return res.status(400).json({ error: "response required" });
  const allowed = ["OPEN","UNDER_REVIEW","MORE_INFORMATION_REQUIRED","RESPONDED","RESOLVED","CLOSED"];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    await db.query(
      `UPDATE pension_enquiries
         SET response = ?,
             status = COALESCE(?, status),
             assigned_admin_id = ?,
             resolved_at = CASE WHEN ? IN ('RESOLVED','CLOSED') THEN NOW() ELSE resolved_at END
       WHERE enquiry_id = ?`,
      [response, status || null, req.dbUser.user_id, status || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// PENSIONS — ADMIN audit log
// ------------------------------------------------------------
app.get("/api/pensions/admin/audit", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.firebase_uid = al.user_id
       WHERE al.entity_type = 'pension_applications'
          OR al.action LIKE 'PENSION%'
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});






// ============================================================
// TRAFFIC — ADMIN endpoints
// ============================================================

// ------------------------------------------------------------
// TRAFFIC — ADMIN stats
// ------------------------------------------------------------
app.get("/api/traffic/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM traffic_applications GROUP BY status"
    );
    const [byType] = await db.query(
      "SELECT application_type, COUNT(*) AS count FROM traffic_applications GROUP BY application_type"
    );
    const [total] = await db.query(
      "SELECT COUNT(*) AS total FROM traffic_applications"
    );
    const [pending] = await db.query(
      `SELECT COUNT(*) AS total FROM traffic_applications
        WHERE status IN ('SUBMITTED','UNDER_REVIEW','DOCUMENTS_REQUIRED',
                         'APPOINTMENT_REQUIRED','PAYMENT_PENDING','PROCESSING')`
    );
    const [approved] = await db.query(
      `SELECT COUNT(*) AS total FROM traffic_applications
        WHERE status IN ('APPROVED','READY_FOR_COLLECTION','COMPLETED')`
    );
    const [rejected] = await db.query(
      "SELECT COUNT(*) AS total FROM traffic_applications WHERE status = 'REJECTED'"
    );
    const [unpaidFines] = await db.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS total_amount FROM traffic_fines WHERE fine_status = 'UNPAID'"
    );
    const [pendingClearances] = await db.query(
      "SELECT COUNT(*) AS total FROM licence_clearance_requests WHERE clearance_status IN ('PENDING','IN_PROGRESS')"
    );
    const [openComplaints] = await db.query(
      "SELECT COUNT(*) AS total FROM traffic_complaints WHERE complaint_status IN ('OPEN','ASSIGNED','IN_REVIEW')"
    );

    res.json({
      byStatus,
      byType,
      totalApplications: total[0].total,
      pendingApplications: pending[0].total,
      approvedApplications: approved[0].total,
      rejectedApplications: rejected[0].total,
      unpaidFines: unpaidFines[0].total,
      unpaidFinesAmount: Number(unpaidFines[0].total_amount),
      pendingClearances: pendingClearances[0].total,
      openComplaints: openComplaints[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN queue
// ------------------------------------------------------------
app.get("/api/traffic/admin/applications", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, application_type } = req.query;
    let sql = `
      SELECT a.application_id, a.reference_number, a.application_type,
             a.title, a.status, a.urgency, a.submitted_at, a.updated_at,
             a.admin_notes, a.fee_amount, a.payment_status,
             c.category_name,
             u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM traffic_applications a
      JOIN users u ON u.user_id = a.user_id
      JOIN traffic_service_categories c ON c.category_id = a.category_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    if (application_type) { sql += " AND a.application_type = ?"; params.push(application_type); }
    sql += " ORDER BY FIELD(a.urgency,'URGENT','HIGH','NORMAL','LOW'), a.submitted_at ASC";

    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN update status
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "UNDER_REVIEW", "DOCUMENTS_REQUIRED", "APPOINTMENT_REQUIRED",
    "PAYMENT_PENDING", "APPROVED", "REJECTED", "PROCESSING",
    "READY_FOR_COLLECTION", "COMPLETED", "CANCELLED"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    const isRejection = newStatus === "REJECTED";

    await conn.query(
      `UPDATE traffic_applications
         SET status = ?, admin_notes = COALESCE(?, admin_notes),
             rejection_reason = CASE WHEN ? THEN ? ELSE rejection_reason END,
             decision_at = CASE WHEN ? IN ('APPROVED','REJECTED','COMPLETED')
                                THEN NOW() ELSE decision_at END,
             assigned_admin_id = COALESCE(assigned_admin_id, ?)
       WHERE application_id = ?`,
      [
        newStatus,
        note || null,
        isRejection ? 1 : 0,
        isRejection ? (note || "Not specified") : null,
        newStatus,
        req.dbUser.user_id,
        req.params.id
      ]
    );

    await conn.query(
      `INSERT INTO traffic_status_history
        (application_id, old_status, new_status, changed_by, change_reason)
       VALUES (?, ?, ?, ?, ?)`,
      [app.application_id, app.status, newStatus, req.dbUser.user_id, note || null]
    );

    await conn.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', ?, ?)`,
      [
        app.user_id,
        app.application_id,
        "Application status updated",
        `Your application ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`
      ]
    );

    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      null,
      "TRAFFIC_STATUS_CHANGED",
      "traffic_applications",
      app.application_id,
      { from: app.status, to: newStatus, note },
      req.ip
    );

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN record payment
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/payment", verifyToken, requireAdmin, async (req, res) => {
  const { amount, payment_method, transaction_reference, payment_status } = req.body || {};
  if (!amount) return res.status(400).json({ error: "amount required" });

  try {
    const trx = transaction_reference || `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const [result] = await db.query(
      `INSERT INTO traffic_payments
        (application_id, payer_user_id, payment_reference, amount,
         payment_method, payment_status, payment_purpose, paid_at, verified_at)
       SELECT ?, user_id, ?, ?, ?, ?, 'Application fee', NOW(), NOW()
       FROM traffic_applications WHERE application_id = ?`,
      [
        req.params.id,
        trx,
        amount,
        payment_method || "CASH_OFFICE",
        payment_status || "SUCCESS",
        req.params.id
      ]
    );

    if (payment_status === "SUCCESS" || payment_status === "paid") {
      await db.query(
        `UPDATE traffic_applications
           SET payment_status = 'PAID', fee_amount = ?
         WHERE application_id = ?`,
        [amount, req.params.id]
      );
    }

    res.status(201).json({ success: true, paymentId: result.insertId, reference: trx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN schedule test
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/test-booking", verifyToken, requireAdmin, async (req, res) => {
  const { test_type, office_name, scheduled_at, notes } = req.body || {};
  if (!test_type || !office_name || !scheduled_at) {
    return res.status(400).json({ error: "test_type, office_name and scheduled_at are required" });
  }

  try {
    const [appRows] = await db.query(
      "SELECT user_id FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!appRows.length) return res.status(404).json({ error: "Application not found" });

    const [result] = await db.query(
      `INSERT INTO driving_test_bookings
        (application_id, applicant_user_id, test_type, office_name, scheduled_at,
         booking_status, booked_by, notes)
       VALUES (?, ?, ?, ?, ?, 'BOOKED', ?, ?)`,
      [
        req.params.id,
        appRows[0].user_id,
        test_type,
        office_name,
        scheduled_at,
        req.dbUser.user_id,
        notes || null
      ]
    );

    await db.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       SELECT user_id, application_id, 'APPOINTMENT', 'Test scheduled',
              CONCAT('Your ', ?, ' test has been scheduled at ', ?, ' on ', ?)
       FROM traffic_applications WHERE application_id = ?`,
      [test_type, office_name, scheduled_at, req.params.id]
    );

    await db.query(
      `UPDATE traffic_applications SET status = 'APPOINTMENT_REQUIRED' WHERE application_id = ?`,
      [req.params.id]
    );

    res.status(201).json({ success: true, bookingId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to schedule test" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN record test result
// ------------------------------------------------------------
app.post("/api/traffic/admin/test-bookings/:id/result", verifyToken, requireAdmin, async (req, res) => {
  const { result, score, result_notes } = req.body || {};
  const allowed = ["PASS", "FAIL", "ABSENT"];
  if (!allowed.includes(result)) {
    return res.status(400).json({ error: "Invalid result" });
  }

  try {
    const [bookings] = await db.query(
      "SELECT * FROM driving_test_bookings WHERE booking_id = ?",
      [req.params.id]
    );
    if (!bookings.length) return res.status(404).json({ error: "Booking not found" });
    const booking = bookings[0];

    const [existing] = await db.query(
      "SELECT result_id FROM driving_test_results WHERE booking_id = ?",
      [req.params.id]
    );

    if (existing.length) {
      await db.query(
        `UPDATE driving_test_results
           SET result = ?, score = ?, result_notes = ?, examiner_user_id = ?, recorded_at = NOW()
         WHERE booking_id = ?`,
        [result, score || null, result_notes || null, req.dbUser.user_id, req.params.id]
      );
    } else {
      await db.query(
        `INSERT INTO driving_test_results
          (booking_id, examiner_user_id, result, score, result_notes)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, req.dbUser.user_id, result, score || null, result_notes || null]
      );
    }

    await db.query(
      "UPDATE driving_test_bookings SET booking_status = 'ATTENDED' WHERE booking_id = ?",
      [req.params.id]
    );

    await db.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', 'Test result recorded',
               CONCAT('Your driving test result: ', ?))`,
      [booking.applicant_user_id, booking.application_id, result]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record result" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN issue licence
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/issue-licence", verifyToken, requireAdmin, async (req, res) => {
  const { licence_number, licence_category, issue_date, expiry_date } = req.body || {};
  if (!licence_number || !licence_category) {
    return res.status(400).json({ error: "licence_number and licence_category are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [apps] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!apps.length) throw new Error("Application not found");
    const app = apps[0];

    await conn.query(
      `INSERT INTO driver_licences
        (user_id, application_id, licence_number, licence_category,
         issue_date, expiry_date, licence_status, issuing_officer_id)
       VALUES (?, ?, ?, ?, ?, ?, 'VALID', ?)`,
      [
        app.user_id,
        app.application_id,
        licence_number,
        licence_category,
        issue_date || new Date(),
        expiry_date || null,
        req.dbUser.user_id
      ]
    );

    await conn.query(
      `UPDATE traffic_applications SET status = 'READY_FOR_COLLECTION' WHERE application_id = ?`,
      [app.application_id]
    );

    await conn.query(
      `INSERT INTO traffic_status_history
        (application_id, old_status, new_status, changed_by, change_reason)
       VALUES (?, ?, 'READY_FOR_COLLECTION', ?, ?)`,
      [app.application_id, app.status, req.dbUser.user_id, `Licence ${licence_number} issued`]
    );

    await conn.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', 'Licence ready for collection',
               CONCAT('Your licence ', ?, ' is ready for collection.'))`,
      [app.user_id, app.application_id, licence_number]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN register vehicle
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/register-vehicle", verifyToken, requireAdmin, async (req, res) => {
  const {
    vin_or_chassis_number, make, model, manufacture_year,
    vehicle_type, colour, registration_number, expiry_date
  } = req.body || {};

  if (!vin_or_chassis_number || !make || !vehicle_type) {
    return res.status(400).json({ error: "vin_or_chassis_number, make and vehicle_type are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [apps] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!apps.length) throw new Error("Application not found");
    const app = apps[0];

    const [vehicleResult] = await conn.query(
      `INSERT INTO traffic_vehicles
        (owner_user_id, vin_or_chassis_number, make, model, manufacture_year,
         vehicle_type, colour, ownership_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        app.user_id,
        vin_or_chassis_number,
        make,
        model || null,
        manufacture_year || null,
        vehicle_type,
        colour || null
      ]
    );
    const vehicleId = vehicleResult.insertId;

    const regNum = registration_number || `LE-${Date.now().toString().slice(-6)}`;

    await conn.query(
      `INSERT INTO vehicle_registrations
        (vehicle_id, application_id, registration_number, registration_type,
         registration_status, registered_on, expiry_date, processed_by)
       VALUES (?, ?, ?, 'NEW', 'ACTIVE', NOW(), ?, ?)`,
      [vehicleId, app.application_id, regNum, expiry_date || null, req.dbUser.user_id]
    );

    await conn.query(
      `UPDATE traffic_applications SET status = 'APPROVED' WHERE application_id = ?`,
      [app.application_id]
    );

    await conn.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', 'Vehicle registered',
               CONCAT('Your vehicle has been registered with number plate ', ?))`,
      [app.user_id, app.application_id, regNum]
    );

    await conn.commit();
    res.json({ success: true, vehicleId, registrationNumber: regNum });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN fines list
// ------------------------------------------------------------
app.get("/api/traffic/admin/fines", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `SELECT * FROM traffic_fines WHERE 1 = 1`;
    const params = [];
    if (status) { sql += " AND fine_status = ?"; params.push(status); }
    if (search) {
      sql += " AND (fine_reference LIKE ? OR offender_name LIKE ? OR vehicle_registration LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY offence_date DESC";
    const [rows] = await db.query(sql, params);
    res.json({ fines: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN create fine
// ------------------------------------------------------------
app.post("/api/traffic/admin/fines", verifyToken, requireAdmin, async (req, res) => {
  const {
    offender_name, national_id, vehicle_registration,
    offence_description, offence_date, offence_location, amount
  } = req.body || {};

  if (!offence_description || !offence_date || !amount) {
    return res.status(400).json({ error: "offence_description, offence_date and amount are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const ref = await generateTrafficFineReference(conn);

    const [result] = await conn.query(
      `INSERT INTO traffic_fines
        (fine_reference, offender_name, national_id, vehicle_registration,
         offence_description, offence_date, offence_location, amount, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref,
        offender_name || null,
        national_id || null,
        vehicle_registration || null,
        offence_description,
        offence_date,
        offence_location || null,
        amount,
        req.dbUser.user_id
      ]
    );

    await conn.commit();
    res.status(201).json({ success: true, fineId: result.insertId, reference: ref });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN record fine payment
// ------------------------------------------------------------
app.post("/api/traffic/admin/fines/:id/payment", verifyToken, requireAdmin, async (req, res) => {
  const { payment_reference } = req.body || {};

  try {
    await db.query(
      `UPDATE traffic_fines
         SET fine_status = 'PAID', paid_at = NOW(), payment_reference = ?
       WHERE fine_id = ?`,
      [payment_reference || `PAY-${Date.now()}`, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN complaints
// ------------------------------------------------------------
app.get("/api/traffic/admin/complaints", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, u.full_name, u.email
      FROM traffic_complaints c
      JOIN users u ON u.user_id = c.user_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND c.complaint_status = ?"; params.push(status); }
    sql += " ORDER BY c.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ complaints: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/complaints/:id/respond", verifyToken, requireAdmin, async (req, res) => {
  const { admin_response, complaint_status } = req.body || {};
  if (!admin_response) return res.status(400).json({ error: "admin_response required" });

  try {
    await db.query(
      `UPDATE traffic_complaints
         SET admin_response = ?, complaint_status = ?,
             resolved_at = CASE WHEN ? IN ('RESOLVED','CLOSED') THEN NOW() ELSE resolved_at END,
             assigned_to = COALESCE(assigned_to, ?)
       WHERE complaint_id = ?`,
      [admin_response, complaint_status || "IN_REVIEW",
       complaint_status || "IN_REVIEW", req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN clearances
// ------------------------------------------------------------
app.get("/api/traffic/admin/clearances", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, u.full_name, u.email, u.phone
      FROM licence_clearance_requests c
      JOIN users u ON u.user_id = c.applicant_user_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND c.clearance_status = ?"; params.push(status); }
    sql += " ORDER BY c.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ clearances: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/clearances/:id/update", verifyToken, requireAdmin, async (req, res) => {
  const { clearance_status, notes } = req.body || {};

  try {
    await db.query(
      `UPDATE licence_clearance_requests
         SET clearance_status = COALESCE(?, clearance_status),
             notes = COALESCE(?, notes),
             cleared_at = CASE WHEN ? = 'CLEARED' THEN NOW() ELSE cleared_at END,
             cleared_by = CASE WHEN ? = 'CLEARED' THEN ? ELSE cleared_by END
       WHERE clearance_id = ?`,
      [clearance_status || null, notes || null,
       clearance_status || null, clearance_status || null,
       req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN driving schools
// ------------------------------------------------------------
app.get("/api/traffic/admin/driving-schools", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT * FROM driving_schools WHERE 1 = 1`;
    const params = [];
    if (status) { sql += " AND school_status = ?"; params.push(status); }
    sql += " ORDER BY school_name";
    const [rows] = await db.query(sql, params);
    res.json({ schools: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/driving-schools/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { school_status, issue_date, expiry_date, notes } = req.body || {};

  try {
    await db.query(
      `UPDATE driving_schools
         SET school_status = COALESCE(?, school_status),
             issue_date = COALESCE(?, issue_date),
             expiry_date = COALESCE(?, expiry_date),
             reviewed_by = ?
       WHERE school_id = ?`,
      [school_status || null, issue_date || null, expiry_date || null,
       req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — ADMIN audit log
// ------------------------------------------------------------
app.get("/api/traffic/admin/audit", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.firebase_uid = al.user_id
       WHERE al.entity_type = 'traffic_applications'
          OR al.action LIKE 'TRAFFIC%'
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — citizen pays a fine online
// ------------------------------------------------------------
app.post("/api/traffic/fines/:id/pay", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { payment_method, transaction_reference } = req.body || {};

  try {
    const [rows] = await db.query(
      "SELECT * FROM traffic_fines WHERE fine_id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Fine not found" });
    const fine = rows[0];

    if (fine.offender_user_id && fine.offender_user_id !== req.dbUser.user_id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (fine.fine_status === "PAID") {
      return res.status(400).json({ error: "Fine is already paid" });
    }

    const trx = transaction_reference || `PAY-${Date.now()}`;

    await db.query(
      `INSERT INTO traffic_payments
         (fine_id, payer_user_id, payment_reference, amount,
          payment_method, payment_status, payment_purpose, paid_at, verified_at)
       VALUES (?, ?, ?, ?, ?, 'SUCCESS', 'Traffic fine payment', NOW(), NOW())`,
      [
        fine.fine_id,
        req.dbUser.user_id,
        trx,
        fine.amount,
        payment_method || "MOBILE_MONEY"
      ]
    );

    await db.query(
      `UPDATE traffic_fines
         SET fine_status = 'PAID', paid_at = NOW(), payment_reference = ?
       WHERE fine_id = ?`,
      [trx, fine.fine_id]
    );

    await db.query(
      `INSERT INTO traffic_notifications
         (user_id, notification_type, title, message)
       VALUES (?, 'PAYMENT', 'Fine paid', ?)`,
      [
        req.dbUser.user_id,
        `Your payment for fine ${fine.fine_reference} (M ${fine.amount}) was successful. Reference: ${trx}.`
      ]
    );

    await logAudit(req.dbUser.user_id, null, "TRAFFIC_FINE_PAID",
      "traffic_fines", fine.fine_id,
      { reference: fine.fine_reference, amount: fine.amount }, req.ip);

    res.json({ success: true, reference: trx, fine_reference: fine.fine_reference });
  } catch (err) {
    console.error("Traffic fine payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — track any application/fine/complaint by reference
// ------------------------------------------------------------
app.get("/api/traffic/track/:reference", verifyToken, async (req, res) => {
  const ref = req.params.reference;
  try {
    // Try application
    const [appRows] = await db.query(
      `SELECT application_id, reference_number, application_type, title, status, submitted_at
       FROM traffic_applications WHERE reference_number = ?`,
      [ref]
    );
    if (appRows.length) {
      const a = appRows[0];
      return res.json({
        reference: a.reference_number,
        type: a.application_type.replace(/_/g, " "),
        status: a.status,
        submitted_at: a.submitted_at
      });
    }

    // Try fine
    const [fineRows] = await db.query(
      `SELECT fine_id, fine_reference, offence_description, amount, fine_status, offence_date
       FROM traffic_fines WHERE fine_reference = ?`,
      [ref]
    );
    if (fineRows.length) {
      const f = fineRows[0];
      return res.json({
        reference: f.fine_reference,
        type: "Traffic fine",
        status: f.fine_status,
        submitted_at: f.offence_date
      });
    }

    // Try complaint
    const [complaintRows] = await db.query(
      `SELECT complaint_id, reference_number, complaint_type, subject, complaint_status, created_at
       FROM traffic_complaints WHERE reference_number = ?`,
      [ref]
    );
    if (complaintRows.length) {
      const c = complaintRows[0];
      return res.json({
        reference: c.reference_number,
        type: c.complaint_type.replace(/_/g, " "),
        status: c.complaint_status,
        submitted_at: c.created_at
      });
    }

    res.status(404).json({ error: "No record found for that reference" });
  } catch (err) {
    console.error("Traffic track error:", err);
    res.status(500).json({ error: "Failed to track reference" });
  }
});
// ============================================================
// ============================================================
// TRAFFIC MODULE — Department of Traffic and Transport
// ============================================================
// ============================================================

const TRAFFIC_DOCS_DIR = path.join(__dirname, "uploads", "traffic_documents");
if (!fs.existsSync(TRAFFIC_DOCS_DIR)) {
  fs.mkdirSync(TRAFFIC_DOCS_DIR, { recursive: true });
}

const uploadTrafficDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TRAFFIC_DOCS_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const trafficSubmitUploads = uploadTrafficDocuments.array("documents", 10);

// ------------------------------------------------------------
// TRAFFIC — reference generators
// ------------------------------------------------------------
async function generateTrafficReference(conn, application_type) {
  const prefixMap = {
    LEARNER_LICENCE: "TFL",
    DRIVER_LICENCE: "TDL",
    LICENCE_RENEWAL: "TLR",
    LICENCE_REPLACEMENT: "TLP",
    LICENCE_CORRECTION: "TLC",
    VEHICLE_REGISTRATION: "TVR",
    IMPORTED_VEHICLE_REGISTRATION: "TVI",
    SECOND_HAND_LOCAL: "TVS",
    SECOND_HAND_FOREIGN: "TVF",
    SPECIAL_VEHICLE_PERMIT: "TVP",
    NUMBER_PLATE: "TNP",
    NUMBER_PLATE_REPLACEMENT: "TNR",
    ROADWORTHINESS_INSPECTION: "TRW",
    FITNESS_INSPECTION: "TFI",
    RE_INSPECTION: "TRI",
    PUBLIC_MOTOR_VEHICLE_PERMIT: "TPM",
    PERMIT_RENEWAL: "TPR",
    DRIVING_SCHOOL_REGISTRATION: "TDS",
    INSTRUCTOR_REGISTRATION: "TDI",
    OWNERSHIP_TRANSFER: "TOT",
    RECORD_CORRECTION: "TRC"
  };
  const prefix = prefixMap[application_type] || "TRA";
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM traffic_applications WHERE reference_number LIKE ?",
    [`${prefix}-%`]
  );
  return `${prefix}-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function generateTrafficFineReference(conn) {
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM traffic_fines WHERE fine_reference LIKE 'TFN-%'"
  );
  return `TFN-${year}-${String(n + 1).padStart(6, "0")}`;
}

async function generateTrafficComplaintReference(conn) {
  const year = new Date().getFullYear();
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM traffic_complaints WHERE reference_number LIKE 'TCP-%'"
  );
  return `TCP-${year}-${String(n + 1).padStart(6, "0")}`;
}

// ------------------------------------------------------------
// TRAFFIC — public categories
// ------------------------------------------------------------
app.get("/api/traffic/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM traffic_service_categories WHERE is_active = 1 ORDER BY category_name"
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error("Traffic categories error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — citizen submits application
// ------------------------------------------------------------
app.post(
  "/api/traffic/applications",
  verifyToken,
  trafficSubmitUploads,
  async (req, res) => {
    if (!req.dbUser) return res.status(400).json({ error: "Register first" });

    const { categoryId, applicationType, title, description, fields: fieldsJson } = req.body;
    if (!applicationType) return res.status(400).json({ error: "applicationType is required" });
    if (!title) return res.status(400).json({ error: "title is required" });

    let fields = {};
    try {
      fields = typeof fieldsJson === "string" ? JSON.parse(fieldsJson) : (fieldsJson || {});
    } catch {
      return res.status(400).json({ error: "Invalid fields payload" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let catId = categoryId;
      if (!catId) {
        const [c] = await conn.query(
          "SELECT category_id FROM traffic_service_categories LIMIT 1"
        );
        catId = c[0]?.category_id;
      }
      if (!catId) throw new Error("No traffic service category configured");

      const ref = await generateTrafficReference(conn, applicationType);

      const [result] = await conn.query(
        `INSERT INTO traffic_applications
           (reference_number, user_id, category_id, application_type,
            title, description, urgency, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', NOW())`,
        [
          ref,
          req.dbUser.user_id,
          catId,
          applicationType,
          title,
          description || null,
          fields.urgency || "NORMAL"
        ]
      );
      const appId = result.insertId;

      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            await conn.query(
              `INSERT INTO traffic_application_values
                 (application_id, field_key, field_value) VALUES (?, ?, ?)`,
              [appId, key, String(v)]
            );
          }
        } else {
          await conn.query(
            `INSERT INTO traffic_application_values
               (application_id, field_key, field_value) VALUES (?, ?, ?)`,
            [appId, key, String(value)]
          );
        }
      }

      const files = req.files || [];
      for (const file of files) {
        await conn.query(
          `INSERT INTO traffic_application_documents
             (application_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            appId,
            file.fieldname || "supporting_document",
            file.originalname,
            `/uploads/traffic_documents/${file.filename}`,
            file.mimetype,
            file.size
          ]
        );
      }

      await conn.query(
        `INSERT INTO traffic_status_history
           (application_id, old_status, new_status, changed_by, change_reason)
         VALUES (?, NULL, 'SUBMITTED', ?, 'Application submitted by citizen')`,
        [appId, req.dbUser.user_id]
      );

      await conn.query(
        `INSERT INTO traffic_notifications
           (user_id, application_id, notification_type, title, message)
         VALUES (?, ?, 'APPLICATION_UPDATE', ?, ?)`,
        [
          req.dbUser.user_id,
          appId,
          "Application received",
          `Your traffic application ${ref} has been submitted successfully.`
        ]
      );

      await conn.commit();

      await logAudit(
        req.dbUser.user_id,
        null,
        "TRAFFIC_APPLICATION_SUBMITTED",
        "traffic_applications",
        appId,
        { reference: ref, applicationType },
        req.ip
      );

      res.status(201).json({
        success: true,
        applicationId: appId,
        referenceNumber: ref,
        status: "SUBMITTED"
      });
    } catch (err) {
      await conn.rollback();
      console.error("Traffic submit error:", err);
      res.status(400).json({ error: err.message || "Submission failed" });
    } finally {
      conn.release();
    }
  }
);

// ------------------------------------------------------------
// TRAFFIC — my applications
// ------------------------------------------------------------
app.get("/api/traffic/applications/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ applications: [] });
  try {
    const [rows] = await db.query(
      `SELECT a.application_id, a.reference_number, a.application_type,
              a.title, a.status, a.urgency, a.submitted_at, a.updated_at,
              a.admin_notes, a.decision_notes, a.rejection_reason,
              a.fee_amount, a.payment_status,
              c.category_name
       FROM traffic_applications a
       JOIN traffic_service_categories c ON c.category_id = a.category_id
       WHERE a.user_id = ?
       ORDER BY a.submitted_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ applications: rows });
  } catch (err) {
    console.error("Traffic my applications error:", err);
    res.status(500).json({ error: "Failed to load" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — single application detail (owner or admin)
// ------------------------------------------------------------
app.get("/api/traffic/applications/:id", verifyToken, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT a.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path,
              c.category_name, c.category_code
       FROM traffic_applications a
       JOIN users u ON u.user_id = a.user_id
       JOIN traffic_service_categories c ON c.category_id = a.category_id
       WHERE a.application_id = ?`,
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });

    const app = apps[0];
    const isOwner = app.user_id === req.dbUser?.user_id;
    if (!isOwner && !req.isAdmin) return res.status(403).json({ error: "Not authorized" });

    const [values] = await db.query(
      "SELECT field_key, field_value FROM traffic_application_values WHERE application_id = ?",
      [app.application_id]
    );
    const [documents] = await db.query(
      `SELECT document_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes, verification_status, rejection_reason, uploaded_at
       FROM traffic_application_documents WHERE application_id = ?`,
      [app.application_id]
    );
    const [history] = await db.query(
      `SELECT old_status, new_status, change_reason, changed_at
       FROM traffic_status_history WHERE application_id = ?
       ORDER BY changed_at ASC`,
      [app.application_id]
    );

    res.json({
      application: { ...app, photo_url: publicUrl(app.photo_path) },
      values,
      documents,
      history
    });
  } catch (err) {
    console.error("Traffic detail error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — delete my application
// ------------------------------------------------------------
app.delete("/api/traffic/applications/:id", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];
    if (app.user_id !== req.dbUser.user_id) throw new Error("Not authorized");

    const deletable = ["DRAFT", "SUBMITTED", "DOCUMENTS_REQUIRED"];
    if (!deletable.includes(app.status)) {
      throw new Error(`This application can no longer be deleted (status: ${app.status}).`);
    }

    await conn.query("DELETE FROM traffic_applications WHERE application_id = ?", [app.application_id]);
    await conn.commit();

    await logAudit(req.dbUser.user_id, null, "TRAFFIC_APPLICATION_DELETED",
      "traffic_applications", app.application_id,
      { reference: app.reference_number, previous_status: app.status }, req.ip);

    res.json({ success: true, deleted: app.reference_number });
  } catch (err) {
    await conn.rollback();
    const code =
      err.message === "Not authorized" ? 403 :
      err.message === "Application not found" ? 404 : 400;
    res.status(code).json({ error: err.message || "Delete failed" });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// TRAFFIC — my fines / licences / vehicles / clearances / notifications
// ------------------------------------------------------------
app.get("/api/traffic/fines/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ fines: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM traffic_fines
       WHERE offender_user_id = ? OR national_id = ?
       ORDER BY offence_date DESC`,
      [req.dbUser.user_id, req.dbUser.national_id]
    );
    res.json({ fines: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/traffic/licences/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ licences: [] });
  try {
    const [rows] = await db.query(
      "SELECT * FROM driver_licences WHERE user_id = ? ORDER BY created_at DESC",
      [req.dbUser.user_id]
    );
    res.json({ licences: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/traffic/vehicles/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ vehicles: [] });
  try {
    const [rows] = await db.query(
      `SELECT v.*, vr.registration_number, vr.registration_status,
              vr.registered_on, vr.expiry_date
       FROM traffic_vehicles v
       LEFT JOIN vehicle_registrations vr ON vr.vehicle_id = v.vehicle_id
       WHERE v.owner_user_id = ?
       ORDER BY v.created_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ vehicles: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/traffic/clearances/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ clearances: [] });
  try {
    const [rows] = await db.query(
      "SELECT * FROM licence_clearance_requests WHERE applicant_user_id = ? ORDER BY created_at DESC",
      [req.dbUser.user_id]
    );
    res.json({ clearances: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.get("/api/traffic/notifications", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ notifications: [] });
  try {
    const [rows] = await db.query(
      `SELECT * FROM traffic_notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.dbUser.user_id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE traffic_notifications SET read_at = NOW(), delivery_status = 'READ'
       WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.dbUser.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — citizen complaints
// ------------------------------------------------------------
app.post("/api/traffic/complaints", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.status(400).json({ error: "Register first" });
  const { application_id, complaint_type, subject, description } = req.body || {};
  if (!complaint_type || !subject || !description) {
    return res.status(400).json({ error: "complaint_type, subject and description are required" });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const ref = await generateTrafficComplaintReference(conn);
    const [result] = await conn.query(
      `INSERT INTO traffic_complaints
         (reference_number, user_id, application_id, complaint_type, subject, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ref, req.dbUser.user_id, application_id || null, complaint_type, subject, description]
    );
    await conn.commit();
    res.status(201).json({ success: true, complaintId: result.insertId, reference: ref });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message || "Failed to submit complaint" });
  } finally {
    conn.release();
  }
});

app.get("/api/traffic/complaints/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ complaints: [] });
  try {
    const [rows] = await db.query(
      "SELECT * FROM traffic_complaints WHERE user_id = ? ORDER BY created_at DESC",
      [req.dbUser.user_id]
    );
    res.json({ complaints: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// TRAFFIC — driving schools (public)
// ------------------------------------------------------------
app.get("/api/traffic/driving-schools", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `SELECT school_id, school_name, registration_number, address,
                      district, contact_phone, contact_email, school_status,
                      issue_date, expiry_date
               FROM driving_schools
               WHERE school_status = 'REGISTERED'`;
    const params = [];
    if (search) {
      sql += " AND (school_name LIKE ? OR registration_number LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY school_name";
    const [rows] = await db.query(sql, params);
    res.json({ schools: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// TRAFFIC — ADMIN endpoints
// ============================================================

// ------------------------------------------------------------
// ADMIN stats
// ------------------------------------------------------------
app.get("/api/traffic/admin/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM traffic_applications"
    );
    const [[{ pending }]] = await db.query(
      `SELECT COUNT(*) AS total FROM traffic_applications
        WHERE status IN ('SUBMITTED','UNDER_REVIEW','DOCUMENTS_REQUIRED',
                         'APPOINTMENT_REQUIRED','PAYMENT_PENDING','PROCESSING')`
    );
    const [[{ approved }]] = await db.query(
      `SELECT COUNT(*) AS total FROM traffic_applications
        WHERE status IN ('APPROVED','READY_FOR_COLLECTION','COMPLETED')`
    );
    const [[{ rejected }]] = await db.query(
      "SELECT COUNT(*) AS total FROM traffic_applications WHERE status = 'REJECTED'"
    );
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM traffic_applications GROUP BY status"
    );
    const [byType] = await db.query(
      "SELECT application_type, COUNT(*) AS count FROM traffic_applications GROUP BY application_type"
    );
    const [[finesAgg]] = await db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(amount), 0) AS total_amount
       FROM traffic_fines WHERE fine_status = 'UNPAID'`
    );
    const [[{ pendingClearances }]] = await db.query(
      `SELECT COUNT(*) AS total FROM licence_clearance_requests
        WHERE clearance_status IN ('PENDING','IN_PROGRESS')`
    );
    const [[{ openComplaints }]] = await db.query(
      `SELECT COUNT(*) AS total FROM traffic_complaints
        WHERE complaint_status IN ('OPEN','ASSIGNED','IN_REVIEW')`
    );

    res.json({
      byStatus,
      byType,
      totalApplications: total,
      pendingApplications: pending,
      approvedApplications: approved,
      rejectedApplications: rejected,
      unpaidFines: finesAgg.total,
      unpaidFinesAmount: Number(finesAgg.total_amount),
      pendingClearances,
      openComplaints
    });
  } catch (err) {
    console.error("Traffic admin stats error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// ADMIN applications queue (this is where admin sees licence apps etc.)
// ------------------------------------------------------------
app.get("/api/traffic/admin/applications", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, application_type } = req.query;
    let sql = `
      SELECT a.application_id, a.reference_number, a.application_type,
             a.title, a.description, a.status, a.urgency,
             a.submitted_at, a.updated_at, a.admin_notes,
             a.fee_amount, a.payment_status,
             c.category_name, c.category_code,
             u.user_id, u.full_name, u.email, u.phone, u.national_id, u.photo_path
      FROM traffic_applications a
      JOIN users u ON u.user_id = a.user_id
      JOIN traffic_service_categories c ON c.category_id = a.category_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    if (application_type) { sql += " AND a.application_type = ?"; params.push(application_type); }
    sql += " ORDER BY FIELD(a.urgency,'URGENT','HIGH','NORMAL','LOW'), a.submitted_at ASC";

    const [rows] = await db.query(sql, params);
    res.json({
      applications: rows.map(r => ({ ...r, photo_url: publicUrl(r.photo_path) }))
    });
  } catch (err) {
    console.error("Traffic admin applications error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// ADMIN update application status
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { newStatus, note } = req.body || {};
  const allowed = [
    "UNDER_REVIEW","DOCUMENTS_REQUIRED","APPOINTMENT_REQUIRED",
    "PAYMENT_PENDING","APPROVED","REJECTED","PROCESSING",
    "READY_FOR_COLLECTION","COMPLETED","CANCELLED"
  ];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!rows.length) throw new Error("Application not found");
    const app = rows[0];

    const isRejection = newStatus === "REJECTED";

    await conn.query(
      `UPDATE traffic_applications
         SET status = ?, admin_notes = COALESCE(?, admin_notes),
             rejection_reason = CASE WHEN ? THEN ? ELSE rejection_reason END,
             decision_at = CASE WHEN ? IN ('APPROVED','REJECTED','COMPLETED')
                                THEN NOW() ELSE decision_at END,
             assigned_admin_id = COALESCE(assigned_admin_id, ?)
       WHERE application_id = ?`,
      [
        newStatus,
        note || null,
        isRejection ? 1 : 0,
        isRejection ? (note || "Not specified") : null,
        newStatus,
        req.dbUser.user_id,
        req.params.id
      ]
    );

    await conn.query(
      `INSERT INTO traffic_status_history
        (application_id, old_status, new_status, changed_by, change_reason)
       VALUES (?, ?, ?, ?, ?)`,
      [app.application_id, app.status, newStatus, req.dbUser.user_id, note || null]
    );

    await conn.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', ?, ?)`,
      [
        app.user_id,
        app.application_id,
        "Application status updated",
        `Your application ${app.reference_number} is now: ${newStatus.replace(/_/g, " ")}.`
      ]
    );

    await conn.commit();

    await logAudit(
      req.dbUser.user_id,
      null,
      "TRAFFIC_STATUS_CHANGED",
      "traffic_applications",
      app.application_id,
      { from: app.status, to: newStatus, note },
      req.ip
    );

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// ADMIN record application payment
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/payment", verifyToken, requireAdmin, async (req, res) => {
  const { amount, payment_method, transaction_reference, payment_status } = req.body || {};
  if (!amount) return res.status(400).json({ error: "amount required" });

  try {
    const trx = transaction_reference || `TRF-${Date.now()}`;
    const [apps] = await db.query(
      "SELECT user_id FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Application not found" });

    const [result] = await db.query(
      `INSERT INTO traffic_payments
         (application_id, payer_user_id, payment_reference, amount,
          payment_method, payment_status, payment_purpose, paid_at, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Application fee', NOW(), NOW())`,
      [
        req.params.id,
        apps[0].user_id,
        trx,
        amount,
        payment_method || "CASH_OFFICE",
        payment_status || "SUCCESS"
      ]
    );

    if ((payment_status || "SUCCESS") === "SUCCESS") {
      await db.query(
        `UPDATE traffic_applications
           SET payment_status = 'PAID', fee_amount = ?
         WHERE application_id = ?`,
        [amount, req.params.id]
      );
    }

    res.status(201).json({ success: true, paymentId: result.insertId, reference: trx });
  } catch (err) {
    console.error("Traffic admin payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// ------------------------------------------------------------
// ADMIN issue a driver's licence
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/issue-licence", verifyToken, requireAdmin, async (req, res) => {
  const { licence_number, licence_category, issue_date, expiry_date } = req.body || {};
  if (!licence_number || !licence_category) {
    return res.status(400).json({ error: "licence_number and licence_category are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [apps] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!apps.length) throw new Error("Application not found");
    const app = apps[0];

    await conn.query(
      `INSERT INTO driver_licences
         (user_id, application_id, licence_number, licence_category,
          issue_date, expiry_date, licence_status, issuing_officer_id)
       VALUES (?, ?, ?, ?, ?, ?, 'VALID', ?)`,
      [
        app.user_id,
        app.application_id,
        licence_number,
        licence_category,
        issue_date || new Date(),
        expiry_date || null,
        req.dbUser.user_id
      ]
    );

    await conn.query(
      `UPDATE traffic_applications SET status = 'READY_FOR_COLLECTION' WHERE application_id = ?`,
      [app.application_id]
    );

    await conn.query(
      `INSERT INTO traffic_status_history
        (application_id, old_status, new_status, changed_by, change_reason)
       VALUES (?, ?, 'READY_FOR_COLLECTION', ?, ?)`,
      [app.application_id, app.status, req.dbUser.user_id, `Licence ${licence_number} issued`]
    );

    await conn.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', 'Licence ready for collection', ?)`,
      [
        app.user_id,
        app.application_id,
        `Your licence ${licence_number} is ready for collection.`
      ]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Traffic issue licence error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// ADMIN register a vehicle
// ------------------------------------------------------------
app.post("/api/traffic/admin/applications/:id/register-vehicle", verifyToken, requireAdmin, async (req, res) => {
  const {
    vin_or_chassis_number, make, model, manufacture_year,
    vehicle_type, colour, registration_number, expiry_date
  } = req.body || {};

  if (!vin_or_chassis_number || !make || !vehicle_type) {
    return res.status(400).json({ error: "vin_or_chassis_number, make and vehicle_type are required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [apps] = await conn.query(
      "SELECT * FROM traffic_applications WHERE application_id = ?",
      [req.params.id]
    );
    if (!apps.length) throw new Error("Application not found");
    const app = apps[0];

    const [vehicleResult] = await conn.query(
      `INSERT INTO traffic_vehicles
        (owner_user_id, vin_or_chassis_number, make, model, manufacture_year,
         vehicle_type, colour, ownership_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        app.user_id,
        vin_or_chassis_number,
        make,
        model || null,
        manufacture_year || null,
        vehicle_type,
        colour || null
      ]
    );
    const vehicleId = vehicleResult.insertId;

    const regNum = registration_number || `LE-${Date.now().toString().slice(-6)}`;

    await conn.query(
      `INSERT INTO vehicle_registrations
        (vehicle_id, application_id, registration_number, registration_type,
         registration_status, registered_on, expiry_date, processed_by)
       VALUES (?, ?, ?, 'NEW', 'ACTIVE', NOW(), ?, ?)`,
      [vehicleId, app.application_id, regNum, expiry_date || null, req.dbUser.user_id]
    );

    await conn.query(
      `UPDATE traffic_applications SET status = 'APPROVED' WHERE application_id = ?`,
      [app.application_id]
    );

    await conn.query(
      `INSERT INTO traffic_notifications
        (user_id, application_id, notification_type, title, message)
       VALUES (?, ?, 'APPLICATION_UPDATE', 'Vehicle registered', ?)`,
      [
        app.user_id,
        app.application_id,
        `Your vehicle has been registered with number plate ${regNum}.`
      ]
    );

    await conn.commit();
    res.json({ success: true, vehicleId, registrationNumber: regNum });
  } catch (err) {
    await conn.rollback();
    console.error("Traffic register vehicle error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ------------------------------------------------------------
// ADMIN fines list & mark paid
// ------------------------------------------------------------
app.get("/api/traffic/admin/fines", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = "SELECT * FROM traffic_fines WHERE 1 = 1";
    const params = [];
    if (status) { sql += " AND fine_status = ?"; params.push(status); }
    if (search) {
      sql += " AND (fine_reference LIKE ? OR offender_name LIKE ? OR vehicle_registration LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY offence_date DESC";
    const [rows] = await db.query(sql, params);
    res.json({ fines: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/fines/:id/payment", verifyToken, requireAdmin, async (req, res) => {
  const { payment_reference } = req.body || {};
  try {
    await db.query(
      `UPDATE traffic_fines
         SET fine_status = 'PAID', paid_at = NOW(), payment_reference = ?
       WHERE fine_id = ?`,
      [payment_reference || `PAY-${Date.now()}`, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// ADMIN complaints
// ------------------------------------------------------------
app.get("/api/traffic/admin/complaints", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, u.full_name, u.email
      FROM traffic_complaints c
      JOIN users u ON u.user_id = c.user_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND c.complaint_status = ?"; params.push(status); }
    sql += " ORDER BY c.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ complaints: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/complaints/:id/respond", verifyToken, requireAdmin, async (req, res) => {
  const { admin_response, complaint_status } = req.body || {};
  if (!admin_response) return res.status(400).json({ error: "admin_response required" });
  try {
    await db.query(
      `UPDATE traffic_complaints
         SET admin_response = ?, complaint_status = ?,
             resolved_at = CASE WHEN ? IN ('RESOLVED','CLOSED') THEN NOW() ELSE resolved_at END,
             assigned_to = COALESCE(assigned_to, ?)
       WHERE complaint_id = ?`,
      [admin_response, complaint_status || "IN_REVIEW",
       complaint_status || "IN_REVIEW", req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// ADMIN clearances
// ------------------------------------------------------------
app.get("/api/traffic/admin/clearances", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, u.full_name, u.email, u.phone
      FROM licence_clearance_requests c
      JOIN users u ON u.user_id = c.applicant_user_id
      WHERE 1 = 1
    `;
    const params = [];
    if (status) { sql += " AND c.clearance_status = ?"; params.push(status); }
    sql += " ORDER BY c.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ clearances: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/clearances/:id/update", verifyToken, requireAdmin, async (req, res) => {
  const { clearance_status, notes } = req.body || {};
  try {
    await db.query(
      `UPDATE licence_clearance_requests
         SET clearance_status = COALESCE(?, clearance_status),
             notes = COALESCE(?, notes),
             cleared_at = CASE WHEN ? = 'CLEARED' THEN NOW() ELSE cleared_at END,
             cleared_by = CASE WHEN ? = 'CLEARED' THEN ? ELSE cleared_by END
       WHERE clearance_id = ?`,
      [clearance_status || null, notes || null,
       clearance_status || null, clearance_status || null,
       req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// ADMIN driving schools
// ------------------------------------------------------------
app.get("/api/traffic/admin/driving-schools", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT * FROM driving_schools WHERE 1 = 1";
    const params = [];
    if (status) { sql += " AND school_status = ?"; params.push(status); }
    sql += " ORDER BY school_name";
    const [rows] = await db.query(sql, params);
    res.json({ schools: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/traffic/admin/driving-schools/:id/status", verifyToken, requireAdmin, async (req, res) => {
  const { school_status, issue_date, expiry_date } = req.body || {};
  try {
    await db.query(
      `UPDATE driving_schools
         SET school_status = COALESCE(?, school_status),
             issue_date = COALESCE(?, issue_date),
             expiry_date = COALESCE(?, expiry_date),
             reviewed_by = ?
       WHERE school_id = ?`,
      [school_status || null, issue_date || null, expiry_date || null,
       req.dbUser.user_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ------------------------------------------------------------
// ADMIN audit log
// ------------------------------------------------------------
app.get("/api/traffic/admin/audit", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.firebase_uid = al.user_id
       WHERE al.entity_type = 'traffic_applications'
          OR al.action LIKE 'TRAFFIC%'
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error("Traffic audit error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

console.log("✅ Traffic module routes registered");

// ============================================================
// TRAFFIC - ADDITIONAL ENDPOINTS
// Add these to your Server.js file
// ============================================================

// Get application detail for admin
app.get("/api/traffic/admin/applications/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [apps] = await db.query(
      `SELECT a.*, u.full_name, u.email, u.phone, u.national_id, u.photo_path,
              c.category_name
       FROM traffic_applications a
       JOIN users u ON u.user_id = a.user_id
       JOIN traffic_service_categories c ON c.category_id = a.category_id
       WHERE a.application_id = ?`,
      [req.params.id]
    );
    if (!apps.length) return res.status(404).json({ error: "Not found" });

    const app = apps[0];
    
    const [values] = await db.query(
      "SELECT field_key, field_value FROM traffic_application_values WHERE application_id = ?",
      [app.application_id]
    );
    const [documents] = await db.query(
      `SELECT document_id, document_type, original_filename, storage_path,
              mime_type, file_size_bytes, verification_status, uploaded_at
       FROM traffic_application_documents WHERE application_id = ?`,
      [app.application_id]
    );

    res.json({
      application: { ...app, photo_url: publicUrl(app.photo_path) },
      values,
      documents
    });
  } catch (err) {
    console.error("Traffic admin app detail error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Get my payments (citizen)
app.get("/api/traffic/payments/my", verifyToken, async (req, res) => {
  if (!req.dbUser) return res.json({ payments: [] });
  try {
    const [rows] = await db.query(
      `SELECT payment_id, payment_reference, amount, currency, payment_method,
              payment_status, payment_purpose, paid_at, created_at
       FROM traffic_payments
       WHERE payer_user_id = ?
       ORDER BY created_at DESC`,
      [req.dbUser.user_id]
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error("Traffic my payments error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Admin payments list
app.get("/api/traffic/admin/payments", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.full_name AS payer_name, u.email AS payer_email
       FROM traffic_payments p
       JOIN users u ON u.user_id = p.payer_user_id
       ORDER BY p.created_at DESC
       LIMIT 500`
    );
    res.json({ payments: rows });
  } catch (err) {
    console.error("Traffic admin payments error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Test bookings list
app.get("/api/traffic/admin/test-bookings", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT tb.*, u.full_name AS applicant_name, u.email AS applicant_email,
              ta.reference_number
       FROM driving_test_bookings tb
       JOIN users u ON u.user_id = tb.applicant_user_id
       JOIN traffic_applications ta ON ta.application_id = tb.application_id
       ORDER BY tb.scheduled_at ASC`
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error("Traffic test bookings error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// Instructors list
app.get("/api/traffic/admin/instructors", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT di.*, ds.school_name, u.full_name AS user_name
       FROM driving_instructors di
       LEFT JOIN driving_schools ds ON ds.school_id = di.school_id
       LEFT JOIN users u ON u.user_id = di.user_id
       ORDER BY di.created_at DESC`
    );
    res.json({ instructors: rows });
  } catch (err) {
    console.error("Traffic instructors error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("");
  console.log("====================================================");
  console.log("Lesotho Government Services API");
  console.log("====================================================");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin email: ${ADMIN_EMAIL}`);
  console.log(`Stamp loaded: ${fs.existsSync(POLICE_STAMP_PATH) ? "yes" : "NO (missing police_stamp.png)"}`);
  console.log("====================================================");
});

process.on("SIGINT", async () => { await db.end(); process.exit(0); });
process.on("SIGTERM", async () => { await db.end(); process.exit(0); });