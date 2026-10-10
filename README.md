# 📘 Lesotho Integrated Government Services System

**Project:** Integrated Government Services System for Lesotho  
**Course:** BIHC3110 — Human Computer Interaction  
**Institution:** Limkokwing University of Creative Technology — Lesotho  
**Team:** 5 members

---

## 📖 Table of Contents

1. [What This Project Is](#what-this-project-is)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Prerequisites](#prerequisites)
5. [First-Time Setup](#first-time-setup)
6. [How to Run the Project](#how-to-run-the-project)
7. [Database Setup](#database-setup)
8. [Firebase Setup](#firebase-setup)
9. [Admin Account](#admin-account)
10. [Project Structure](#project-structure)
11. [What's Built So Far](#whats-built-so-far)
12. [Feature Guide](#feature-guide)
13. [API Reference](#api-reference)
14. [Git Workflow](#git-workflow)
15. [Troubleshooting](#troubleshooting)
16. [Security Notes](#security-notes)
17. [What's Coming Next](#whats-coming-next)

---

## What This Project Is

An **Integrated Digital Public Service System** for Lesotho that connects:

- 🏛️ **Home Affairs** (NICR, Immigration, LRMIS)
- 🛂 **Passport Services** (applications, tracking, collection)
- 🚗 **Traffic** (driver's licences, vehicle registration)
- 💰 **Finance** (payments, tax refunds, procurement)
- 👴 **Pensions** (beneficiary verification, payments)
- 🚔 **Police** (non-emergency reporting, case management)

**Core concept:** One verified citizen profile, reused across all government services — no more resubmitting the same documents to different departments.

### What's Built So Far

- ✅ **Complete authentication** (Email, Google, Phone OTP)
- ✅ **Auto-assigned National IDs** (`LS########`)
- ✅ **Home Affairs module** (NICR, Immigration, LRMIS)
  - Service catalogue loaded from database
  - Dynamic application forms per service
  - Document uploads
  - Application tracking & notifications
  - Real-looking certificates and IDs
  - **PDF export** of certificates
  - **Profile photo upload** (shows on ID card and certificates)
- ✅ **Admin dashboard** for reviewing and processing applications
- ✅ **Citizen dashboard** with cards, tabs, and profile

---

## Tech Stack

### Frontend
- **React** (Create React App)
- **React Router** for navigation
- **Firebase Auth** (Email/Password, Google, Phone OTP)
- **jsPDF + html2canvas** (certificate PDF export)
- Inline CSS with Lesotho flag colors

### Backend
- **Node.js + Express** (single-file server: `Server.js`)
- **MySQL** for all data (users, applications, services, documents, audit logs)
- **Firebase Admin SDK** for verifying ID tokens
- **Multer** for file uploads (documents + photos)

### Auth
- **Firebase Authentication** handles login/registration
- **MySQL** stores profile data linked by `firebase_uid`

### Database
- Single database: `lesotho_gov`
- 25+ tables covering users, applications, documents, services, form fields, and module-specific data

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React @ localhost:3000)                          │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │ Citizen Dashboard   │  │ Admin Dashboard             │  │
│  │ • Apply for services│  │ • Review applications       │  │
│  │ • Track applications│  │ • Update statuses           │  │
│  │ • Upload photo      │  │ • View applicant photos     │  │
│  │ • Download PDFs     │  │                             │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    │ Firebase ID token in Authorization header
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Express @ localhost:3001)                         │
│  • /api/register, /api/login, /api/me                       │
│  • /api/services, /api/services/:id                         │
│  • /api/applications (POST, GET, GET my)                    │
│  • /api/me/photo (upload)                                   │
│  • /api/certificates/:id (fetch for PDF)                    │
│  • /api/admin/* (admin only)                                │
│  • /uploads/* (static files)                                │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  MYSQL (lesotho_gov)                                        │
│  • users, citizen_national_ids                              │
│  • applications, application_field_values, documents        │
│  • service_catalog, service_form_fields                     │
│  • civil_records, immigration_applications, livestock_*     │
│  • notifications, audit_logs, application_status_history    │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Install these on your machine **before** pulling the repo:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org/ |
| npm | Comes with Node | — |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| MySQL Workbench | Latest | https://dev.mysql.com/downloads/workbench/ |
| Git | Latest | https://git-scm.com/ |
| VS Code | Latest | https://code.visualstudio.com/ |

---

## First-Time Setup

Follow these steps **exactly in order** the first time you clone the repo.

### Step 1: Clone the repository

```bash
git clone https://github.com/Boni-01/home-affairs.git
cd home-affairs
```

### Step 2: Install frontend dependencies

```bash
cd frontend
npm install
npm install jspdf html2canvas
```

### Step 3: Install backend dependencies

```bash
cd ../backend
npm install express cors dotenv mysql2 firebase-admin multer
```

### Step 4: Get the secret files from the team lead

Two files are **NOT in Git** (security reasons). Ask the team lead to send them privately (WhatsApp DM, Discord DM, or Google Drive — never in the group chat):

1. **`.env`** — Backend environment variables
2. **`FirebaseAccountKey.json`** — Firebase Admin SDK key

Place both files inside the **`backend/`** folder:

```
backend/
├── Server.js
├── package.json
├── .env                        ← add this
├── FirebaseAccountKey.json     ← add this
└── node_modules/
```

### Step 5: Set up MySQL database

See the [Database Setup](#database-setup) section below — it contains the **full SQL** you need to run.

### Step 6: Run both servers

See the [How to Run the Project](#how-to-run-the-project) section below.

---

## How to Run the Project

You need **three things running at the same time**:

| # | What | Where | Port |
|---|---|---|---|
| 1 | MySQL server | Background service | 3306 |
| 2 | Backend API | Terminal 1 | 3001 |
| 3 | Frontend | Terminal 2 | 3000 |

### Terminal 1 — Backend

```bash
cd backend
npm start
```

Expected output:

```
◇ injected env (7) from .env
Firebase Admin initialized
MySQL connected → lesotho_gov
====================================================
Lesotho Government Services API
====================================================
Server running on http://localhost:3001
Admin email: kramohlabi7@gmail.com
====================================================
```

### Terminal 2 — Frontend

```bash
cd frontend
npm start
```

Expected output:

```
Compiled successfully!
Local: http://localhost:3000
```

### Verify everything works

Open in your browser:
- **Frontend:** http://localhost:3000
- **Backend health check:** http://localhost:3001/api/health

The health check should return:

```json
{ "status": "ok", "db": "connected", "firebase": "connected" }
```

---

## Database Setup

### Step 1: Start MySQL

**If using XAMPP:** Open XAMPP Control Panel → Click **Start** next to MySQL.

**If using MySQL service (Windows):**

```bash
net start MySQL80
```

**If using MySQL service (Mac):**

```bash
brew services start mysql
```

### Step 2: Run the Complete SQL Schema

Open **MySQL Workbench** or **Command Prompt** and run the following SQL.

**Option A — Save as file and run from CLI:**

Save the SQL below as `backend/database/lesotho_gov_complete.sql`, then:

```bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
```

**Option B — Copy/paste directly into MySQL Workbench:**

Open Workbench → connect to your local MySQL → paste the SQL below → click the lightning bolt ⚡.

### 📄 Complete SQL Schema

```sql
-- ============================================================
-- LESOTHO INTEGRATED GOVERNMENT SERVICES
-- COMPLETE DATABASE — Single file, single database
-- ============================================================
-- WARNING: This DROPS the existing lesotho_gov database and
-- rebuilds it from scratch. No user data is preserved.
-- ============================================================

DROP DATABASE IF EXISTS lesotho_gov;
CREATE DATABASE lesotho_gov
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE lesotho_gov;

-- ============================================================
-- SECTION 1: USERS & AUTHENTICATION
-- ============================================================

-- 1.1 Users (main login table)
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),
    national_id VARCHAR(50) UNIQUE,
    photo_path VARCHAR(500) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'firebase-managed',
    account_type ENUM('citizen','officer','admin') NOT NULL DEFAULT 'citizen',
    role ENUM('admin','client') NOT NULL DEFAULT 'client',
    admin_guard TINYINT
        GENERATED ALWAYS AS (
            CASE WHEN role = 'admin' THEN 1 ELSE NULL END
        ) STORED UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    account_verified BOOLEAN DEFAULT FALSE,
    account_status ENUM('active','suspended','inactive') DEFAULT 'active',
    status ENUM('active','suspended','inactive') DEFAULT 'active',
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_firebase_uid (firebase_uid)
);

-- 1.2 Citizen profiles (legacy support)
CREATE TABLE citizen_profiles (
    citizen_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    national_id VARCHAR(30) UNIQUE,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender ENUM('male','female','other'),
    nationality VARCHAR(50) DEFAULT 'Lesotho',
    marital_status VARCHAR(30),
    phone VARCHAR(30),
    email VARCHAR(255),
    verification_status ENUM('pending','verified') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 1.3 Permanent National ID registry (auto-generated LS########)
CREATE TABLE citizen_national_ids (
    national_id_pk BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    national_id_number VARCHAR(20) NOT NULL UNIQUE,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 1.4 Officers (for future use)
CREATE TABLE officers (
    officer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    employee_number VARCHAR(30) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(30),
    position VARCHAR(100),
    department_id BIGINT UNSIGNED,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 1.5 OTP verifications log
CREATE TABLE otp_verifications (
    otp_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128),
    phone VARCHAR(30),
    purpose ENUM('registration','login','reset') DEFAULT 'registration',
    channel ENUM('sms','email') DEFAULT 'sms',
    status ENUM('pending','verified','expired','blocked') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 Audit logs
CREATE TABLE audit_logs (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128),
    application_id BIGINT UNSIGNED,
    action VARCHAR(100),
    table_name VARCHAR(100),
    entity_type VARCHAR(100),
    record_id BIGINT UNSIGNED,
    entity_id BIGINT UNSIGNED,
    old_value JSON,
    new_value JSON,
    details JSON,
    ip_address VARCHAR(45),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_application (application_id)
);

-- 1.7 Login history
CREATE TABLE login_history (
    login_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128),
    login_time DATETIME,
    logout_time DATETIME,
    ip_address VARCHAR(45),
    device VARCHAR(255),
    success BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- SECTION 2: GOVERNMENT STRUCTURE
-- ============================================================

-- 2.1 Departments
CREATE TABLE departments (
    department_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_code VARCHAR(20) UNIQUE NOT NULL,
    department_name VARCHAR(120) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (department_code, department_name, description) VALUES
  ('HOME_AFFAIRS', 'Ministry of Home Affairs', 'Identity, civil registration, immigration and citizenship services'),
  ('PASSPORT',     'Passport Services',         'Passport and travel document services'),
  ('TRAFFIC',      'Traffic and Transport',     'Driver licences, vehicle registration and roadworthiness'),
  ('FINANCE',      'Ministry of Finance',       'Payments, tax refunds and procurement'),
  ('PENSIONS',     'Pensions',                  'Public officer and old age pension services'),
  ('POLICE',       'Lesotho Mounted Police Service', 'Non-emergency reporting and police clearance');

-- ============================================================
-- SECTION 3: SERVICE CATALOGUE (configuration)
-- ============================================================

-- 3.1 Service catalogue
CREATE TABLE service_catalog (
    service_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(40) NOT NULL UNIQUE,
    module ENUM('NICR','IMMIGRATION','LRMIS') NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    processing_days INT NOT NULL DEFAULT 7,
    requires_appointment TINYINT(1) NOT NULL DEFAULT 0,
    requires_physical_visit TINYINT(1) NOT NULL DEFAULT 0,
    requires_payment TINYINT(1) NOT NULL DEFAULT 1,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------- NICR services --------
INSERT INTO service_catalog
    (service_code, module, service_name, description, fee_amount, processing_days, requires_appointment, requires_payment) VALUES
('NICR_BIRTH_REG',    'NICR', 'Birth registration',              'Register a new birth', 30.00, 7, 0, 1),
('NICR_BIRTH_CERT',   'NICR', 'Birth certificate',               'Apply for a certified copy of a birth record', 30.00, 5, 0, 1),
('NICR_LATE_BIRTH',   'NICR', 'Late birth registration',         'Register a birth after the standard period', 60.00, 14, 1, 1),
('NICR_DEATH_REG',    'NICR', 'Death registration',              'Register a death', 30.00, 5, 0, 1),
('NICR_DEATH_CERT',   'NICR', 'Death certificate',               'Apply for a certified copy of a death record', 30.00, 5, 0, 1),
('NICR_ID_NEW',       'NICR', 'National ID — new',               'Apply for a first national identity card', 50.00, 21, 1, 1),
('NICR_ID_RENEW',     'NICR', 'National ID — renewal',           'Renew or replace an existing national ID', 50.00, 14, 1, 1),
('NICR_ID_LOST',      'NICR', 'National ID — lost or damaged',   'Report a lost or damaged ID and request a replacement', 50.00, 14, 1, 1),
('NICR_ID_CORRECT',   'NICR', 'National ID — correction',        'Request correction of details on your ID', 30.00, 14, 0, 1),
('NICR_NAME_CHANGE',  'NICR', 'Name or surname change',          'Request a change to your name or surname on record', 60.00, 21, 1, 1),
('NICR_MARRIAGE_REG', 'NICR', 'Marriage registration',           'Register a marriage', 40.00, 7, 0, 1),
('NICR_MARRIAGE_CERT','NICR', 'Marriage certificate',            'Apply for a marriage certificate', 30.00, 5, 0, 1),
('NICR_CIVIL_AMEND',  'NICR', 'Civil record amendment',          'Request an amendment to a civil record', 60.00, 21, 1, 1),
('NICR_VERIFY',       'NICR', 'Verify a record',                 'Request verification of a Home Affairs record', 20.00, 5, 0, 1);

-- -------- Immigration services --------
INSERT INTO service_catalog
    (service_code, module, service_name, description, fee_amount, processing_days, requires_appointment, requires_payment) VALUES
('IMM_VISA',          'IMMIGRATION', 'Visa application',                    'Apply for a Lesotho visa', 100.00, 21, 0, 1),
('IMM_RESIDENCE',     'IMMIGRATION', 'Residence permit',                    'Apply for a residence permit', 200.00, 30, 1, 1),
('IMM_STUDY',         'IMMIGRATION', 'Study permit',                        'Apply for a study permit', 150.00, 30, 0, 1),
('IMM_BUSINESS',      'IMMIGRATION', 'Business permit',                     'Apply for a business permit', 300.00, 45, 1, 1),
('IMM_MISSIONARY',    'IMMIGRATION', 'Missionary permit',                   'Apply for a missionary permit', 150.00, 30, 0, 1),
('IMM_RELATIVE',      'IMMIGRATION', 'Permit to join a relative',           'Apply for a permit to join a relative', 150.00, 30, 0, 1),
('IMM_SPOUSE',        'IMMIGRATION', 'Spouse-related permit',               'Apply for a spouse-related permit', 150.00, 30, 0, 1),
('IMM_INDEFINITE',    'IMMIGRATION', 'Indefinite residence permit',         'Apply for eligible indefinite residence', 400.00, 60, 1, 1),
('IMM_CITIZENSHIP',   'IMMIGRATION', 'Citizenship by registration',         'Apply for citizenship', 500.00, 90, 1, 1),
('IMM_RESTORE',       'IMMIGRATION', 'Restoration of citizenship',          'Apply for restoration of citizenship', 300.00, 60, 1, 1);

-- -------- LRMIS services --------
INSERT INTO service_catalog
    (service_code, module, service_name, description, fee_amount, processing_days, requires_appointment, requires_payment) VALUES
('LRMIS_OWNER_REG',   'LRMIS', 'Register as livestock owner',     'Register a livestock owner record', 0.00, 7, 0, 0),
('LRMIS_ANIMAL_REG',  'LRMIS', 'Register livestock',              'Register eligible livestock', 0.00, 7, 0, 0),
('LRMIS_OWNERSHIP',   'LRMIS', 'Submit ownership information',    'Provide livestock ownership details', 0.00, 5, 0, 0),
('LRMIS_BRAND',       'LRMIS', 'Request branding or marking',     'Request branding or marking', 0.00, 14, 1, 0),
('LRMIS_MARKING_ID',  'LRMIS', 'Livestock identification',        'Submit identification details', 0.00, 7, 0, 0),
('LRMIS_CORRECT',     'LRMIS', 'Correct livestock records',       'Request a correction', 0.00, 10, 0, 0),
('LRMIS_OWNER_CHANGE','LRMIS', 'Report change in ownership',      'Report a change in livestock ownership', 0.00, 7, 0, 0),
('LRMIS_MARKING_REP', 'LRMIS', 'Replace or correct a mark',       'Request marking replacement or correction', 0.00, 14, 0, 0),
('LRMIS_MISSING',     'LRMIS', 'Report missing or stolen stock',  'Report missing or stolen livestock', 0.00, 3, 0, 0),
('LRMIS_VERIFY',      'LRMIS', 'Confirm livestock registration',  'Request confirmation of registration', 0.00, 7, 0, 0);

-- 3.2 Form fields per service (dynamic forms)
CREATE TABLE service_form_fields (
    field_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(60) NOT NULL,
    label VARCHAR(200) NOT NULL,
    field_type ENUM('text','number','date','select','textarea','email','tel') NOT NULL,
    options_json JSON,
    required TINYINT(1) NOT NULL DEFAULT 1,
    help_text VARCHAR(255),
    placeholder VARCHAR(150),
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (service_id) REFERENCES service_catalog(service_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_service_field (service_id, field_key)
);

-- -------- NICR: Birth registration --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_BIRTH_REG');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'child_first_name','Child first name','text',NULL,1,1),
(@sid,'child_middle_name','Child middle name','text',NULL,0,2),
(@sid,'child_last_name','Child last name','text',NULL,1,3),
(@sid,'child_gender','Gender','select',JSON_ARRAY('Male','Female'),1,4),
(@sid,'child_dob','Date of birth','date',NULL,1,5),
(@sid,'place_of_birth','Place of birth','text',NULL,1,6),
(@sid,'district','District','text',NULL,1,7),
(@sid,'mother_full_name','Mother full name','text',NULL,1,8),
(@sid,'mother_national_id','Mother National ID','text',NULL,0,9),
(@sid,'father_full_name','Father full name','text',NULL,0,10),
(@sid,'father_national_id','Father National ID','text',NULL,0,11),
(@sid,'informant_name','Informant name','text',NULL,1,12),
(@sid,'informant_relationship','Informant relationship','text',NULL,1,13);

-- -------- NICR: Birth certificate --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_BIRTH_CERT');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'certificate_holder_name','Certificate holder name','text',NULL,1,1),
(@sid,'holder_date_of_birth','Holder date of birth','date',NULL,1,2),
(@sid,'holder_place_of_birth','Holder place of birth','text',NULL,1,3),
(@sid,'parent_names','Parent names','text',NULL,0,4),
(@sid,'reason_for_request','Reason for request','textarea',NULL,1,5);

-- -------- NICR: National ID — new --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_ID_NEW');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'surname','Surname','text',NULL,1,1),
(@sid,'first_names','First names','text',NULL,1,2),
(@sid,'gender','Gender','select',JSON_ARRAY('Male','Female'),1,3),
(@sid,'date_of_birth','Date of birth','date',NULL,1,4),
(@sid,'place_of_birth','Place of birth','text',NULL,1,5),
(@sid,'district','District','text',NULL,1,6),
(@sid,'village','Village / Town','text',NULL,1,7),
(@sid,'marital_status','Marital status','select',JSON_ARRAY('Single','Married','Divorced','Widowed'),1,8),
(@sid,'occupation','Occupation','text',NULL,0,9),
(@sid,'father_full_name','Father full name','text',NULL,0,10),
(@sid,'mother_full_name','Mother full name','text',NULL,0,11);

-- -------- NICR: National ID — renewal --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_ID_RENEW');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'current_national_id','Current National ID number','text',NULL,1,1),
(@sid,'reason_for_renewal','Reason for renewal','select',JSON_ARRAY('Expired','Lost','Damaged','Detail change'),1,2),
(@sid,'full_name','Full name','text',NULL,1,3),
(@sid,'date_of_birth','Date of birth','date',NULL,1,4);

-- -------- NICR: National ID — lost --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_ID_LOST');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'previous_national_id','Previous National ID','text',NULL,1,1),
(@sid,'incident_type','Incident type','select',JSON_ARRAY('Lost','Stolen','Damaged'),1,2),
(@sid,'incident_date','Incident date','date',NULL,1,3),
(@sid,'incident_description','Description of incident','textarea',NULL,1,4),
(@sid,'police_case_number','Police case number (if any)','text',NULL,0,5);

-- -------- NICR: ID — correction --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_ID_CORRECT');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'national_id','National ID number','text',NULL,1,1),
(@sid,'correction_type','Correction type','select',JSON_ARRAY('Name spelling','Date of birth','Gender','Place of birth','Other'),1,2),
(@sid,'current_value','Current (incorrect) value','text',NULL,1,3),
(@sid,'correct_value','Correct value','text',NULL,1,4),
(@sid,'explanation','Explanation','textarea',NULL,1,5);

-- -------- NICR: Name change --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_NAME_CHANGE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'national_id','National ID number','text',NULL,1,1),
(@sid,'current_name','Current name','text',NULL,1,2),
(@sid,'new_name','New name','text',NULL,1,3),
(@sid,'reason','Reason for name change','textarea',NULL,1,4);

-- -------- NICR: Death registration --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_DEATH_REG');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'deceased_full_name','Deceased full name','text',NULL,1,1),
(@sid,'deceased_national_id','Deceased National ID','text',NULL,0,2),
(@sid,'deceased_dob','Date of birth','date',NULL,0,3),
(@sid,'date_of_death','Date of death','date',NULL,1,4),
(@sid,'place_of_death','Place of death','text',NULL,1,5),
(@sid,'cause_of_death','Cause of death','text',NULL,0,6),
(@sid,'informant_name','Informant name','text',NULL,1,7),
(@sid,'informant_relationship','Relationship to deceased','text',NULL,1,8);

-- -------- NICR: Death certificate --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_DEATH_CERT');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'deceased_full_name','Deceased full name','text',NULL,1,1),
(@sid,'date_of_death','Date of death','date',NULL,1,2),
(@sid,'certificate_holder_name','Certificate holder name','text',NULL,1,3),
(@sid,'reason_for_request','Reason for request','textarea',NULL,1,4);

-- -------- NICR: Marriage registration --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_MARRIAGE_REG');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'spouse_one_name','Spouse 1 full name','text',NULL,1,1),
(@sid,'spouse_one_national_id','Spouse 1 National ID','text',NULL,1,2),
(@sid,'spouse_two_name','Spouse 2 full name','text',NULL,1,3),
(@sid,'spouse_two_national_id','Spouse 2 National ID','text',NULL,1,4),
(@sid,'marriage_date','Marriage date','date',NULL,1,5),
(@sid,'marriage_place','Marriage place','text',NULL,1,6);

-- -------- NICR: Marriage certificate --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_MARRIAGE_CERT');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'certificate_holder_name','Certificate holder name','text',NULL,1,1),
(@sid,'marriage_date','Marriage date','date',NULL,1,2),
(@sid,'spouse_name','Spouse full name','text',NULL,1,3),
(@sid,'reason_for_request','Reason for request','textarea',NULL,1,4);

-- -------- NICR: Record verification --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_VERIFY');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'record_type','Record type','select',JSON_ARRAY('Birth','Death','Marriage','National ID'),1,1),
(@sid,'record_number','Record number','text',NULL,1,2),
(@sid,'subject_full_name','Subject full name','text',NULL,1,3),
(@sid,'verification_purpose','Purpose of verification','textarea',NULL,1,4);

-- -------- NICR: Civil amendment --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_CIVIL_AMEND');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'record_type','Record type','select',JSON_ARRAY('Birth','Death','Marriage'),1,1),
(@sid,'record_number','Record number','text',NULL,1,2),
(@sid,'amendment_details','Amendment details','textarea',NULL,1,3),
(@sid,'reason','Reason','textarea',NULL,1,4);

-- -------- NICR: Late birth --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'NICR_LATE_BIRTH');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'child_full_name','Child full name','text',NULL,1,1),
(@sid,'child_dob','Date of birth','date',NULL,1,2),
(@sid,'place_of_birth','Place of birth','text',NULL,1,3),
(@sid,'parent_names','Parent names','text',NULL,1,4),
(@sid,'reason_for_late','Reason for late registration','textarea',NULL,1,5);

-- -------- Immigration: Visa --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_VISA');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name (as on passport)','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'nationality','Nationality','text',NULL,1,3),
(@sid,'date_of_birth','Date of birth','date',NULL,1,4),
(@sid,'visa_category','Visa category','select',JSON_ARRAY('Tourist','Business','Transit','Student','Work'),1,5),
(@sid,'purpose_of_visit','Purpose of visit','textarea',NULL,1,6),
(@sid,'intended_arrival','Intended arrival date','date',NULL,1,7),
(@sid,'intended_departure','Intended departure date','date',NULL,1,8);

-- -------- Immigration: Residence permit --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_RESIDENCE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'nationality','Nationality','text',NULL,1,3),
(@sid,'date_of_birth','Date of birth','date',NULL,1,4),
(@sid,'permit_category','Permit category','select',JSON_ARRAY('Work','Study','Family','Investment','Other'),1,5),
(@sid,'employer_or_institution','Employer / institution','text',NULL,0,6),
(@sid,'residential_address','Residential address','textarea',NULL,1,7),
(@sid,'intended_stay_start','Intended stay start','date',NULL,1,8),
(@sid,'intended_stay_end','Intended stay end','date',NULL,0,9);

-- -------- Immigration: Study permit --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_STUDY');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'nationality','Nationality','text',NULL,1,3),
(@sid,'institution_name','Institution name','text',NULL,1,4),
(@sid,'course_name','Course name','text',NULL,1,5),
(@sid,'course_start','Course start date','date',NULL,1,6),
(@sid,'course_end','Course end date','date',NULL,1,7),
(@sid,'residential_address','Residential address','textarea',NULL,1,8);

-- -------- Immigration: Business permit --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_BUSINESS');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'nationality','Nationality','text',NULL,1,3),
(@sid,'business_name','Business name','text',NULL,1,4),
(@sid,'business_type','Business type','text',NULL,1,5),
(@sid,'business_address','Business address','textarea',NULL,1,6),
(@sid,'investment_amount','Investment amount (LSL)','number',NULL,0,7);

-- -------- Immigration: Citizenship --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_CITIZENSHIP');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'current_nationality','Current nationality','text',NULL,1,2),
(@sid,'date_of_birth','Date of birth','date',NULL,1,3),
(@sid,'place_of_birth','Place of birth','text',NULL,1,4),
(@sid,'reason_for_application','Reason for application','textarea',NULL,1,5),
(@sid,'years_residing','Years residing in Lesotho','number',NULL,0,6);

-- -------- Immigration: Restoration --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_RESTORE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'previous_citizenship_number','Previous citizenship number','text',NULL,0,2),
(@sid,'date_of_birth','Date of birth','date',NULL,1,3),
(@sid,'reason_for_restoration','Reason for restoration','textarea',NULL,1,4);

-- -------- Immigration: Missionary --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_MISSIONARY');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'nationality','Nationality','text',NULL,1,3),
(@sid,'religious_organization','Religious organization','text',NULL,1,4),
(@sid,'purpose','Purpose','textarea',NULL,1,5);

-- -------- Immigration: Relative --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_RELATIVE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'relative_name','Relative name in Lesotho','text',NULL,1,3),
(@sid,'relative_national_id','Relative National ID','text',NULL,1,4),
(@sid,'relationship','Relationship','text',NULL,1,5);

-- -------- Immigration: Spouse --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_SPOUSE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'spouse_name','Spouse name in Lesotho','text',NULL,1,3),
(@sid,'spouse_national_id','Spouse National ID','text',NULL,1,4),
(@sid,'marriage_date','Marriage date','date',NULL,1,5);

-- -------- Immigration: Indefinite residence --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'IMM_INDEFINITE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'full_name','Full name','text',NULL,1,1),
(@sid,'passport_number','Passport number','text',NULL,1,2),
(@sid,'nationality','Nationality','text',NULL,1,3),
(@sid,'years_residing','Years residing in Lesotho','number',NULL,1,4),
(@sid,'reason','Reason for application','textarea',NULL,1,5);

-- -------- LRMIS: Register owner --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_OWNER_REG');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'owner_type','Owner type','select',JSON_ARRAY('Individual','Company','Association','Institution'),1,1),
(@sid,'full_name','Full name / Entity name','text',NULL,1,2),
(@sid,'national_id','National ID','text',NULL,0,3),
(@sid,'district','District','text',NULL,1,4),
(@sid,'community_or_village','Community / village','text',NULL,1,5),
(@sid,'physical_address','Physical address','textarea',NULL,1,6);

-- -------- LRMIS: Register animal --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_ANIMAL_REG');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'owner_registration_number','Owner registration number','text',NULL,1,1),
(@sid,'animal_reference','Animal reference','text',NULL,1,2),
(@sid,'species','Species','select',JSON_ARRAY('Cattle','Sheep','Goat','Horse','Donkey','Other'),1,3),
(@sid,'sex','Sex','select',JSON_ARRAY('Male','Female','Unknown'),1,4),
(@sid,'breed','Breed','text',NULL,0,5),
(@sid,'date_of_birth','Date of birth','date',NULL,0,6),
(@sid,'colour','Colour','text',NULL,0,7),
(@sid,'location','Location','text',NULL,1,8);

-- -------- LRMIS: Ownership info --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_OWNERSHIP');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'owner_registration_number','Owner registration number','text',NULL,1,2),
(@sid,'ownership_notes','Ownership notes','textarea',NULL,0,3);

-- -------- LRMIS: Branding --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_BRAND');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'mark_description','Mark description','textarea',NULL,1,2),
(@sid,'species','Species','select',JSON_ARRAY('Cattle','Sheep','Goat','Horse','Donkey','Other'),1,3),
(@sid,'preferred_date','Preferred date','date',NULL,0,4);

-- -------- LRMIS: Marking ID --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_MARKING_ID');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'species','Species','select',JSON_ARRAY('Cattle','Sheep','Goat','Horse','Donkey','Other'),1,2),
(@sid,'identification_details','Identification details','textarea',NULL,1,3);

-- -------- LRMIS: Correct record --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_CORRECT');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'current_value','Current value','text',NULL,1,2),
(@sid,'correct_value','Correct value','text',NULL,1,3),
(@sid,'explanation','Explanation','textarea',NULL,1,4);

-- -------- LRMIS: Ownership change --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_OWNER_CHANGE');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'new_owner_name','New owner name','text',NULL,1,2),
(@sid,'new_owner_national_id','New owner National ID','text',NULL,0,3),
(@sid,'transfer_date','Transfer date','date',NULL,1,4),
(@sid,'reason','Reason for transfer','textarea',NULL,0,5);

-- -------- LRMIS: Marking replacement --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_MARKING_REP');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'current_mark','Current mark','text',NULL,1,2),
(@sid,'replacement_reason','Reason for replacement','textarea',NULL,1,3);

-- -------- LRMIS: Missing livestock --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_MISSING');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'species','Species','select',JSON_ARRAY('Cattle','Sheep','Goat','Horse','Donkey','Other'),1,2),
(@sid,'last_seen_location','Last seen location','text',NULL,1,3),
(@sid,'last_seen_date','Last seen date','date',NULL,1,4),
(@sid,'circumstances','Circumstances','textarea',NULL,1,5);

-- -------- LRMIS: Confirm registration --------
SET @sid = (SELECT service_id FROM service_catalog WHERE service_code = 'LRMIS_VERIFY');
INSERT INTO service_form_fields (service_id, field_key, label, field_type, options_json, required, sort_order) VALUES
(@sid,'animal_reference','Animal reference','text',NULL,1,1),
(@sid,'owner_registration_number','Owner registration number','text',NULL,1,2),
(@sid,'purpose','Purpose','textarea',NULL,1,3);

-- ============================================================
-- SECTION 4: APPLICATIONS (unified across all modules)
-- ============================================================

-- 4.1 Main applications table
CREATE TABLE applications (
    application_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED,
    module ENUM('NICR','IMMIGRATION','LRMIS') NOT NULL,
    service_type VARCHAR(120) NOT NULL,
    status ENUM(
        'draft', 'submitted', 'under_review',
        'more_information_required', 'awaiting_payment',
        'payment_verified', 'approved', 'rejected',
        'ready_for_collection', 'completed', 'cancelled'
    ) NOT NULL DEFAULT 'draft',
    priority ENUM('normal','urgent') DEFAULT 'normal',
    assigned_officer_uid VARCHAR(128),
    submitted_at DATETIME,
    decision_at DATETIME,
    decision_notes TEXT,
    fee_amount DECIMAL(12,2) DEFAULT 0.00,
    payment_status ENUM('unpaid','paid','waived') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES service_catalog(service_id),
    INDEX idx_app_user_status (user_id, status),
    INDEX idx_app_module_status (module, status),
    INDEX idx_app_ref (reference_number)
);

-- 4.2 Free-form field values per application
CREATE TABLE application_field_values (
    value_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(60) NOT NULL,
    field_value TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    INDEX idx_app (application_id)
);

-- 4.3 Uploaded documents
CREATE TABLE documents (
    document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes INT,
    verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    verification_notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    INDEX idx_doc_app (application_id)
);

-- 4.4 Application status history
CREATE TABLE application_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    changed_by_uid VARCHAR(128),
    changed_by_role ENUM('citizen','officer','admin','system') DEFAULT 'system',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE
);

-- ============================================================
-- SECTION 5: PAYMENTS
-- ============================================================
CREATE TABLE payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(150) UNIQUE,
    payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    paid_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    INDEX idx_pay_app (application_id),
    CHECK (amount >= 0)
);

-- ============================================================
-- SECTION 6: NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channel ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE SET NULL,
    INDEX idx_notif_user (user_id)
);

-- ============================================================
-- SECTION 7: NICR — CIVIL RECORDS
-- ============================================================

-- 7.1 Official civil records
CREATE TABLE civil_records (
    civil_record_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    record_type ENUM('birth','death','marriage','divorce','adoption') NOT NULL,
    record_number VARCHAR(100) UNIQUE,
    subject_full_name VARCHAR(200) NOT NULL,
    date_of_birth DATE,
    date_of_event DATE,
    place_of_event VARCHAR(200),
    parent_or_related_persons JSON,
    record_data JSON,
    record_status ENUM('active','amended','void') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7.2 NICR service requests
CREATE TABLE civil_record_requests (
    request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL UNIQUE,
    request_type ENUM(
        'birth_registration','late_birth_registration',
        'birth_certificate','death_registration',
        'death_certificate','national_id',
        'id_renewal','id_replacement','record_correction',
        'name_change','marriage_record','divorce_record',
        'adoption_record','record_verification','civil_amendment','marriage_certificate'
    ) NOT NULL,
    civil_record_id BIGINT UNSIGNED,
    subject_full_name VARCHAR(200),
    date_of_event DATE,
    requested_changes JSON,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (civil_record_id) REFERENCES civil_records(civil_record_id)
);

-- ============================================================
-- SECTION 8: IMMIGRATION
-- ============================================================

-- 8.1 Immigration applications
CREATE TABLE immigration_applications (
    immigration_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL UNIQUE,
    immigration_type ENUM('visa','residence_permit','citizenship') NOT NULL,
    category VARCHAR(100) NOT NULL,
    passport_number VARCHAR(100),
    nationality VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    intended_stay_start DATE,
    intended_stay_end DATE,
    purpose_of_stay VARCHAR(255),
    employer_or_institution VARCHAR(200),
    residential_address TEXT,
    application_data JSON,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE
);

-- 8.2 Immigration decision history
CREATE TABLE immigration_decisions (
    decision_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    immigration_id BIGINT UNSIGNED NOT NULL,
    decision ENUM('approved','rejected','more_information_required') NOT NULL,
    reason TEXT,
    decided_by BIGINT UNSIGNED,
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (immigration_id) REFERENCES immigration_applications(immigration_id) ON DELETE CASCADE,
    FOREIGN KEY (decided_by) REFERENCES users(user_id)
);

-- ============================================================
-- SECTION 9: LRMIS — LIVESTOCK
-- ============================================================

-- 9.1 Livestock owners
CREATE TABLE livestock_owners (
    owner_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    owner_type ENUM('individual','company','association','institution') NOT NULL DEFAULT 'individual',
    registration_number VARCHAR(100) UNIQUE,
    physical_address TEXT NOT NULL,
    district VARCHAR(100),
    community_or_village VARCHAR(150),
    registration_status ENUM('pending','registered','rejected','suspended') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 9.2 Registered animals
CREATE TABLE livestock_animals (
    animal_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT UNSIGNED NOT NULL,
    animal_reference VARCHAR(100) NOT NULL UNIQUE,
    species ENUM('cattle','sheep','goat','horse','donkey','other') NOT NULL,
    sex ENUM('male','female','unknown') NOT NULL DEFAULT 'unknown',
    breed VARCHAR(100),
    date_of_birth DATE,
    colour VARCHAR(100),
    animal_status ENUM('active','transferred','deceased','missing','stolen') NOT NULL DEFAULT 'active',
    location VARCHAR(200),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES livestock_owners(owner_id) ON DELETE CASCADE
);

-- 9.3 Registered livestock marks
CREATE TABLE livestock_marks (
    mark_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT UNSIGNED NOT NULL,
    mark_code VARCHAR(100) NOT NULL UNIQUE,
    mark_description TEXT,
    species VARCHAR(50),
    registration_date DATE,
    mark_status ENUM('pending','active','cancelled') NOT NULL DEFAULT 'pending',
    FOREIGN KEY (owner_id) REFERENCES livestock_owners(owner_id) ON DELETE CASCADE
);

-- 9.4 Animal marking requests
CREATE TABLE livestock_marking_requests (
    marking_request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL UNIQUE,
    animal_id BIGINT UNSIGNED NOT NULL,
    mark_id BIGINT UNSIGNED,
    request_type ENUM('new_marking','remarking','mark_correction') NOT NULL,
    requested_date DATE,
    completed_date DATE,
    marking_status ENUM('pending','scheduled','completed','rejected') NOT NULL DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (animal_id) REFERENCES livestock_animals(animal_id),
    FOREIGN KEY (mark_id) REFERENCES livestock_marks(mark_id)
);

-- 9.5 Ownership transfers
CREATE TABLE livestock_transfers (
    transfer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL UNIQUE,
    animal_id BIGINT UNSIGNED NOT NULL,
    previous_owner_id BIGINT UNSIGNED NOT NULL,
    new_owner_id BIGINT UNSIGNED NOT NULL,
    transfer_date DATE,
    transfer_reason VARCHAR(255),
    transfer_status ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (animal_id) REFERENCES livestock_animals(animal_id),
    FOREIGN KEY (previous_owner_id) REFERENCES livestock_owners(owner_id),
    FOREIGN KEY (new_owner_id) REFERENCES livestock_owners(owner_id),
    CHECK (previous_owner_id <> new_owner_id)
);

-- ============================================================
-- DONE — 25 tables created
-- ============================================================
```

### Step 3: Verify

```sql
USE lesotho_gov;
SHOW TABLES;
```

Expected tables:

```
application_field_values
application_status_history
applications
audit_logs
citizen_national_ids
citizen_profiles
civil_record_requests
civil_records
departments
documents
immigration_applications
immigration_decisions
livestock_animals
livestock_marking_requests
livestock_marks
livestock_owners
livestock_transfers
login_history
notifications
officers
otp_verifications
payments
service_catalog
service_form_fields
users
```

### Step 4: Add the `photo_path` column (if your DB predates the photo feature)

If you have an older database, run:

```sql
USE lesotho_gov;

ALTER TABLE users
  ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL
  AFTER national_id;
```

If you get "Duplicate column name 'photo_path'", skip this step.

---

## Firebase Setup

**You do NOT need to create a Firebase project.** We use one shared project. You only need to:

1. Get the `FirebaseAccountKey.json` from the team lead
2. Place it in `backend/`
3. Make sure the `.env` file points to it correctly

The `.env` file should look like:

```env
PORT=3001
BACKEND_URL=http://localhost:3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=lesotho_gov

FIREBASE_SERVICE_ACCOUNT=./FirebaseAccountKey.json
```

⚠️ **Change `DB_PASSWORD`** to your own MySQL root password.

⚠️ **Leave `FIREBASE_SERVICE_ACCOUNT=./FirebaseAccountKey.json` as-is** — the relative path works on any machine.

---

## Admin Account

The **only admin** is:

```
Email: kramohlabi7@gmail.com
```

When you log in with this email:

- The backend **automatically** sets `role = 'admin'` and `account_type = 'admin'`
- The frontend **automatically** redirects you to `/admin/home-affairs`
- You see the **Administrator Dashboard** instead of the citizen dashboard

### How to Test Admin Access

1. Log in with `kramohlabi7@gmail.com`
2. You should land on `/admin/home-affairs`
3. You should see the review queue

If it doesn't work:

```sql
USE lesotho_gov;
UPDATE users
SET role = 'admin', account_type = 'admin'
WHERE email = 'kramohlabi7@gmail.com';
```

Then log out and log back in.

### How Citizens Are Handled

Everyone else who registers:

- Gets `role = 'client'` and `account_type = 'citizen'`
- Gets an auto-assigned National ID (e.g., `LS000000001`)
- Sees the **Home Affairs Citizen Dashboard**
- Cannot access `/api/admin/*` (returns 403 Forbidden)

---

## Project Structure

```
home-affairs/
├── backend/
│   ├── Server.js                    # Complete backend API
│   ├── package.json
│   ├── .env                         # (NOT in git)
│   ├── FirebaseAccountKey.json      # (NOT in git)
│   ├── database/
│   │   └── lesotho_gov_complete.sql # Full schema
│   ├── uploads/
│   │   ├── documents/               # Uploaded application documents
│   │   └── photos/                  # User profile photos
│   └── node_modules/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── Database/
│   │   │   └── firebase.js          # Firebase config
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── dashboards/
│   │   │   ├── HomeDashboard.js     # Landing page
│   │   │   ├── HomeAffairsDashboard.js
│   │   │   ├── PassportOfficeDashboard.js
│   │   │   ├── PensionsDashboard.js
│   │   │   ├── PoliceDashboard.js
│   │   │   ├── TrafficDashboard.js
│   │   │   └── FinanceDashboard.js
│   │   ├── admin/
│   │   │   └── HomeAffairsDashboardAdmin.js
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Navbar.css
│   │   │   └── Footer.js
│   │   ├── styles/
│   │   │   └── dashboardStyles.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---

## What's Built So Far

### Authentication
- ✅ Email + password registration
- ✅ Google sign-in
- ✅ Phone OTP (SMS)
- ✅ Auto-redirect to appropriate dashboard based on role
- ✅ Session persistence via `sessionStorage`

### Citizen Features
- ✅ **Public landing page** at `/` with ministry cards
- ✅ **Home Affairs Citizen Dashboard** (`/home-affairs-dashboard`)
  - Tabs: Apply, My Applications, Notifications, Profile
  - Card grid of services grouped by module (NICR, Immigration, LRMIS)
  - Dynamic form per service (fields loaded from database)
  - File upload for documents
  - Application tracking with status badges
  - Real-time notifications
  - **Profile photo upload** (displayed on ID card and certificates)
- ✅ **Certificate viewer** with real-looking layouts
  - National ID card
  - Birth / Death / Marriage certificates
  - Immigration permits
  - Livestock certificates
- ✅ **PDF export** — download any certificate as a PDF file

### Admin Features
- ✅ **Administrator Dashboard** (`/admin/home-affairs`)
  - Stats cards (submitted, under review, approved, ready, completed)
  - Total users and applications
  - Application queue with filters (status + module)
  - **Photo thumbnail** in queue
  - **Applicant photo** in detail panel
  - Review submitted information
  - View uploaded documents
  - View history of all actions
  - Update status (approve, reject, request info, mark ready, complete)
  - Add optional note for the citizen
  - Auto-notification to citizen on status change

### Database
- ✅ Single database: `lesotho_gov`
- ✅ Full schema with 25+ tables
- ✅ Service catalogue with 30+ services
- ✅ Form field definitions per service
- ✅ Auto-generated National IDs
- ✅ Audit logging
- ✅ Photo storage

---

## Feature Guide

### For Citizens

#### 1. Register
- Go to `http://localhost:3000/register`
- Choose Email, Phone, or Google
- Fill in your details
- Get an auto-assigned National ID (e.g., `LS000000001`)

#### 2. Apply for a Service
- Log in → land on **Home Affairs Dashboard**
- Click **Apply** tab
- Choose module: Civil Registration / Immigration / Livestock
- Click **Start application** on any service
- Fill the form → upload any required documents
- Click **Submit application**
- Receive a reference number (e.g., `NICR-2026-000001`)

#### 3. Upload Your Photo
- Go to **Profile** tab
- In the **Identity photo** section, click **Upload photo**
- Choose a JPG or PNG (max 5 MB)
- Your photo appears on the ID card preview
- It will appear on all future certificates

#### 4. Track Applications
- Go to **My applications** tab
- See every application with status badge
- Click **View details** for full history
- Click **Certificate** once approved

#### 5. Download Certificate
- Open any approved application
- Click **Certificate**
- Click **Download PDF**
- The PDF contains your photo and all your information

#### 6. View Notifications
- Go to **Notifications** tab
- Every status change triggers a notification
- Click **Mark as read** to clear

### For Admins

#### 1. Log In as Admin
- Use `kramohlabi7@gmail.com`
- You land on `/admin/home-affairs`

#### 2. Review Applications
- See the **queue** with all submitted applications
- Filter by module or status
- Each row shows the applicant's photo as a thumbnail

#### 3. Process an Application
- Click **Open** on any row
- See the applicant's photo, submitted information, documents, and history
- Choose a status action:
  - **Under review** — start processing
  - **Request info** — ask for more details
  - **Awaiting payment** — waiting for citizen to pay
  - **Payment verified** — confirm payment
  - **Approve** — accept the application
  - **Ready** — mark ready for collection
  - **Complete** — close the application
  - **Reject** — reject with a note
- Add an optional note for the citizen
- The citizen gets an automatic notification

---

## API Reference

All authenticated endpoints require:

```
Authorization: Bearer <firebase-id-token>
```

### Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | Create citizen account (auto-assigns National ID) |
| POST | `/api/login` | Login (verifies token, returns user) |
| GET | `/api/me` | Get current user |
| POST | `/api/me/photo` | Upload profile photo |

### Services

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/services` | List all services (optionally `?module=NICR`) |
| GET | `/api/services/:id` | Get service + form fields |

### Applications

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/applications` | Submit new application (multipart form) |
| GET | `/api/applications/my` | List current user's applications |
| GET | `/api/applications/:id` | Get full application detail |
| GET | `/api/certificates/:id` | Get certificate data for PDF |

### Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/notifications` | List user's notifications |
| POST | `/api/notifications/:id/read` | Mark as read |

### Admin (requires admin role)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard metrics |
| GET | `/api/admin/applications` | Queue with filters |
| POST | `/api/admin/applications/:id/status` | Update application status |

---

## Git Workflow

### First time

```bash
git clone https://github.com/Boni-01/home-affairs.git
cd home-affairs
```

### Every time you start working

```bash
git pull origin main
```

### Create your own branch

```bash
git checkout -b feature/your-name-task
```

### After making changes

```bash
git add .
git commit -m "Clear description of what you changed"
git push origin feature/your-name-task
```

Then open a Pull Request on GitHub.

### IMPORTANT — Never Commit

The following are already in `.gitignore` and **must never be committed**:

- `backend/.env`
- `backend/FirebaseAccountKey.json`
- `backend/uploads/`
- `node_modules/`

---

## Troubleshooting

### 🔴 `Cannot find module 'dotenv'`

You forgot to install backend dependencies:

```bash
cd backend
npm install express cors dotenv mysql2 firebase-admin multer
```

### 🔴 `Cannot read properties of undefined (reading 'cert')`

Your `Server.js` is using old Firebase Admin API. Pull the latest:

```bash
git pull origin main
```

### 🔴 `ER_ACCESS_DENIED_ERROR` / `Access denied for user 'root'`

Your MySQL password in `.env` is wrong. Check by running:

```bash
mysql -u root -p
```

Then update `.env`:

```
DB_PASSWORD=your_actual_password
```

### 🔴 `ER_BAD_DB_ERROR: Unknown database 'lesotho_gov'`

You haven't created the database:

```bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
```

### 🔴 `Table 'lesotho_gov.users' doesn't exist`

The schema wasn't loaded. Run:

```bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
```

### 🔴 `Unknown column 'photo_path'`

Run the migration:

```sql
USE lesotho_gov;
ALTER TABLE users ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL AFTER national_id;
```

### 🔴 `auth/network-request-failed`

Your network is blocking Firebase. Fix by:

1. Change DNS to `1.1.1.1` and `8.8.8.8`
2. Or install [Cloudflare WARP](https://1.1.1.1/)
3. Or disable antivirus HTTPS scanning

### 🔴 PDF doesn't include the photo

The photo must be accessible via `http://localhost:3001/uploads/...`. Check:

1. Backend is running
2. `backend/uploads/photos/` contains the uploaded file
3. The `photo_url` in the API response starts with `http://localhost:3001/`

If the URL is relative, update `.env`:

```
BACKEND_URL=http://localhost:3001
```

### 🔴 `localhost:3000 refused to connect`

Frontend isn't running:

```bash
cd frontend
npm start
```

### 🔴 `localhost:3001 refused to connect`

Backend isn't running:

```bash
cd backend
npm start
```

### 🔴 Port already in use

**Windows:**

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Mac/Linux:**

```bash
lsof -i :3000
kill -9 <PID>
```

### 🔴 Can't log in as admin

Make sure:

1. You're using exactly `kramohlabi7@gmail.com`
2. Run this SQL:
   ```sql
   UPDATE users SET role = 'admin', account_type = 'admin'
   WHERE email = 'kramohlabi7@gmail.com';
   ```
3. Log out and log back in

---

## Security Notes

### Never Commit These Files

- `.env` (backend environment variables)
- `FirebaseAccountKey.json` (Firebase Admin SDK key)
- `uploads/` (user documents and photos)

### Never Share These Files

- Firebase private key — share only via **private DM**, never in group chat
- `.env` with real passwords — same

### If the Firebase Key Leaks

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → IAM → Service Accounts
2. Delete the exposed key
3. Generate a new one
4. Distribute privately
5. Update `.gitignore` to be sure it's excluded

### What's Stored Where

| Data | Stored In | Public? |
|---|---|---|
| Email, password | Firebase Auth | No |
| Full name, phone, National ID | MySQL `users` table | No |
| Profile photo | `backend/uploads/photos/` | Yes (URL is public on localhost) |
| Application documents | `backend/uploads/documents/` | Yes (URL is public on localhost) |
| Applications, statuses | MySQL | No |
| Certificates | Generated on-the-fly (PDF) | No |

⚠️ **Note:** In development, `/uploads/*` is served publicly. In production, this would need authentication.

---

## What's Coming Next

- 🔜 **Passport module** (using same pattern: services, forms, admin queue, PDF passport booklet)
- 🔜 **Traffic module** (driver's licences, vehicle registration)
- 🔜 **Finance module** (payments, tax refunds)
- 🔜 **Pensions module** (beneficiary verification)
- 🔜 **Police module** (non-emergency reports, clearance certificates)
- 🔜 **Cross-module integration** (single citizen profile reused everywhere)
- 🔜 **Payment integration** (mock payment gateway)
- 🔜 **Appointment booking system**
- 🔜 **Digital wallet** for storing all issued documents

---

## 👥 Team Responsibilities

| Member | Student Number | Primary Focus |
|---|---|---|
| Lehakoe Panyane | 901019088 | Backend, Firebase Auth |
| Sehloho Tsiu | 901018558 | MySQL schema, data modelling |
| Bonang Sakoane | 901019739 | Citizen frontend pages |
| Katleho Ramohlabi | 901018965 | Officer dashboards, admin |
| Malefu Mokitimi | 901018843 | Evaluation, documentation |

**All members:** contribute to their own branch, submit PRs, and participate in the presentation.

---

## 📞 Need Help?

1. **First:** check the [Troubleshooting](#troubleshooting) section
2. **Then:** paste the full error in the group chat
3. **Finally:** tag the team lead if stuck for more than 30 minutes

---

**Last Updated:** Week of 9 October 2026  
**Version:** MVP 2.0 — Home Affairs module with photos + PDF certificates  
**Next Milestone:** Passport Services module
