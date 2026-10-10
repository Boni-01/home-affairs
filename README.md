Lesotho Integrated Government Services System
Project: Integrated Government Services System for Lesotho
Course: BIHC3110 — Human Computer Interaction
Institution: Limkokwing University of Creative Technology — Lesotho
Team: 5 members

Table of Contents
What This Project Is

Tech Stack

Architecture Overview

Prerequisites

First-Time Setup

How to Run the Project

Database Setup

Firebase Setup

Admin Account

Project Structure

What's Built So Far

Feature Guide

API Reference

Git Workflow

Troubleshooting

Security Notes

What's Coming Next

What This Project Is
An Integrated Digital Public Service System for Lesotho that connects:

Home Affairs (NICR, Immigration, LRMIS)

Passport Services (applications, tracking, collection)

Traffic (driver's licences, vehicle registration)

Finance (payments, tax refunds, procurement)

Pensions (beneficiary verification, payments)

Police (non-emergency reporting, case management)

Core concept: One verified citizen profile, reused across all government services — no more resubmitting the same documents to different departments.

What's Built So Far
Complete authentication (Email, Google, Phone OTP)

Auto-assigned National IDs (LS########)

Home Affairs module (NICR, Immigration, LRMIS)

Service catalogue loaded from database

Dynamic application forms per service

Document uploads

Application tracking and notifications

Real-looking certificates and IDs

PDF export of certificates

Profile photo upload (shows on ID card and certificates)

Passport Services module

Tiered passport applications (Standard, Urgent, Express, Emergency, Official, Diplomatic)

Application tracking with status updates

Biometrics capture and appointment scheduling

Payment recording

Complaint submission and response

PDF passport download with profile photo

Traffic module

Driver's licence applications (learner, full, renewal, replacement, correction)

Vehicle registration (new, imported, second-hand local/foreign, transfer)

Roadworthiness and fitness inspections

Public motor vehicle permits

Driving school and instructor registration

Traffic fine management and online payment

Licence clearance requests

PDF driver's licence download with profile photo

Police Services module

Non-emergency crime reporting (theft, lost items, fraud, cybercrime, missing persons)

Police clearance applications

Police report requests

Witness information submission

Complaint submission and response

Document certification with automatic stamping

Police letters (acknowledgement, affidavit, loss report, confirmation, witness statement)

Feedback submission

Finance module

Tax-related requests (clearance, declaration)

Supplier/vendor registration

Invoice and payment claims

Tax refund requests

Government payment processing

Enquiry and complaint tickets

Pensions module

Pension registration (PODCPF, Old Age Pension)

Benefit applications (retirement, resignation, termination, retrenchment, disability, death, old age)

Contribution tracking

Payment recording and history

Government debt deductions

Enquiry and complaint management

Admin dashboards for all modules

Application review and processing

Status updates (approve, reject, request info, etc.)

Document verification

Payment recording

Appointment scheduling

Complaint responses

Audit logs

Citizen dashboards for all modules

Card-based service selection

Tabbed navigation

Application tracking

Notification system

Profile management with photo upload

PDF document downloads

Tech Stack
Frontend
React (Create React App)

React Router for navigation

Firebase Auth (Email/Password, Google, Phone OTP)

jsPDF + html2canvas (certificate and document PDF export)

Inline CSS with Lesotho flag colors

Backend
Node.js + Express (single-file server: Server.js)

MySQL for all data (users, applications, services, documents, audit logs)

Firebase Admin SDK for verifying ID tokens

Multer for file uploads (documents + photos)

pdf-lib for PDF manipulation (police document stamping)

Auth
Firebase Authentication handles login/registration

MySQL stores profile data linked by firebase_uid

Database
Single database: lesotho_gov

60+ tables covering users, applications, documents, services, form fields, and module-specific data

Architecture Overview
text
+---------------------------------------------------------------+
|  FRONTEND (React @ localhost:3000)                            |
|  +---------------------------+  +---------------------------+  |
|  | Citizen Dashboards        |  | Admin Dashboards          |  |
|  | - Apply for services      |  | - Review applications     |  |
|  | - Track applications      |  | - Update statuses         |  |
|  | - Upload photo            |  | - View applicant photos   |  |
|  | - Download PDFs           |  | - Process documents       |  |
|  +---------------------------+  +---------------------------+  |
+---------------------------------------------------------------+
                             |
              Firebase ID token in Authorization header
                             |
                             v
+---------------------------------------------------------------+
|  BACKEND (Express @ localhost:3001)                           |
|  - /api/register, /api/login, /api/me                         |
|  - /api/services, /api/services/:id                           |
|  - /api/applications (POST, GET, GET my)                      |
|  - /api/me/photo (upload)                                     |
|  - /api/certificates/:id (fetch for PDF)                      |
|  - /api/passport/*                                            |
|  - /api/traffic/*                                             |
|  - /api/police/*                                              |
|  - /api/finance/*                                             |
|  - /api/pensions/*                                            |
|  - /api/admin/* (admin only)                                  |
|  - /uploads/* (static files)                                  |
+---------------------------------------------------------------+
                             |
                             v
+---------------------------------------------------------------+
|  MYSQL (lesotho_gov)                                          |
|  - users, citizen_national_ids                                |
|  - applications, application_field_values, documents          |
|  - service_catalog, service_form_fields                       |
|  - civil_records, immigration_applications, livestock_*       |
|  - passport_* tables                                          |
|  - traffic_* tables                                           |
|  - police_* tables                                            |
|  - finance_* tables                                           |
|  - pension_* tables                                           |
|  - notifications, audit_logs, application_status_history      |
+---------------------------------------------------------------+
Prerequisites
Install these on your machine before pulling the repo:

Tool	Version	Download
Node.js	18+	https://nodejs.org/
npm	Comes with Node	—
MySQL	8.0+	https://dev.mysql.com/downloads/
MySQL Workbench	Latest	https://dev.mysql.com/downloads/workbench/
Git	Latest	https://git-scm.com/
VS Code	Latest	https://code.visualstudio.com/
First-Time Setup
Follow these steps exactly in order the first time you clone the repo.

Step 1: Clone the repository
bash
git clone https://github.com/Boni-01/home-affairs.git
cd home-affairs
Step 2: Install frontend dependencies
bash
cd frontend
npm install
npm install jspdf html2canvas
Step 3: Install backend dependencies
bash
cd ../backend
npm install express cors dotenv mysql2 firebase-admin multer pdf-lib
Step 4: Get the secret files from the team lead
Two files are NOT in Git (security reasons). Ask the team lead to send them privately (WhatsApp DM, Discord DM, or Google Drive — never in the group chat):

.env — Backend environment variables

FirebaseAccountKey.json — Firebase Admin SDK key

Place both files inside the backend/ folder:

text
backend/
├── Server.js
├── package.json
├── .env                        <- add this
├── FirebaseAccountKey.json     <- add this
└── node_modules/
Step 5: Set up MySQL database
See the Database Setup section below — it contains the full SQL you need to run.

Step 6: Run both servers
See the How to Run the Project section below.

How to Run the Project
You need three things running at the same time:

#	What	Where	Port
1	MySQL server	Background service	3306
2	Backend API	Terminal 1	3001
3	Frontend	Terminal 2	3000
Terminal 1 — Backend
bash
cd backend
npm start
Expected output:

text
injected env (7) from .env
Firebase Admin initialized
MySQL connected -> lesotho_gov
====================================================
Lesotho Government Services API
====================================================
Server running on http://localhost:3001
Admin email: kramohlabi7@gmail.com
====================================================
Terminal 2 — Frontend
bash
cd frontend
npm start
Expected output:

text
Compiled successfully!
Local: http://localhost:3000
Verify everything works
Open in your browser:

Frontend: http://localhost:3000

Backend health check: http://localhost:3001/api/health

The health check should return:

json
{ "status": "ok", "db": "connected", "firebase": "connected" }
Database Setup
Step 1: Start MySQL
If using XAMPP: Open XAMPP Control Panel and click Start next to MySQL.

If using MySQL service (Windows):

bash
net start MySQL80
If using MySQL service (Mac):

bash
brew services start mysql
Step 2: Run the Complete SQL Schema
Open MySQL Workbench or Command Prompt and run the following SQL.

Option A — Save as file and run from CLI:

Save the SQL below as backend/database/lesotho_gov_complete.sql, then:

bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
Option B — Copy/paste directly into MySQL Workbench:

Open Workbench, connect to your local MySQL, paste the SQL below, then click the lightning bolt.

Complete SQL Schema
sql
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
-- SECTION 1: USERS AND AUTHENTICATION
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
-- SECTION 10: PASSPORT OFFICE MODULE
-- ============================================================

-- 10.1 Passport services catalogue
CREATE TABLE passport_services (
    service_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(40) NOT NULL UNIQUE,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    application_type ENUM('first_time','renewal','replacement') NOT NULL,
    processing_tier ENUM('standard','urgent','express','emergency','official','diplomatic') NOT NULL DEFAULT 'standard',
    fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    processing_days INT NOT NULL DEFAULT 21,
    requires_appointment TINYINT(1) NOT NULL DEFAULT 1,
    requires_biometrics TINYINT(1) NOT NULL DEFAULT 1,
    requires_payment TINYINT(1) NOT NULL DEFAULT 1,
    requires_approval TINYINT(1) NOT NULL DEFAULT 0,
    eligibility_note VARCHAR(500),
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10.2 Passport form fields
CREATE TABLE passport_service_fields (
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
    FOREIGN KEY (service_id) REFERENCES passport_services(service_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_pp_field (service_id, field_key)
);

-- 10.3 Passport applications
CREATE TABLE passport_applications (
    application_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    application_type ENUM('first_time','renewal','replacement') NOT NULL,
    passport_type ENUM('ordinary','official','diplomatic','other') NOT NULL DEFAULT 'ordinary',
    status ENUM(
        'submitted','under_review','more_information_required',
        'awaiting_payment','awaiting_appointment','awaiting_biometrics',
        'approved','in_production','ready_for_collection',
        'collected','rejected','cancelled'
    ) NOT NULL DEFAULT 'submitted',
    admin_notes TEXT,
    rejection_reason TEXT,
    passport_photo_path VARCHAR(500),
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decision_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES passport_services(service_id),
    INDEX idx_pp_user (user_id),
    INDEX idx_pp_status (status)
);

-- 10.4 Passport application values
CREATE TABLE passport_application_values (
    value_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(60) NOT NULL,
    field_value TEXT,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE,
    INDEX idx_pp_val_app (application_id)
);

-- 10.5 Passport documents
CREATE TABLE passport_documents (
    document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(60) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes INT,
    verification_status ENUM('pending','verified','rejected') DEFAULT 'pending',
    verification_notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE,
    INDEX idx_pp_doc_app (application_id)
);

-- 10.6 Passport appointments
CREATE TABLE passport_appointments (
    appointment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    appointment_date DATETIME NOT NULL,
    appointment_type ENUM('document_verification','biometrics','collection','other') NOT NULL DEFAULT 'biometrics',
    appointment_status ENUM('booked','confirmed','attended','missed','cancelled','rescheduled') NOT NULL DEFAULT 'booked',
    office_location VARCHAR(200),
    admin_notes TEXT,
    attendance_recorded_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE,
    INDEX idx_pp_appt_date (appointment_date),
    INDEX idx_pp_appt_status (appointment_status)
);

-- 10.7 Passport biometrics
CREATE TABLE passport_biometrics (
    biometric_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    fingerprints_captured TINYINT(1) NOT NULL DEFAULT 0,
    photograph_captured TINYINT(1) NOT NULL DEFAULT 0,
    signature_captured TINYINT(1) NOT NULL DEFAULT 0,
    enrolment_status ENUM('pending','scheduled','completed','incomplete','failed') NOT NULL DEFAULT 'pending',
    enrolment_reference VARCHAR(150),
    enrolment_date DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE
);

-- 10.8 Passport payments
CREATE TABLE passport_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    fee_type VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    payment_method ENUM('cash','bank_transfer','card','mobile_money','other'),
    transaction_reference VARCHAR(150) UNIQUE,
    payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    payment_date DATETIME,
    verified_at DATETIME,
    payment_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE
);

-- 10.9 Issued passports
CREATE TABLE passports (
    passport_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL UNIQUE,
    passport_number VARCHAR(100) UNIQUE,
    passport_type ENUM('ordinary','official','diplomatic','other') NOT NULL DEFAULT 'ordinary',
    issue_date DATE,
    expiry_date DATE,
    production_status ENUM('not_started','in_production','produced','ready_for_collection','collected','cancelled') NOT NULL DEFAULT 'not_started',
    collection_date DATETIME,
    collection_confirmation VARCHAR(150),
    collection_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE
);

-- 10.10 Passport status history
CREATE TABLE passport_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_uid VARCHAR(128),
    changed_by_role ENUM('citizen','officer','admin','system') DEFAULT 'system',
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE CASCADE
);

-- 10.11 Passport notifications
CREATE TABLE passport_notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channel ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE SET NULL
);

-- 10.12 Passport complaints
CREATE TABLE passport_complaints (
    complaint_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    complaint_status ENUM('submitted','under_review','awaiting_response','resolved','closed') NOT NULL DEFAULT 'submitted',
    admin_response TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES passport_applications(application_id) ON DELETE SET NULL
);

-- Seed passport services
INSERT INTO passport_services
  (service_code, service_name, description, application_type, processing_tier,
   fee_amount, processing_days, requires_appointment, requires_biometrics,
   requires_payment, requires_approval, eligibility_note)
VALUES
('PP_FIRST_STD','First-time passport — Standard','Standard processing (30 working days). Best value.','first_time','standard',130.00,30,1,1,1,0,'Available to all first-time applicants'),
('PP_FIRST_URG','First-time passport — Urgent','Urgent processing (10 working days).','first_time','urgent',300.00,10,1,1,1,0,'Extra fee for faster processing'),
('PP_FIRST_EXP','First-time passport — Express','Express processing (5 working days). Fastest tier.','first_time','express',500.00,5,1,1,1,0,'Highest priority fee tier'),
('PP_REN_STD','Passport renewal — Standard','Standard renewal (30 working days).','renewal','standard',130.00,30,1,1,1,0,'Requires previous passport'),
('PP_REN_URG','Passport renewal — Urgent','Urgent renewal (10 working days).','renewal','urgent',300.00,10,1,1,1,0,'Extra fee for faster processing'),
('PP_REN_EXP','Passport renewal — Express','Express renewal (5 working days).','renewal','express',500.00,5,1,1,1,0,'Highest priority fee tier'),
('PP_REP_STD','Passport replacement — Standard','Replace lost/stolen/damaged passport (30 working days).','replacement','standard',130.00,30,1,1,1,0,'Police report required for lost/stolen'),
('PP_REP_URG','Passport replacement — Urgent','Urgent replacement (10 working days).','replacement','urgent',300.00,10,1,1,1,0,'Police report required'),
('PP_REP_EXP','Passport replacement — Express','Express replacement (5 working days).','replacement','express',500.00,5,1,1,1,0,'Police report required'),
('PP_EMERGENCY','Emergency passport','Emergency travel within 48 hours (death, medical, urgent work).','replacement','emergency',500.00,2,1,0,1,1,'Requires proof of emergency — subject to approval'),
('PP_OFFICIAL','Official passport','For government officials on official business.','first_time','official',250.00,21,1,1,1,1,'Requires government authorization letter'),
('PP_DIPLOMATIC','Diplomatic passport','For diplomats and their dependents.','first_time','diplomatic',500.00,21,1,1,1,1,'Requires Ministry of Foreign Affairs authorization');

-- ============================================================
-- SECTION 11: POLICE SERVICES MODULE
-- ============================================================

-- 11.1 Police service categories
CREATE TABLE police_service_categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(40) NOT NULL UNIQUE,
    category_name VARCHAR(120) NOT NULL,
    description TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO police_service_categories (category_code, category_name, description) VALUES
('CRIME','Crime Report','Reporting a crime or suspected criminal activity'),
('THEFT','Theft Report','Reporting stolen property, livestock or possessions'),
('LOST_ITEM','Lost Item Report','Reporting lost identity documents, phones or other property'),
('MISSING_PERSON','Missing Person','Reporting a missing person'),
('FRAUD_CYBER','Fraud and Cybercrime','Reporting suspected fraud, scams or online crime'),
('TRAFFIC','Traffic Incident','Reporting a road traffic incident'),
('CLEARANCE','Police Clearance','Applying for a police clearance certificate'),
('POLICE_REPORT','Police Report Request','Requesting an eligible copy of a police report'),
('COMPLAINT','Complaint Against Police','Reporting alleged misconduct or dissatisfaction with police service'),
('WITNESS','Witness Information','Providing details of an incident or potential witnesses'),
('EVIDENCE','Additional Evidence','Uploading documents, photos or additional information'),
('FEEDBACK','Feedback','Providing feedback about the service received')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

-- 11.2 Police applications
CREATE TABLE police_applications (
    application_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    application_type ENUM(
        'crime_report','theft_report','lost_item_report','missing_person_report',
        'fraud_report','cybercrime_report','traffic_incident','police_clearance',
        'police_report_request','police_conduct_complaint','witness_information',
        'additional_evidence','feedback'
    ) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    incident_date DATETIME NULL,
    incident_location VARCHAR(255),
    district VARCHAR(100),
    village_or_area VARCHAR(150),
    urgency ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
    status ENUM(
        'submitted','received','under_review','more_information_required',
        'awaiting_payment','referred','in_progress','approved','rejected',
        'ready_for_collection','completed','cancelled'
    ) NOT NULL DEFAULT 'submitted',
    related_report_id BIGINT UNSIGNED NULL,
    admin_notes TEXT,
    decision_notes TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decision_at DATETIME,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES police_service_categories(category_id),
    FOREIGN KEY (related_report_id) REFERENCES police_applications(application_id) ON DELETE SET NULL,
    INDEX idx_police_app_user (user_id),
    INDEX idx_police_app_status (status),
    INDEX idx_police_app_type (application_type),
    INDEX idx_police_app_date (submitted_at)
);

-- 11.3 Police application values
CREATE TABLE police_application_values (
    value_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(80) NOT NULL,
    field_value TEXT,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE CASCADE,
    INDEX idx_police_val_app (application_id)
);

-- 11.4 Police evidence
CREATE TABLE police_evidence (
    evidence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT UNSIGNED,
    evidence_description TEXT,
    verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_police_evidence_app (application_id)
);

-- 11.5 Police persons involved
CREATE TABLE police_persons (
    person_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    person_role ENUM('reporter','victim','witness','suspect','missing_person','other') NOT NULL,
    full_name VARCHAR(150),
    contact_phone VARCHAR(30),
    approximate_age SMALLINT UNSIGNED,
    identifying_details TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE CASCADE,
    INDEX idx_police_person_app (application_id)
);

-- 11.6 Police status history
CREATE TABLE police_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(60),
    new_status VARCHAR(60) NOT NULL,
    changed_by_uid VARCHAR(128),
    changed_by_role ENUM('citizen','officer','admin','system') NOT NULL DEFAULT 'system',
    change_reason TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE CASCADE
);

-- 11.7 Police appointments
CREATE TABLE police_appointments (
    appointment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    appointment_date DATETIME NOT NULL,
    appointment_type ENUM('statement','biometrics','collection','interview','other') NOT NULL DEFAULT 'statement',
    appointment_status ENUM('booked','confirmed','attended','missed','cancelled','rescheduled') NOT NULL DEFAULT 'booked',
    office_location VARCHAR(200),
    admin_notes TEXT,
    attendance_recorded_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE CASCADE,
    INDEX idx_police_appt_date (appointment_date),
    INDEX idx_police_appt_status (appointment_status)
);

-- 11.8 Police payments
CREATE TABLE police_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    fee_type VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    payment_method ENUM('cash','bank_transfer','card','mobile_money','other') NOT NULL DEFAULT 'cash',
    transaction_reference VARCHAR(150) UNIQUE,
    payment_status ENUM('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
    payment_date DATETIME,
    verified_at DATETIME,
    payment_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE CASCADE,
    CONSTRAINT chk_police_payment_amount CHECK (amount >= 0),
    INDEX idx_police_payment_app (application_id)
);

-- 11.9 Police notifications
CREATE TABLE police_notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channel ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
    read_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE SET NULL,
    INDEX idx_police_notif_user (user_id)
);

-- 11.10 Police feedback
CREATE TABLE police_feedback (
    feedback_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED NULL,
    rating TINYINT NOT NULL,
    comments TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE SET NULL
);

-- 11.11 Police letters
CREATE TABLE police_letters (
    letter_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED NULL,
    letter_type ENUM(
        'report_acknowledgement','affidavit','loss_report',
        'confirmation_of_report','clearance_collection_notice',
        'witness_statement','general_letter'
    ) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status ENUM('draft','issued','revoked') NOT NULL DEFAULT 'issued',
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME,
    revoke_reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES police_applications(application_id) ON DELETE SET NULL,
    INDEX idx_police_letter_user (user_id),
    INDEX idx_police_letter_type (letter_type)
);

-- 11.12 Police certified documents
CREATE TABLE police_certified_documents (
    certified_doc_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    document_title VARCHAR(200) NOT NULL,
    purpose VARCHAR(255),
    notes TEXT,
    original_filename VARCHAR(255) NOT NULL,
    original_storage_path VARCHAR(500) NOT NULL,
    original_mime_type VARCHAR(100),
    original_size_bytes BIGINT UNSIGNED,
    certified_filename VARCHAR(255),
    certified_storage_path VARCHAR(500),
    certified_mime_type VARCHAR(100),
    certified_size_bytes BIGINT UNSIGNED,
    status ENUM(
        'submitted','under_review','more_information_required',
        'awaiting_payment','certified','rejected','cancelled'
    ) NOT NULL DEFAULT 'submitted',
    admin_notes TEXT,
    rejection_reason TEXT,
    certifying_officer VARCHAR(150),
    certified_at DATETIME,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_police_certdoc_user (user_id),
    INDEX idx_police_certdoc_status (status)
);

-- 11.13 Police certified document payments
CREATE TABLE police_certified_document_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    certified_doc_id BIGINT UNSIGNED NOT NULL,
    fee_type VARCHAR(100) NOT NULL DEFAULT 'Certification fee',
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    payment_method ENUM('cash','bank_transfer','card','mobile_money','other') NOT NULL DEFAULT 'cash',
    transaction_reference VARCHAR(150) UNIQUE,
    payment_status ENUM('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
    payment_date DATETIME,
    verified_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (certified_doc_id) REFERENCES police_certified_documents(certified_doc_id) ON DELETE CASCADE,
    CONSTRAINT chk_certdoc_payment_amount CHECK (amount >= 0)
);

-- 11.14 Police certified document notifications
CREATE TABLE police_certified_document_notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    certified_doc_id BIGINT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channel ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
    read_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (certified_doc_id) REFERENCES police_certified_documents(certified_doc_id) ON DELETE SET NULL,
    INDEX idx_police_certdoc_notif_user (user_id)
);

-- ============================================================
-- SECTION 12: FINANCE MODULE
-- ============================================================

-- 12.1 Finance services
CREATE TABLE finance_services (
    service_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(40) NOT NULL UNIQUE,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    eligibility_rules TEXT,
    required_documents TEXT,
    fee_amount DECIMAL(12,2) NULL,
    fee_currency CHAR(3) NOT NULL DEFAULT 'LSL',
    procedure_text TEXT,
    contact_information VARCHAR(255),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO finance_services
  (service_code, service_name, description, eligibility_rules, required_documents, procedure_text)
VALUES
  ('TAX-REQUEST','Tax-related request','Submit a supported tax request, tax-clearance request or declaration.','As specified by the authorised tax service.','Identification and supporting tax documents as required.','Submit and track using the reference number.'),
  ('TAX-CLEARANCE','Tax clearance request','Submit a request for tax clearance.','Subject to Revenue Services Lesotho requirements.','Identification, tax details and supporting documents as required.','Submit for authorised review. The portal does not itself issue tax clearance.'),
  ('TAX-DECLARATION','Tax declaration','Submit a tax declaration for a specified tax period.','As specified by the authorised tax service.','Tax identification and declaration details.','Submit and route to RSL for decision.'),
  ('SUPPLIER-REG','Supplier/vendor registration','Register a business as a supplier for government workflows.','Supplier eligibility and registration must be verified.','Company registration, tax clearance and bank verification evidence as required.','Submit for validation against authorised records.'),
  ('INVOICE-CLAIM','Invoice / payment claim','Submit an invoice or payment claim through the approved workflow.','Must relate to a valid authorised contract or order.','Invoice, contract, purchase order, delivery note and other required evidence.','Validation checks completeness and routes the claim to the responsible authority.'),
  ('TAX-REFUND','Tax refund request','Submit and track a tax refund request.','Eligibility and refund amount determined by the authorised tax authority.','Tax identification, tax period, returns and supporting evidence.','Validate and route to RSL/authorised workflow for decision and payment.'),
  ('GOV-PAYMENT','Government payment','Pay eligible government charges through supported channels.','Only services and payment channels approved for online payment.','Reference number and required payer details.','Payment status is confirmed by the payment provider.'),
  ('FINANCE-ENQUIRY','Finance enquiry or complaint','Submit an enquiry or complaint about a Finance service.','Available to registered portal users.','Supporting evidence where applicable.','Track the ticket and receive a response through the portal.')
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

-- 12.2 Finance service requests
CREATE TABLE finance_service_requests (
    request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(30) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    request_type ENUM(
        'TAX_REQUEST','TAX_CLEARANCE','TAX_DECLARATION',
        'SUPPLIER_REGISTRATION','INVOICE_CLAIM','TAX_REFUND','GENERAL_ENQUIRY'
    ) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(14,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    status ENUM(
        'DRAFT','SUBMITTED','VALIDATING','UNDER_REVIEW','ACTION_REQUIRED',
        'APPROVED','REJECTED','PROCESSING','COMPLETED','CANCELLED'
    ) NOT NULL DEFAULT 'DRAFT',
    assigned_admin_id BIGINT UNSIGNED NULL,
    admin_notes TEXT,
    decision_notes TEXT,
    submitted_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES finance_services(service_id),
    FOREIGN KEY (assigned_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_fin_req_user_status (user_id, status),
    INDEX idx_fin_req_type_status (request_type, status),
    INDEX idx_fin_req_submitted (submitted_at)
);

-- 12.3 Finance request values
CREATE TABLE finance_request_values (
    value_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(80) NOT NULL,
    field_value TEXT,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE CASCADE,
    INDEX idx_fin_val_req (request_id)
);

-- 12.4 Finance request documents
CREATE TABLE finance_request_documents (
    document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT UNSIGNED,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    validation_status ENUM('PENDING','PASSED','FAILED','REQUIRES_REVIEW') NOT NULL DEFAULT 'PENDING',
    validation_notes VARCHAR(500),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_fin_doc_req (request_id, validation_status)
);

-- 12.5 Finance suppliers
CREATE TABLE finance_suppliers (
    supplier_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    supplier_code VARCHAR(50) UNIQUE,
    legal_business_name VARCHAR(200) NOT NULL,
    trading_name VARCHAR(200),
    company_registration_no VARCHAR(100),
    tax_identification_no VARCHAR(100),
    contact_person VARCHAR(150),
    business_email VARCHAR(190),
    business_phone VARCHAR(30),
    address TEXT,
    bank_name VARCHAR(150),
    bank_account_name VARCHAR(200),
    bank_account_last4 CHAR(4),
    bank_verification_status ENUM('PENDING','MATCHED','MISMATCH','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    ifmis_registered TINYINT(1) NOT NULL DEFAULT 0,
    ifmis_reference VARCHAR(150),
    validation_status ENUM('NOT_CHECKED','PENDING','VERIFIED','FAILED','ACTION_REQUIRED') NOT NULL DEFAULT 'NOT_CHECKED',
    registration_status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','ACTION_REQUIRED','ACCEPTED','REJECTED') NOT NULL DEFAULT 'DRAFT',
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_fin_supplier_status (registration_status, validation_status)
);

-- 12.6 Finance invoice claims
CREATE TABLE finance_invoice_claims (
    claim_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL UNIQUE,
    supplier_id BIGINT UNSIGNED NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    purchase_order_no VARCHAR(100),
    contract_reference VARCHAR(100),
    delivery_note_reference VARCHAR(100),
    issuing_ministry VARCHAR(150),
    invoice_date DATE NOT NULL,
    due_date DATE,
    amount DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    validation_status ENUM('PENDING','PASSED','FAILED','MISMATCH','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    validation_notes TEXT,
    workflow_status ENUM(
        'SUBMITTED','VALIDATION_FAILED','UNDER_REVIEW','ACTION_REQUIRED',
        'FORWARDED_FOR_APPROVAL','APPROVED_BY_AUTHORITY','REJECTED','PAID'
    ) NOT NULL DEFAULT 'SUBMITTED',
    external_ifmis_reference VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES finance_suppliers(supplier_id)
);

-- 12.7 Finance tax refunds
CREATE TABLE finance_tax_refunds (
    refund_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL UNIQUE,
    tax_id VARCHAR(100) NOT NULL,
    tax_period VARCHAR(30) NOT NULL,
    amount_claimed DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    external_rsl_reference VARCHAR(150),
    validation_status ENUM('PENDING','PASSED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    calculation_source ENUM('EXTERNAL_RSL','MANUAL_AUTHORISED_REVIEW','NOT_CALCULATED') NOT NULL DEFAULT 'NOT_CALCULATED',
    amount_approved DECIMAL(14,2) NULL,
    approval_reference VARCHAR(150),
    workflow_status ENUM(
        'SUBMITTED','VALIDATING','UNDER_REVIEW','ACTION_REQUIRED',
        'FORWARDED_TO_RSL','APPROVED_BY_AUTHORITY','REJECTED',
        'PAYMENT_PROCESSING','PAID'
    ) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE CASCADE
);

-- 12.8 Finance tax requests
CREATE TABLE finance_tax_requests (
    tax_request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL UNIQUE,
    taxpayer_type ENUM('INDIVIDUAL','BUSINESS','OTHER') NOT NULL,
    tax_id VARCHAR(100),
    tax_request_type ENUM('GENERAL_TAX','TAX_CLEARANCE','TAX_DECLARATION','OTHER') NOT NULL,
    tax_period VARCHAR(30),
    external_rsl_reference VARCHAR(150),
    validation_status ENUM('PENDING','PASSED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE CASCADE
);

-- 12.9 Finance payments
CREATE TABLE finance_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    request_id BIGINT UNSIGNED NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    provider_reference VARCHAR(150),
    payment_purpose ENUM('SERVICE_FEE','GOVERNMENT_PAYMENT','SUPPLIER_DISBURSEMENT','TAX_REFUND') NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    payment_method VARCHAR(60),
    status ENUM('INITIATED','PENDING','SUCCESS','FAILED','REVERSED','RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'INITIATED',
    receipt_number VARCHAR(100) UNIQUE,
    paid_at DATETIME NULL,
    confirmed_by_provider_at DATETIME NULL,
    reconciliation_status ENUM('NOT_REQUIRED','PENDING','MATCHED','MISMATCH','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    external_system VARCHAR(100),
    external_reference VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE SET NULL,
    INDEX idx_fin_pay_user_status (user_id, status),
    INDEX idx_fin_pay_reconcile (reconciliation_status)
);

-- 12.10 Finance tickets (enquiries/complaints)
CREATE TABLE finance_tickets (
    ticket_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_reference VARCHAR(30) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    request_id BIGINT UNSIGNED NULL,
    category ENUM('DELAYED_PAYMENT','TAX_REFUND','INCORRECT_CHARGE','FAILED_TRANSACTION','SERVICE_ENQUIRY','OTHER') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('OPEN','UNDER_REVIEW','WAITING_FOR_USER','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
    response_text TEXT,
    handled_by BIGINT UNSIGNED NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 12.11 Finance status history
CREATE TABLE finance_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT UNSIGNED NULL,
    note TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 12.12 Finance notifications
CREATE TABLE finance_notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    request_id BIGINT UNSIGNED NULL,
    channel ENUM('IN_APP','EMAIL','SMS') NOT NULL DEFAULT 'IN_APP',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    delivery_status ENUM('QUEUED','SENT','FAILED','READ') NOT NULL DEFAULT 'QUEUED',
    sent_at DATETIME NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES finance_service_requests(request_id) ON DELETE SET NULL
);

-- ============================================================
-- SECTION 13: PENSIONS MODULE
-- ============================================================

-- 13.1 Pension programmes
CREATE TABLE pension_programmes (
    programme_id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    programme_code VARCHAR(30) NOT NULL UNIQUE,
    programme_name VARCHAR(150) NOT NULL,
    description TEXT,
    eligibility_notes TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pension_programmes (programme_code, programme_name, description, eligibility_notes)
VALUES
('PODCPF','Public Officers Defined Contribution Pension Fund','Defined-contribution pension programme for eligible permanent and pensionable public officers.','Eligibility and benefit calculations must follow applicable Fund rules and authorised records.'),
('OAP','Old Age Pension','Old Age Pension programme for eligible older citizens.','Eligibility and payment amounts must be confirmed against current official rules.')
ON DUPLICATE KEY UPDATE programme_name = VALUES(programme_name);

-- 13.2 Pension members
CREATE TABLE pension_members (
    member_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    programme_id SMALLINT UNSIGNED NOT NULL,
    member_number VARCHAR(60) UNIQUE,
    national_id_encrypted VARBINARY(512),
    date_of_birth DATE,
    employment_number VARCHAR(80),
    employer_name VARCHAR(180),
    employment_start_date DATE,
    employment_end_date DATE,
    membership_status ENUM('PENDING_VERIFICATION','ACTIVE','RETIRED','RESIGNED','TERMINATED','DECEASED','SUSPENDED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    identity_verification_status ENUM('NOT_CHECKED','PENDING','VERIFIED','FAILED') NOT NULL DEFAULT 'NOT_CHECKED',
    verified_by BIGINT UNSIGNED,
    verified_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (programme_id) REFERENCES pension_programmes(programme_id),
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_member_status (membership_status, programme_id)
);

-- 13.3 Pension beneficiaries
CREATE TABLE pension_beneficiaries (
    beneficiary_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED,
    relationship_to_member VARCHAR(80),
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE,
    identity_reference_encrypted VARBINARY(512),
    verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES pension_members(member_id) ON DELETE SET NULL,
    INDEX idx_beneficiary_member (member_id)
);

-- 13.4 Pension contributions
CREATE TABLE pension_contributions (
    contribution_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT UNSIGNED NOT NULL,
    contribution_period DATE NOT NULL COMMENT 'First day of the relevant month',
    member_contribution DECIMAL(14,2) NOT NULL DEFAULT 0,
    employer_contribution DECIMAL(14,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    source_system VARCHAR(80),
    external_reference VARCHAR(120),
    reconciliation_status ENUM('PENDING','MATCHED','DISCREPANCY','CONFIRMED') NOT NULL DEFAULT 'PENDING',
    imported_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES pension_members(member_id) ON DELETE CASCADE,
    UNIQUE KEY uq_member_period_ref (member_id, contribution_period, external_reference),
    INDEX idx_contribution_period (contribution_period, reconciliation_status)
);

-- 13.5 Pension applications
CREATE TABLE pension_applications (
    application_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    applicant_user_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED,
    programme_id SMALLINT UNSIGNED NOT NULL,
    application_type ENUM(
        'REGISTRATION','RETIREMENT_BENEFIT','RESIGNATION_BENEFIT','TERMINATION_BENEFIT',
        'RETRENCHMENT_BENEFIT','DISABILITY_BENEFIT','DEATH_BENEFIT','OLD_AGE_PENSION',
        'RECORD_CORRECTION','OTHER'
    ) NOT NULL,
    submitted_details JSON,
    status ENUM(
        'DRAFT','SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED',
        'VERIFICATION_PENDING','APPROVED','REJECTED',
        'PAYMENT_PENDING','PAID','CLOSED','CANCELLED'
    ) NOT NULL DEFAULT 'DRAFT',
    submitted_at DATETIME,
    assigned_admin_id BIGINT UNSIGNED,
    decision_summary TEXT,
    decision_reference VARCHAR(120),
    decided_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES pension_members(member_id) ON DELETE SET NULL,
    FOREIGN KEY (programme_id) REFERENCES pension_programmes(programme_id),
    FOREIGN KEY (assigned_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_pension_app_user_status (applicant_user_id, status),
    INDEX idx_pension_app_queue (status, application_type, submitted_at)
);

-- 13.6 Pension application documents
CREATE TABLE pension_application_documents (
    document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120),
    file_size_bytes BIGINT UNSIGNED,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    review_status ENUM('PENDING','ACCEPTED','REJECTED','REPLACEMENT_REQUIRED') NOT NULL DEFAULT 'PENDING',
    review_notes TEXT,
    reviewed_by BIGINT UNSIGNED,
    reviewed_at DATETIME,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES pension_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_pension_doc_review (application_id, review_status)
);

-- 13.7 Pension benefit assessments
CREATE TABLE pension_benefit_assessments (
    assessment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    calculation_version VARCHAR(50),
    gross_amount DECIMAL(14,2),
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    calculation_notes TEXT,
    calculated_from_source VARCHAR(100),
    assessed_by BIGINT UNSIGNED,
    assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approval_status ENUM('NOT_REVIEWED','PENDING_AUTHORITY','AUTHORISED','DECLINED') NOT NULL DEFAULT 'NOT_REVIEWED',
    authorised_by BIGINT UNSIGNED,
    authorised_at DATETIME,
    external_decision_reference VARCHAR(120),
    FOREIGN KEY (application_id) REFERENCES pension_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (assessed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (authorised_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_pension_assessment_status (approval_status, assessed_at)
);

-- 13.8 Pension government debts
CREATE TABLE pension_government_debts (
    debt_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT UNSIGNED NOT NULL,
    debt_type ENUM(
        'SALARY_ADVANCE','SALARY_OVERPAYMENT','NMDS_LOAN_OR_BURSARY',
        'PUBLIC_SERVICE_BOND','SURCHARGE','INCOME_TAX',
        'MOTOR_VEHICLE_ADVANCE','OTHER'
    ) NOT NULL,
    description TEXT,
    reference_number VARCHAR(120),
    amount_recorded DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    source_department VARCHAR(180),
    source_system VARCHAR(80),
    verification_status ENUM('PENDING','VERIFIED','DISPUTED','NOT_CONFIRMED','RESOLVED') NOT NULL DEFAULT 'PENDING',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_by BIGINT UNSIGNED,
    verified_at DATETIME,
    FOREIGN KEY (member_id) REFERENCES pension_members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_pension_debt_member_status (member_id, verification_status)
);

-- 13.9 Pension deductions
CREATE TABLE pension_deductions (
    deduction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT UNSIGNED NOT NULL,
    debt_id BIGINT UNSIGNED,
    benefit_assessment_id BIGINT UNSIGNED,
    deduction_date DATE,
    amount DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    reason TEXT NOT NULL,
    authority_reference VARCHAR(120),
    status ENUM('RECORDED','UNDER_REVIEW','CONFIRMED','DISPUTED','REVERSED') NOT NULL DEFAULT 'RECORDED',
    source_system VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES pension_members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (debt_id) REFERENCES pension_government_debts(debt_id) ON DELETE SET NULL,
    FOREIGN KEY (benefit_assessment_id) REFERENCES pension_benefit_assessments(assessment_id) ON DELETE SET NULL,
    INDEX idx_pension_deduction_member_date (member_id, deduction_date, status)
);

-- 13.10 Pension payments
CREATE TABLE pension_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED,
    member_id BIGINT UNSIGNED,
    beneficiary_id BIGINT UNSIGNED,
    programme_id SMALLINT UNSIGNED NOT NULL,
    payment_reference VARCHAR(120) NOT NULL UNIQUE,
    payment_period DATE,
    amount DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LSL',
    payment_method ENUM('BANK','MOBILE_MONEY','POST_OFFICE','AUTHORISED_PAY_POINT','OTHER'),
    status ENUM('SCHEDULED','PENDING','PROCESSING','PAID','FAILED','CANCELLED','RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'PENDING',
    provider_reference VARCHAR(150),
    paid_at DATETIME,
    failure_reason TEXT,
    source_system VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES pension_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (member_id) REFERENCES pension_members(member_id) ON DELETE SET NULL,
    FOREIGN KEY (beneficiary_id) REFERENCES pension_beneficiaries(beneficiary_id) ON DELETE SET NULL,
    FOREIGN KEY (programme_id) REFERENCES pension_programmes(programme_id),
    INDEX idx_pension_payment_member_period (member_id, payment_period, status),
    INDEX idx_pension_payment_beneficiary_period (beneficiary_id, payment_period, status)
);

-- 13.11 Pension enquiries
CREATE TABLE pension_enquiries (
    enquiry_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    related_application_id BIGINT UNSIGNED,
    related_payment_id BIGINT UNSIGNED,
    enquiry_type ENUM(
        'DELAYED_PAYMENT','MISSING_PAYMENT','INCORRECT_DEDUCTION',
        'CONTRIBUTION_DISCREPANCY','BENEFIT_QUERY','ELIGIBILITY_QUERY',
        'PROFILE_CORRECTION','COMPLAINT','OTHER'
    ) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('OPEN','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','RESPONDED','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
    assigned_admin_id BIGINT UNSIGNED,
    response TEXT,
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_application_id) REFERENCES pension_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (related_payment_id) REFERENCES pension_payments(payment_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_pension_enquiry_queue (status, created_at)
);

-- 13.12 Pension status history
CREATE TABLE pension_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT UNSIGNED,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES pension_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_pension_status_history_app (application_id, changed_at)
);

-- 13.13 Pension notifications
CREATE TABLE pension_notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    payment_id BIGINT UNSIGNED,
    channel ENUM('IN_APP','EMAIL','SMS') NOT NULL DEFAULT 'IN_APP',
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    delivery_status ENUM('QUEUED','SENT','FAILED','READ') NOT NULL DEFAULT 'QUEUED',
    sent_at DATETIME,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES pension_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES pension_payments(payment_id) ON DELETE SET NULL,
    INDEX idx_pension_notification_user (user_id, delivery_status, created_at)
);

-- ============================================================
-- SECTION 14: TRAFFIC MODULE
-- ============================================================

-- 14.1 Traffic service categories
CREATE TABLE traffic_service_categories (
    category_id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(40) NOT NULL UNIQUE,
    category_name VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO traffic_service_categories (category_code, category_name, description, icon, sort_order) VALUES
('DRIVERS_LICENCE','Driver''s Licence Services','Learner, driver licence, renewals, replacements, corrections','car',1),
('VEHICLE_REGISTRATION','Motor Vehicle Registration','New, imported, second-hand, transfers, plates','truck',2),
('ROADWORTHINESS','Roadworthiness and Vehicle Fitness','RW/F inspections, certificates, defect tracking','wrench',3),
('PUBLIC_PERMITS','Public Motor Vehicle Permits','Public transport permits and renewals','bus',4),
('DRIVING_SCHOOLS','Driving Schools and Instructors','Registration, authorisation, complaints','school',5),
('FINES_CLEARANCE','Fines and Clearance','Traffic fine payments, clearance certificates','money',6)
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

-- 14.2 Traffic service definitions
CREATE TABLE traffic_service_definitions (
    service_def_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(60) NOT NULL UNIQUE,
    category_id SMALLINT UNSIGNED NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    description TEXT,
    fee_amount DECIMAL(12,2) DEFAULT 0.00,
    processing_days INT DEFAULT 7,
    requires_documents TINYINT(1) DEFAULT 1,
    requires_payment TINYINT(1) DEFAULT 1,
    requires_appointment TINYINT(1) DEFAULT 0,
    requires_approval TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES traffic_service_categories(category_id),
    INDEX idx_traffic_service_category (category_id, is_active)
);

-- Insert traffic service definitions
INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'LEARNER_LICENCE', category_id, 'Learner''s Licence Application', 'Apply for a learner''s driving licence', 50.00, 7, 1, 1, 1, 1
FROM traffic_service_categories WHERE category_code = 'DRIVERS_LICENCE'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'DRIVER_LICENCE', category_id, 'Driver''s Licence Application', 'Apply for a full driver''s licence', 100.00, 14, 1, 1, 1, 1
FROM traffic_service_categories WHERE category_code = 'DRIVERS_LICENCE'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'LICENCE_RENEWAL', category_id, 'Driver''s Licence Renewal', 'Renew an existing driver''s licence', 80.00, 7, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'DRIVERS_LICENCE'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'LICENCE_REPLACEMENT', category_id, 'Licence Replacement', 'Replace a lost or damaged licence', 100.00, 14, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'DRIVERS_LICENCE'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'LICENCE_CORRECTION', category_id, 'Licence Correction', 'Correct details on your licence', 50.00, 14, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'DRIVERS_LICENCE'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'VEHICLE_REGISTRATION', category_id, 'Vehicle Registration', 'Register a new motor vehicle', 150.00, 7, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'IMPORTED_VEHICLE_REGISTRATION', category_id, 'Imported Vehicle Registration', 'Register an imported vehicle', 250.00, 14, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'SECOND_HAND_LOCAL', category_id, 'Second-Hand Vehicle (Local)', 'Register a second-hand vehicle purchased locally', 150.00, 7, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'SECOND_HAND_FOREIGN', category_id, 'Second-Hand Vehicle (Foreign)', 'Register a second-hand vehicle purchased abroad', 250.00, 14, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'SPECIAL_VEHICLE_PERMIT', category_id, 'Special Vehicle Permit', 'Permit for a new vehicle awaiting registration', 100.00, 3, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'NUMBER_PLATE', category_id, 'Number Plate Application', 'Apply for vehicle number plates', 100.00, 7, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'NUMBER_PLATE_REPLACEMENT', category_id, 'Number Plate Replacement', 'Replace lost or damaged number plates', 150.00, 7, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'OWNERSHIP_TRANSFER', category_id, 'Vehicle Ownership Transfer', 'Transfer vehicle ownership', 100.00, 7, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'VEHICLE_REGISTRATION'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'ROADWORTHINESS_INSPECTION', category_id, 'Roadworthiness Inspection', 'Request a roadworthiness inspection', 80.00, 3, 1, 1, 1, 1
FROM traffic_service_categories WHERE category_code = 'ROADWORTHINESS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'FITNESS_INSPECTION', category_id, 'Fitness Inspection', 'Request a vehicle fitness inspection', 80.00, 3, 1, 1, 1, 1
FROM traffic_service_categories WHERE category_code = 'ROADWORTHINESS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'RE_INSPECTION', category_id, 'Re-Inspection', 'Request a re-inspection after repairs', 40.00, 3, 1, 1, 1, 1
FROM traffic_service_categories WHERE category_code = 'ROADWORTHINESS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'PUBLIC_MOTOR_VEHICLE_PERMIT', category_id, 'Public Motor Vehicle Permit', 'Apply for a public transport permit', 300.00, 21, 1, 1, 1, 1
FROM traffic_service_categories WHERE category_code = 'PUBLIC_PERMITS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'PERMIT_RENEWAL', category_id, 'Permit Renewal', 'Renew an existing permit', 250.00, 14, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'PUBLIC_PERMITS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'DRIVING_SCHOOL_REGISTRATION', category_id, 'Driving School Registration', 'Register a driving school', 500.00, 30, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'DRIVING_SCHOOLS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'INSTRUCTOR_REGISTRATION', category_id, 'Instructor Registration', 'Register as a driving instructor', 200.00, 21, 1, 1, 0, 1
FROM traffic_service_categories WHERE category_code = 'DRIVING_SCHOOLS'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

INSERT INTO traffic_service_definitions 
  (service_code, category_id, service_name, description, fee_amount, processing_days, requires_documents, requires_payment, requires_appointment, requires_approval)
SELECT 'RECORD_CORRECTION', category_id, 'Record Correction', 'Request correction of traffic records', 50.00, 14, 1, 0, 0, 1
FROM traffic_service_categories WHERE category_code = 'FINES_CLEARANCE'
ON DUPLICATE KEY UPDATE service_name = VALUES(service_name);

-- 14.3 Traffic service fields (dynamic forms)
CREATE TABLE traffic_service_fields (
    field_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_def_id INT UNSIGNED NOT NULL,
    field_key VARCHAR(80) NOT NULL,
    label VARCHAR(200) NOT NULL,
    field_type ENUM('text','number','date','select','textarea','email','tel','file') NOT NULL,
    options_json JSON,
    required TINYINT(1) NOT NULL DEFAULT 0,
    help_text VARCHAR(500),
    placeholder VARCHAR(200),
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (service_def_id) REFERENCES traffic_service_definitions(service_def_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_traffic_service_field (service_def_id, field_key)
);

-- 14.4 Traffic applications
CREATE TABLE traffic_applications (
    application_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    category_id SMALLINT UNSIGNED NOT NULL,
    service_def_id INT UNSIGNED,
    application_type VARCHAR(60) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM(
        'DRAFT','SUBMITTED','UNDER_REVIEW','DOCUMENTS_REQUIRED','APPOINTMENT_REQUIRED',
        'PAYMENT_PENDING','APPROVED','REJECTED','PROCESSING','READY_FOR_COLLECTION',
        'COMPLETED','CANCELLED'
    ) NOT NULL DEFAULT 'DRAFT',
    urgency ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
    submitted_at DATETIME,
    assigned_admin_id BIGINT UNSIGNED,
    admin_notes TEXT,
    decision_notes TEXT,
    rejection_reason TEXT,
    decision_at DATETIME,
    fee_amount DECIMAL(12,2),
    payment_status ENUM('NOT_REQUIRED','PENDING','PAID','WAIVED','REFUNDED') DEFAULT 'NOT_REQUIRED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES traffic_service_categories(category_id),
    FOREIGN KEY (service_def_id) REFERENCES traffic_service_definitions(service_def_id),
    FOREIGN KEY (assigned_admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_traffic_app_user (user_id, status),
    INDEX idx_traffic_app_queue (status, application_type, submitted_at),
    INDEX idx_traffic_app_ref (reference_number)
);

-- 14.5 Traffic application values
CREATE TABLE traffic_application_values (
    value_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE CASCADE,
    INDEX idx_traffic_values_app (application_id, field_key)
);

-- 14.6 Traffic application documents
CREATE TABLE traffic_application_documents (
    document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120),
    file_size_bytes BIGINT UNSIGNED,
    verification_status ENUM('PENDING','VERIFIED','REJECTED','REPLACEMENT_REQUIRED') DEFAULT 'PENDING',
    verified_by BIGINT UNSIGNED,
    verified_at DATETIME,
    rejection_reason VARCHAR(500),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_traffic_docs_app (application_id, verification_status)
);

-- 14.7 Traffic status history
CREATE TABLE traffic_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT UNSIGNED,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_traffic_history_app (application_id, changed_at)
);

-- 14.8 Traffic notifications
CREATE TABLE traffic_notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    notification_type ENUM('APPLICATION_UPDATE','DOCUMENT_REQUEST','APPOINTMENT','PAYMENT','LICENCE_EXPIRY','INSPECTION_EXPIRY','COMPLAINT_UPDATE','GENERAL') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    delivery_channel ENUM('IN_APP','EMAIL','SMS') DEFAULT 'IN_APP',
    delivery_status ENUM('QUEUED','SENT','FAILED','READ') DEFAULT 'QUEUED',
    sent_at DATETIME,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    INDEX idx_traffic_notif_user (user_id, delivery_status, created_at)
);

-- 14.9 Driver licences
CREATE TABLE driver_licences (
    licence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    licence_number VARCHAR(60) NOT NULL UNIQUE,
    licence_category VARCHAR(30) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    licence_status ENUM('PENDING','VALID','EXPIRED','SUSPENDED','REVOKED','REPLACED') DEFAULT 'PENDING',
    issuing_officer_id BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (issuing_officer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_licence_user (user_id, licence_status),
    INDEX idx_licence_expiry (expiry_date, licence_status)
);

-- 14.10 Traffic vehicles
CREATE TABLE traffic_vehicles (
    vehicle_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT UNSIGNED NOT NULL,
    vin_or_chassis_number VARCHAR(100) NOT NULL UNIQUE,
    engine_number VARCHAR(100),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    manufacture_year YEAR,
    vehicle_type VARCHAR(80) NOT NULL,
    colour VARCHAR(50),
    country_of_origin VARCHAR(100),
    import_status ENUM('LOCAL','IMPORTED','UNKNOWN') DEFAULT 'UNKNOWN',
    ownership_status ENUM('ACTIVE','TRANSFERRED','DISPUTED','DEREGISTERED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_vehicle_owner (owner_user_id, ownership_status)
);

-- 14.11 Vehicle registrations
CREATE TABLE vehicle_registrations (
    registration_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    registration_number VARCHAR(50) UNIQUE,
    registration_type ENUM('NEW','IMPORTED','SECOND_HAND_LOCAL','SECOND_HAND_FOREIGN','TRANSFER') NOT NULL,
    registration_status ENUM('PENDING','ACTIVE','SUSPENDED','CANCELLED','DEREGISTERED') DEFAULT 'PENDING',
    registered_on DATE,
    expiry_date DATE,
    registration_certificate_key VARCHAR(500),
    processed_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES traffic_vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_registration_vehicle (vehicle_id, registration_status),
    INDEX idx_registration_expiry (expiry_date)
);

-- 14.12 Driving test bookings
CREATE TABLE driving_test_bookings (
    booking_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    applicant_user_id BIGINT UNSIGNED NOT NULL,
    test_type ENUM('THEORY','PRACTICAL','RETEST') NOT NULL,
    office_name VARCHAR(150) NOT NULL,
    scheduled_at DATETIME NOT NULL,
    booking_status ENUM('REQUESTED','BOOKED','RESCHEDULED','CANCELLED','ATTENDED','NO_SHOW') DEFAULT 'REQUESTED',
    booked_by BIGINT UNSIGNED,
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (booked_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_test_schedule (office_name, scheduled_at, booking_status)
);

-- 14.13 Driving test results
CREATE TABLE driving_test_results (
    result_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
    examiner_user_id BIGINT UNSIGNED NOT NULL,
    result ENUM('PASS','FAIL','ABSENT','PENDING') DEFAULT 'PENDING',
    score DECIMAL(5,2),
    result_notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES driving_test_bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (examiner_user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- 14.14 Vehicle inspections
CREATE TABLE vehicle_inspections (
    inspection_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED,
    vehicle_id BIGINT UNSIGNED,
    inspection_type ENUM('ROADWORTHINESS','FITNESS','RE_INSPECTION','OTHER') NOT NULL,
    inspection_location VARCHAR(150) NOT NULL,
    scheduled_at DATETIME,
    inspector_user_id BIGINT UNSIGNED,
    inspection_status ENUM('REQUESTED','SCHEDULED','IN_PROGRESS','PASSED','FAILED','CANCELLED','NO_SHOW') DEFAULT 'REQUESTED',
    certificate_number VARCHAR(60) UNIQUE,
    certificate_issue_date DATE,
    certificate_expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES traffic_vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (inspector_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_inspection_schedule (inspection_location, scheduled_at, inspection_status),
    INDEX idx_inspection_expiry (certificate_expiry_date)
);

-- 14.15 Inspection defects
CREATE TABLE inspection_defects (
    defect_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inspection_id BIGINT UNSIGNED NOT NULL,
    defect_code VARCHAR(50),
    defect_description TEXT NOT NULL,
    severity ENUM('MINOR','MAJOR','CRITICAL','INFO') DEFAULT 'MINOR',
    rectified TINYINT(1) DEFAULT 0,
    rectified_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES vehicle_inspections(inspection_id) ON DELETE CASCADE,
    INDEX idx_inspection_defects (inspection_id, severity, rectified)
);

-- 14.16 Public vehicle permits
CREATE TABLE public_vehicle_permits (
    permit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED,
    permit_number VARCHAR(60) UNIQUE,
    permit_type VARCHAR(100) NOT NULL,
    permit_status ENUM('PENDING','ACTIVE','EXPIRED','SUSPENDED','REVOKED','REJECTED') DEFAULT 'PENDING',
    conditions TEXT,
    route_details TEXT,
    issue_date DATE,
    expiry_date DATE,
    issued_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES traffic_vehicles(vehicle_id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_permit_vehicle (vehicle_id, permit_status),
    INDEX idx_permit_expiry (expiry_date, permit_status)
);

-- 14.17 Driving schools
CREATE TABLE driving_schools (
    school_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    school_name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(60) UNIQUE,
    address VARCHAR(500) NOT NULL,
    district VARCHAR(100),
    contact_phone VARCHAR(30),
    contact_email VARCHAR(190),
    school_status ENUM('PENDING','REGISTERED','SUSPENDED','CLOSED','REJECTED') DEFAULT 'PENDING',
    num_instructors INT DEFAULT 0,
    num_vehicles INT DEFAULT 0,
    issue_date DATE,
    expiry_date DATE,
    reviewed_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_school_name_status (school_name, school_status)
);

-- 14.18 Driving instructors
CREATE TABLE driving_instructors (
    instructor_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    school_id BIGINT UNSIGNED,
    application_id BIGINT UNSIGNED,
    instructor_number VARCHAR(60) UNIQUE,
    full_name VARCHAR(200),
    national_id VARCHAR(50),
    qualification_details TEXT,
    years_experience INT,
    instructor_status ENUM('PENDING','AUTHORISED','SUSPENDED','EXPIRED','REJECTED') DEFAULT 'PENDING',
    issue_date DATE,
    expiry_date DATE,
    reviewed_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (school_id) REFERENCES driving_schools(school_id) ON DELETE SET NULL,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_instructor_school (school_id, instructor_status)
);

-- 14.19 Traffic fines
CREATE TABLE traffic_fines (
    fine_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fine_reference VARCHAR(40) NOT NULL UNIQUE,
    offender_user_id BIGINT UNSIGNED,
    offender_name VARCHAR(200),
    national_id VARCHAR(50),
    vehicle_registration VARCHAR(50),
    offence_description VARCHAR(500) NOT NULL,
    offence_date DATE NOT NULL,
    offence_location VARCHAR(200),
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'LSL',
    fine_status ENUM('UNPAID','PAID','DISPUTED','CANCELLED','WRITTEN_OFF') DEFAULT 'UNPAID',
    issued_by BIGINT UNSIGNED,
    paid_at DATETIME,
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (offender_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_fine_offender (offender_user_id, fine_status),
    INDEX idx_fine_vehicle (vehicle_registration, fine_status)
);

-- 14.20 Licence clearance requests
CREATE TABLE licence_clearance_requests (
    clearance_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    applicant_user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    licence_number VARCHAR(60),
    vehicle_registration VARCHAR(50),
    clearance_type ENUM('LICENCE_RENEWAL','VEHICLE_REGISTRATION','OWNERSHIP_TRANSFER','OTHER') NOT NULL,
    clearance_status ENUM('PENDING','IN_PROGRESS','CLEARED','BLOCKED','EXPIRED') DEFAULT 'PENDING',
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    cleared_at DATETIME,
    cleared_by BIGINT UNSIGNED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (cleared_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_clearance_user (applicant_user_id, clearance_status)
);

-- 14.21 Traffic payments
CREATE TABLE traffic_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED,
    fine_id BIGINT UNSIGNED,
    payer_user_id BIGINT UNSIGNED NOT NULL,
    payment_reference VARCHAR(100) NOT NULL UNIQUE,
    provider_reference VARCHAR(150),
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'LSL',
    payment_method ENUM('CARD','BANK_TRANSFER','MOBILE_MONEY','CASH_OFFICE','OTHER') NOT NULL,
    payment_status ENUM('INITIATED','PENDING','SUCCESS','FAILED','REVERSED','REFUNDED') DEFAULT 'INITIATED',
    payment_purpose VARCHAR(100),
    paid_at DATETIME,
    verified_by BIGINT UNSIGNED,
    verified_at DATETIME,
    receipt_key VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (fine_id) REFERENCES traffic_fines(fine_id) ON DELETE SET NULL,
    FOREIGN KEY (payer_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_traffic_payment_user (payer_user_id, payment_status)
);

-- 14.22 Traffic complaints
CREATE TABLE traffic_complaints (
    complaint_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    application_id BIGINT UNSIGNED,
    complaint_type ENUM('DELAY','PAYMENT','RECORD_ERROR','STAFF_SERVICE','LICENCE','REGISTRATION','INSPECTION','PERMIT','SCHOOL_INSTRUCTOR','OTHER') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    complaint_status ENUM('OPEN','ASSIGNED','IN_REVIEW','WAITING_FOR_USER','ESCALATED','RESOLVED','CLOSED') DEFAULT 'OPEN',
    assigned_to BIGINT UNSIGNED,
    admin_response TEXT,
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES traffic_applications(application_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_traffic_complaint_status (complaint_status, created_at)
);

-- ============================================================
-- DONE — All tables created
-- ============================================================

SELECT 'Database lesotho_gov created successfully with all modules.' AS status;
Step 3: Verify
sql
USE lesotho_gov;
SHOW TABLES;
Step 4: Add the photo_path column (if your DB predates the photo feature)
If you have an older database, run:

sql
USE lesotho_gov;

ALTER TABLE users
  ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL
  AFTER national_id;
If you get "Duplicate column name 'photo_path'", skip this step.

Firebase Setup
You do NOT need to create a Firebase project. We use one shared project. You only need to:

Get the FirebaseAccountKey.json from the team lead

Place it in backend/

Make sure the .env file points to it correctly

The .env file should look like:

env
PORT=3001
BACKEND_URL=http://localhost:3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=lesotho_gov

FIREBASE_SERVICE_ACCOUNT=./FirebaseAccountKey.json
Important: Change DB_PASSWORD to your own MySQL root password.

Important: Leave FIREBASE_SERVICE_ACCOUNT=./FirebaseAccountKey.json as-is — the relative path works on any machine.

Admin Account
The only admin is:

text
Email: kramohlabi7@gmail.com
When you log in with this email:

The backend automatically sets role = 'admin' and account_type = 'admin'

The frontend automatically redirects you to /admin/home-affairs

You see the Administrator Dashboard instead of the citizen dashboard

How to Test Admin Access
Log in with kramohlabi7@gmail.com

You should land on /admin/home-affairs

You should see the review queue

If it doesn't work:

sql
USE lesotho_gov;
UPDATE users
SET role = 'admin', account_type = 'admin'
WHERE email = 'kramohlabi7@gmail.com';
Then log out and log back in.

How Citizens Are Handled
Everyone else who registers:

Gets role = 'client' and account_type = 'citizen'

Gets an auto-assigned National ID (e.g., LS000000001)

Sees the Home Affairs Citizen Dashboard

Cannot access /api/admin/* (returns 403 Forbidden)

Project Structure
text
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
│   │   ├── photos/                  # User profile photos
│   │   ├── passport_photos/         # Passport-specific photos
│   │   ├── police_evidence/         # Police evidence uploads
│   │   ├── police_certified/        # Police certified documents
│   │   ├── police_letters/          # Police letters
│   │   ├── traffic_documents/       # Traffic documents
│   │   ├── finance_documents/       # Finance documents
│   │   └── pension_documents/       # Pension documents
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
│   │   │   ├── HomeAffairsDashboardAdmin.js
│   │   │   ├── PassportOfficeDashboardAdmin.js
│   │   │   ├── PoliceDashboardAdmin.js
│   │   │   ├── FinanceDashboardAdmin.js
│   │   │   ├── PensionsDashboardAdmin.js
│   │   │   └── TrafficDashboardAdmin.js
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
What's Built So Far
Authentication
Email + password registration

Google sign-in

Phone OTP (SMS)

Auto-redirect to appropriate dashboard based on role

Session persistence via sessionStorage

Citizen Features
Public landing page at / with ministry cards

Home Affairs Citizen Dashboard (/home-affairs-dashboard)

Tabs: Apply, My Applications, Notifications, Profile

Card grid of services grouped by module (NICR, Immigration, LRMIS)

Dynamic form per service (fields loaded from database)

File upload for documents

Application tracking with status badges

Real-time notifications

Profile photo upload (displayed on ID card and certificates)

Certificate viewer with real-looking layouts

National ID card

Birth / Death / Marriage certificates

Immigration permits

Livestock certificates

PDF export — download any certificate as a PDF file

Passport Office Module
Tiered passport applications (Standard, Urgent, Express, Emergency, Official, Diplomatic)

Application tracking with status updates

Biometrics capture and appointment scheduling

Payment recording

Complaint submission and response

PDF passport download with profile photo

Traffic Module
Driver's licence applications (learner, full, renewal, replacement, correction)

Vehicle registration (new, imported, second-hand local/foreign, transfer)

Roadworthiness and fitness inspections

Public motor vehicle permits

Driving school and instructor registration

Traffic fine management and online payment

Licence clearance requests

PDF driver's licence download with profile photo

Police Services Module
Non-emergency crime reporting (theft, lost items, fraud, cybercrime, missing persons)

Police clearance applications

Police report requests

Witness information submission

Complaint submission and response

Document certification with automatic stamping

Police letters (acknowledgement, affidavit, loss report, confirmation, witness statement)

Feedback submission

Finance Module
Tax-related requests (clearance, declaration)

Supplier/vendor registration

Invoice and payment claims

Tax refund requests

Government payment processing

Enquiry and complaint tickets

Pensions Module
Pension registration (PODCPF, Old Age Pension)

Benefit applications (retirement, resignation, termination, retrenchment, disability, death, old age)

Contribution tracking

Payment recording and history

Government debt deductions

Enquiry and complaint management

Admin Features
Administrator Dashboard (/admin/home-affairs)

Stats cards (submitted, under review, approved, ready, completed)

Total users and applications

Application queue with filters (status + module)

Photo thumbnail in queue

Applicant photo in detail panel

Review submitted information

View uploaded documents

View history of all actions

Update status (approve, reject, request info, mark ready, complete)

Add optional note for the citizen

Auto-notification to citizen on status change

Module-specific Admin Dashboards

Passport Admin

Traffic Admin

Police Admin

Finance Admin

Pensions Admin

Database
Single database: lesotho_gov

Full schema with 60+ tables

Service catalogue with 30+ services

Form field definitions per service

Auto-generated National IDs

Audit logging

Photo storage

Feature Guide
For Citizens
1. Register
Go to http://localhost:3000/register

Choose Email, Phone, or Google

Fill in your details

Get an auto-assigned National ID (e.g., LS000000001)

2. Apply for a Service
Log in and land on the appropriate dashboard

Click the Apply tab

Choose a service category

Click Start application on any service

Fill the form and upload any required documents

Click Submit application

Receive a reference number

3. Upload Your Photo
Go to the Profile tab

In the Identity photo section, click Upload photo

Choose a JPG or PNG (max 5 MB)

Your photo appears on the ID card preview

It will appear on all future certificates and documents

4. Track Applications
Go to the My applications tab

See every application with status badge

Click View details for full history

Click Certificate or document button once approved

5. Download Documents
Open any approved application

Click the document button (Certificate, Licence, Passport, etc.)

Click Download PDF

The PDF contains your photo and all your information

6. View Notifications
Go to the Notifications tab

Every status change triggers a notification

Click Mark as read to clear

For Admins
1. Log In as Admin
Use kramohlabi7@gmail.com

You land on /admin/home-affairs

2. Navigate Between Offices
Use the Admin sub-navigation bar at the top:

Home Affairs Admin

Passport Admin

Police Admin

Finance Admin

Pensions Admin

Traffic Admin

3. Review Applications
See the queue with all submitted applications

Filter by type or status

Each row shows the applicant's photo as a thumbnail

Click Open on any row to see full details

4. Process an Application
Click Open on any row

See the applicant's photo, submitted information, documents, and history

Choose a status action (Under review, Request info, Approve, Reject, etc.)

Add an optional note for the citizen

The citizen gets an automatic notification

5. Module-Specific Actions
Passport Admin:

Record biometrics

Schedule appointments

Issue passports

Record collections

Process payments

Respond to complaints

Traffic Admin:

Issue driver's licences

Register vehicles

Schedule driving tests

Record test results

Issue and manage fines

Process clearances

Manage driving schools

Police Admin:

Update case statuses

Schedule appointments

Verify evidence

Certify documents with automatic stamping

Respond to complaints

View feedback

Finance Admin:

Process tax requests

Review supplier registrations

Process invoice claims

Handle tax refunds

Record payments

Respond to tickets

Pensions Admin:

Verify members

Process benefit applications

Record assessments

Manage contributions

Process payments

Handle government debts

Respond to enquiries

API Reference
All authenticated endpoints require:

text
Authorization: Bearer <firebase-id-token>
Auth
Method	Path	Purpose
POST	/api/register	Create citizen account (auto-assigns National ID)
POST	/api/login	Login (verifies token, returns user)
GET	/api/me	Get current user
POST	/api/me/photo	Upload profile photo
Home Affairs
Method	Path	Purpose
GET	/api/services	List all services (optionally ?module=NICR)
GET	/api/services/:id	Get service + form fields
POST	/api/applications	Submit new application (multipart form)
GET	/api/applications/my	List current user's applications
GET	/api/applications/:id	Get full application detail
GET	/api/certificates/:id	Get certificate data for PDF
GET	/api/notifications	List user's notifications
POST	/api/notifications/:id/read	Mark as read
Passport
Method	Path	Purpose
GET	/api/passport/services	List passport services
GET	/api/passport/services/:id	Get service + form fields
POST	/api/passport/applications	Submit application
GET	/api/passport/applications/my	List user's applications
GET	/api/passport/applications/:id	Get full detail
DELETE	/api/passport/applications/:id	Delete application
GET	/api/passport/notifications	List notifications
POST	/api/passport/complaints	Submit complaint
GET	/api/passport/complaints/my	List user's complaints
GET	/api/passport/certificates/:id	Get passport for PDF
Traffic
Method	Path	Purpose
GET	/api/traffic/categories	List categories
POST	/api/traffic/applications	Submit application
GET	/api/traffic/applications/my	List user's applications
GET	/api/traffic/applications/:id	Get full detail
DELETE	/api/traffic/applications/:id	Delete application
GET	/api/traffic/licences/my	List user's licences
GET	/api/traffic/vehicles/my	List user's vehicles
GET	/api/traffic/fines/my	List user's fines
POST	/api/traffic/fines/:id/pay	Pay a fine
GET	/api/traffic/clearances/my	List clearances
GET	/api/traffic/notifications	List notifications
POST	/api/traffic/complaints	Submit complaint
GET	/api/traffic/complaints/my	List user's complaints
GET	/api/traffic/payments/my	List payments
GET	/api/traffic/driving-schools	List driving schools
GET	/api/traffic/track/:reference	Track by reference
Police
Method	Path	Purpose
GET	/api/police/categories	List categories
POST	/api/police/applications	Submit application
GET	/api/police/applications/my	List user's applications
GET	/api/police/applications/:id	Get full detail
DELETE	/api/police/applications/:id	Delete application
GET	/api/police/notifications	List notifications
POST	/api/police/feedback	Submit feedback
GET	/api/police/feedback/my	List feedback
GET	/api/police/letter-templates	List letter templates
POST	/api/police/letters	Issue a letter
GET	/api/police/letters/my	List user's letters
POST	/api/police/certified-documents	Submit document for certification
GET	/api/police/certified-documents/my	List certified documents
Finance
Method	Path	Purpose
GET	/api/finance/services	List services
POST	/api/finance/requests	Submit request
GET	/api/finance/requests/my	List user's requests
GET	/api/finance/requests/:id	Get full detail
DELETE	/api/finance/requests/:id	Delete request
GET	/api/finance/payments/my	List payments
POST	/api/finance/tickets	Submit enquiry
GET	/api/finance/tickets/my	List tickets
GET	/api/finance/notifications	List notifications
GET	/api/finance/suppliers/my	List suppliers
Pensions
Method	Path	Purpose
GET	/api/pensions/programmes	List programmes
GET	/api/pensions/me	Get member profile
POST	/api/pensions/register	Register as member
POST	/api/pensions/applications	Submit application
GET	/api/pensions/applications/my	List applications
GET	/api/pensions/applications/:id	Get full detail
DELETE	/api/pensions/applications/:id	Delete application
GET	/api/pensions/contributions/my	List contributions
GET	/api/pensions/payments/my	List payments
GET	/api/pensions/estimate/my	Get benefit estimate
POST	/api/pensions/enquiries	Submit enquiry
GET	/api/pensions/enquiries/my	List enquiries
GET	/api/pensions/notifications	List notifications
Admin (requires admin role)
Method	Path	Purpose
GET	/api/admin/stats	Home Affairs dashboard metrics
GET	/api/admin/applications	Home Affairs queue with filters
POST	/api/admin/applications/:id/status	Update application status
GET	/api/passport/admin/stats	Passport dashboard metrics
GET	/api/passport/admin/applications	Passport queue
POST	/api/passport/admin/applications/:id/status	Update passport status
POST	/api/passport/admin/applications/:id/issue	Issue passport
POST	/api/passport/admin/applications/:id/biometrics	Record biometrics
POST	/api/passport/admin/applications/:id/appointment	Schedule appointment
POST	/api/passport/admin/applications/:id/payment	Record payment
GET	/api/passport/admin/complaints	List complaints
POST	/api/passport/admin/complaints/:id/respond	Respond to complaint
GET	/api/traffic/admin/stats	Traffic dashboard metrics
GET	/api/traffic/admin/applications	Traffic queue
POST	/api/traffic/admin/applications/:id/status	Update traffic status
POST	/api/traffic/admin/applications/:id/issue-licence	Issue licence
POST	/api/traffic/admin/applications/:id/register-vehicle	Register vehicle
POST	/api/traffic/admin/applications/:id/test-booking	Schedule test
POST	/api/traffic/admin/applications/:id/payment	Record payment
GET	/api/traffic/admin/fines	List fines
POST	/api/traffic/admin/fines	Create fine
POST	/api/traffic/admin/fines/:id/payment	Mark fine paid
GET	/api/traffic/admin/clearances	List clearances
POST	/api/traffic/admin/clearances/:id/update	Update clearance
GET	/api/traffic/admin/complaints	List complaints
POST	/api/traffic/admin/complaints/:id/respond	Respond to complaint
GET	/api/traffic/admin/driving-schools	List schools
POST	/api/traffic/admin/driving-schools/:id/status	Update school status
GET	/api/traffic/admin/payments	List payments
GET	/api/police/admin/stats	Police dashboard metrics
GET	/api/police/admin/applications	Police queue
POST	/api/police/admin/applications/:id/status	Update police status
POST	/api/police/admin/applications/:id/payment	Record payment
POST	/api/police/admin/applications/:id/appointment	Schedule appointment
POST	/api/police/admin/evidence/:id/verify	Verify evidence
GET	/api/police/admin/feedback	List feedback
GET	/api/police/admin/certified-documents	List certified documents
POST	/api/police/admin/certified-documents/:id/certify	Certify document
POST	/api/police/admin/certified-documents/:id/status	Update status
GET	/api/police/admin/letters	List letters
GET	/api/finance/admin/stats	Finance dashboard metrics
GET	/api/finance/admin/requests	Finance queue
POST	/api/finance/admin/requests/:id/status	Update finance status
GET	/api/finance/admin/suppliers	List suppliers
POST	/api/finance/admin/suppliers/:id/status	Update supplier status
GET	/api/finance/admin/invoices	List invoices
POST	/api/finance/admin/invoices/:id/status	Update invoice status
GET	/api/finance/admin/refunds	List refunds
POST	/api/finance/admin/refunds/:id/status	Update refund status
GET	/api/finance/admin/payments	List payments
POST	/api/finance/admin/payments	Record payment
GET	/api/finance/admin/tickets	List tickets
POST	/api/finance/admin/tickets/:id/respond	Respond to ticket
GET	/api/pensions/admin/stats	Pensions dashboard metrics
GET	/api/pensions/admin/applications	Pensions queue
POST	/api/pensions/admin/applications/:id/status	Update pension status
POST	/api/pensions/admin/applications/:id/assessment	Record assessment
GET	/api/pensions/admin/members	List members
POST	/api/pensions/admin/members/:id/status	Update member status
POST	/api/pensions/admin/contributions	Record contribution
GET	/api/pensions/admin/payments	List payments
POST	/api/pensions/admin/payments	Record payment
GET	/api/pensions/admin/debts	List debts
POST	/api/pensions/admin/debts/:id/status	Update debt status
GET	/api/pensions/admin/enquiries	List enquiries
POST	/api/pensions/admin/enquiries/:id/respond	Respond to enquiry
Git Workflow
First time
bash
git clone https://github.com/Boni-01/home-affairs.git
cd home-affairs
Every time you start working
bash
git pull origin main
Create your own branch
bash
git checkout -b feature/your-name-task
After making changes
bash
git add .
git commit -m "Clear description of what you changed"
git push origin feature/your-name-task
Then open a Pull Request on GitHub.

IMPORTANT — Never Commit
The following are already in .gitignore and must never be committed:

backend/.env

backend/FirebaseAccountKey.json

backend/uploads/

node_modules/

Troubleshooting
Cannot find module 'dotenv'
You forgot to install backend dependencies:

bash
cd backend
npm install express cors dotenv mysql2 firebase-admin multer pdf-lib
Cannot read properties of undefined (reading 'cert')
Your Server.js is using old Firebase Admin API. Pull the latest:

bash
git pull origin main
ER_ACCESS_DENIED_ERROR / Access denied for user 'root'
Your MySQL password in .env is wrong. Check by running:

bash
mysql -u root -p
Then update .env:

text
DB_PASSWORD=your_actual_password
ER_BAD_DB_ERROR: Unknown database 'lesotho_gov'
You haven't created the database:

bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
Table 'lesotho_gov.users' doesn't exist
The schema wasn't loaded. Run:

bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
Unknown column 'photo_path'
Run the migration:

sql
USE lesotho_gov;
ALTER TABLE users ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL AFTER national_id;
auth/network-request-failed
Your network is blocking Firebase. Fix by:

Change DNS to 1.1.1.1 and 8.8.8.8

Or install Cloudflare WARP

Or disable antivirus HTTPS scanning

Important: If login and register refuse to work, download the Cloudflare WARP client, connect, then run the app again.

Steps:

Download Cloudflare WARP for your operating system from https://1.1.1.1/

Install it

Open Cloudflare WARP and click Connect

Wait for it to show "Connected"

Run the backend and frontend again

Try logging in or registering

PDF doesn't include the photo
The photo must be accessible via http://localhost:3001/uploads/.... Check:

Backend is running

backend/uploads/photos/ contains the uploaded file

The photo_url in the API response starts with http://localhost:3001/

If the URL is relative, update .env:

text
BACKEND_URL=http://localhost:3001
localhost:3000 refused to connect
Frontend isn't running:

bash
cd frontend
npm start
localhost:3001 refused to connect
Backend isn't running:

bash
cd backend
npm start
Port already in use
Windows:

bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
Mac/Linux:

bash
lsof -i :3000
kill -9 <PID>
Can't log in as admin
Make sure:

You're using exactly kramohlabi7@gmail.com

Run this SQL:

sql
UPDATE users SET role = 'admin', account_type = 'admin'
WHERE email = 'kramohlabi7@gmail.com';
Log out and log back in

PDF generation fails
Make sure the frontend has jspdf and html2canvas installed:

bash
cd frontend
npm install jspdf html2canvas
Police document certification fails
Make sure the backend has pdf-lib installed:

bash
cd backend
npm install pdf-lib
Also ensure police_stamp.png exists in the backend folder for the stamp image.

Security Notes
Never Commit These Files
.env (backend environment variables)

FirebaseAccountKey.json (Firebase Admin SDK key)

uploads/ (user documents and photos)

Never Share These Files
Firebase private key — share only via private DM, never in group chat

.env with real passwords — same

If the Firebase Key Leaks
Go to Google Cloud Console then IAM then Service Accounts

Delete the exposed key

Generate a new one

Distribute privately

Update .gitignore to be sure it's excluded

What's Stored Where
Data	Stored In	Public?
Email, password	Firebase Auth	No
Full name, phone, National ID	MySQL users table	No
Profile photo	backend/uploads/photos/	Yes (URL is public on localhost)
Application documents	backend/uploads/documents/	Yes (URL is public on localhost)
Applications, statuses	MySQL	No
Certificates	Generated on-the-fly (PDF)	No
Note: In development, /uploads/* is served publicly. In production, this would need authentication.

What's Coming Next
Cross-module integration (single citizen profile reused everywhere)

Payment integration (mock payment gateway)

Appointment booking system

Digital wallet for storing all issued documents

SMS and email notifications

Advanced reporting and analytics

Mobile application

Team Responsibilities
Member	Student Number	Primary Focus
Lehakoe Panyane	901019088	Backend, Firebase Auth
Sehloho Tsiu	901018558	MySQL schema, data modelling
Bonang Sakoane	901019739	Citizen frontend pages
Katleho Ramohlabi	901018965	Officer dashboards, admin
Malefu Mokitimi	901018843	Evaluation, documentation
All members: contribute to their own branch, submit PRs, and participate in the presentation.

Need Help?
First: check the Troubleshooting section

Then: paste the full error in the group chat

Finally: tag the team lead if stuck for more than 30 minutes

Last Updated: Week of 10 October 2026
Version: MVP 3.0 — All modules with photos and PDF document downloads
Next Milestone: Cross-module integration and payment gateway
