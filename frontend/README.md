# 📘 Lesotho Integrated Government Services System

**Project:** Integrated Government Services System for Lesotho  
**Course:** BIHC3110 — Human Computer Interaction  
**Institution:** Limkokwing University of Creative Technology — Lesotho  
**Team:** 5 members

---

## 📖 Table of Contents

1. [What This Project Is](#what-this-project-is)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [First-Time Setup](#first-time-setup)
5. [How to Run the Project](#how-to-run-the-project)
6. [Database Setup](#database-setup)
7. [Firebase Setup](#firebase-setup)
8. [Project Structure](#project-structure)
9. [Git Workflow](#git-workflow)
10. [Troubleshooting](#troubleshooting)
11. [What's Working Now](#whats-working-now)
12. [What's Coming Next](#whats-coming-next)

---

## What This Project Is

An **Integrated Digital Public Service System** for Lesotho that connects:

- 🏛️ **Home Affairs** (ID, birth/marriage certificates, citizenship)
- 🛂 **Passport Services** (applications, tracking, collection)
- 🚗 **Traffic** (driver's licences, vehicle registration)
- 💰 **Finance** (payments, tax refunds, procurement)
- 👴 **Pensions** (beneficiary verification, payments)
- 🚔 **Police** (non-emergency reporting, case management)

**Core concept:** One verified citizen profile, reused across all government services — no more resubmitting the same documents to different departments.

---

## Tech Stack

### Frontend
- React (Create React App)
- React Router for navigation
- Firebase Auth (Email/Password, Google, Phone OTP)
- Inline CSS with Lesotho flag colors

### Backend
- Node.js + Express (single-file server: `Server.js`)
- MySQL for all government data (citizens, applications, payments, audit logs)
- Firebase Admin SDK for verifying ID tokens

### Auth
- Firebase Authentication (handles login/registration)
- MySQL stores profile data linked by `firebase_uid`

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
git clone <REPO_URL>
cd home-affairs
```

### Step 2: Install frontend dependencies

```bash
cd frontend
npm install
```

### Step 3: Install backend dependencies

```bash
cd ../backend
npm install
```

### Step 4: Get the secret files from the team lead

Two files are **NOT in Git** (security reasons). Ask the team lead to send them privately:

1. **`.env`** — Backend environment variables
2. **`FirebaseAccountKey.json`** — Firebase Admin SDK key

Place both files inside the `backend/` folder:

```
backend/
├── Server.js
├── package.json
├── .env                        ← add this
├── FirebaseAccountKey.json     ← add this
└── node_modules/
```

### Step 5: Set up MySQL database

See the [Database Setup](#database-setup) section below.

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
🔍 Looking for Firebase key at: .../FirebaseAccountKey.json
✅ Firebase Admin initialized
✅ MySQL connected
🚀  Server running on http://localhost:3001
🔐  Firebase Admin: connected
🗄️   MySQL: connected
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
{
  "status": "ok",
  "db": "connected",
  "firebase": "connected"
}
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

### Step 2: Create the database

Open MySQL Workbench **or** Command Prompt:

```bash
mysql -u root -p
```

Enter your root password, then run:

```sql
CREATE DATABASE IF NOT EXISTS lesotho_gov;
USE lesotho_gov;
```

### Step 3: Create all required tables

Copy and paste **ALL** the SQL below into MySQL Workbench and execute it:

```sql
USE lesotho_gov;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  account_type ENUM('citizen','officer','admin') NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  account_verified BOOLEAN DEFAULT FALSE,
  status ENUM('active','suspended','inactive') DEFAULT 'active',
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- CITIZEN PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS citizen_profiles (
  citizen_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
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
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- OFFICERS
-- ============================================================
CREATE TABLE IF NOT EXISTS officers (
  officer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  employee_number VARCHAR(30) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(30),
  position VARCHAR(100),
  department_id INT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- OTP VERIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  otp_id INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid VARCHAR(128),
  phone VARCHAR(30),
  purpose ENUM('registration','login','reset') DEFAULT 'registration',
  channel ENUM('sms','email') DEFAULT 'sms',
  status ENUM('pending','verified','expired','blocked') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128),
  action VARCHAR(30),
  table_name VARCHAR(100),
  record_id INT,
  old_value JSON,
  new_value JSON,
  ip_address VARCHAR(45),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- LOGIN HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS login_history (
  login_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128),
  login_time DATETIME,
  logout_time DATETIME,
  ip_address VARCHAR(45),
  device VARCHAR(255),
  success BOOLEAN DEFAULT TRUE
);
```

### Step 4: Verify

```sql
USE lesotho_gov;
SHOW TABLES;
```

You should see 6 tables:

```
audit_logs
citizen_profiles
login_history
officers
otp_verifications
users
```

---

## Firebase Setup

**You do NOT need to create a Firebase project.** We use one shared project. You only need to:

1. Get the `FirebaseAccountKey.json` from the team lead
2. Place it in `backend/`
3. Make sure the `.env` file points to it correctly

The `.env` file should look like:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=lesotho_gov

FIREBASE_SERVICE_ACCOUNT=C:/path/to/your/backend/FirebaseAccountKey.json
```

⚠️ **Change `DB_PASSWORD`** to your own MySQL root password.

⚠️ **Change `FIREBASE_SERVICE_ACCOUNT`** to match your machine's path.

---

## Project Structure

```
home-affairs/
├── backend/
│   ├── Server.js
│   ├── package.json
│   ├── .env                       (NOT in git)
│   ├── FirebaseAccountKey.json    (NOT in git)
│   └── node_modules/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── Database/
│   │   │   └── firebase.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── dashboards/
│   │   │   ├── HomeDashboard.js
│   │   │   ├── HomeAffairsDashboard.js
│   │   │   ├── PassportOfficeDashboard.js
│   │   │   ├── PensionsDashboard.js
│   │   │   ├── PoliceDashboard.js
│   │   │   ├── TrafficDashboard.js
│   │   │   └── FinanceDashboard.js
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   └── Footer.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---

## Git Workflow

### First time

```bash
git clone <REPO_URL>
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

---

## Troubleshooting

### 🔴 Cannot find module 'dotenv'

You forgot to install backend dependencies:

```bash
cd backend
npm install express cors dotenv mysql2 firebase-admin
```

### 🔴 Cannot read properties of undefined (reading 'cert')

Your `Server.js` is using old Firebase Admin API. Pull the latest:

```bash
git pull origin main
```

### 🔴 ER_ACCESS_DENIED_ERROR / Access denied for user 'root'

Your MySQL password in `.env` is wrong. Check by running:

```bash
mysql -u root -p
```

Then update `.env`:

```
DB_PASSWORD=your_actual_password
```

### 🔴 ER_BAD_DB_ERROR: Unknown database 'lesotho_gov'

You haven't created the database:

```sql
CREATE DATABASE lesotho_gov;
```

### 🔴 Table 'lesotho_gov.users' doesn't exist

Run the table creation SQL. See [Database Setup Step 3](#step-3-create-all-required-tables).

### 🔴 auth/network-request-failed

Your network is blocking Firebase. Fix by:

1. Change DNS to `1.1.1.1` and `8.8.8.8`
2. Or install [Cloudflare WARP](https://1.1.1.1/)
3. Or disable antivirus HTTPS scanning

### 🔴 localhost:3000 refused to connect

Frontend isn't running:

```bash
cd frontend
npm start
```

### 🔴 localhost:3001 refused to connect

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

---

## What's Working Now

- ✅ Firebase Authentication — Email, Google, Phone OTP
- ✅ User registration (citizen + officer)
- ✅ Login across all 3 methods
- ✅ Session persistence (sessionStorage)
- ✅ MySQL saves `firebase_uid`, email, phone, profile
- ✅ Audit log records every registration
- ✅ Login history records every login
- ✅ OTP verification log
- ✅ Role-based dashboard routing (frontend)
- ✅ Lesotho flag colors throughout UI
- ✅ Backend health check endpoint

---

## What's Coming Next

- 🔜 Service catalogue (`/api/services`)
- 🔜 Applications submission + tracking (`/api/applications`)
- 🔜 Appointments booking (`/api/appointments`)
- 🔜 Mock payment integration (`/api/payments`)
- 🔜 Notifications (SMS/email log)
- 🔜 Officer queues (`/api/officer/applications`)
- 🔜 Admin dashboard with reports
- 🔜 Digital wallet for documents
- 🔜 Full end-to-end demo

---

## 👥 Team Responsibilities

| Member | Student Number | Primary Focus |
|---|---|---|
| Lehakoe Panyane | 901019088 | Backend, Firebase Auth |
| Sehloho Tsiu | 901018558 | MySQL schema, data modelling |
| Bonang Sakoane | 901019739 | Citizen frontend pages |
| Katleho Ramohlabi | 901018965 | Officer dashboards |
| Malefu Mokitimi | 901018843 | Evaluation, documentation |

**All members:** contribute to their own branch, submit PRs, and participate in the presentation.

---

## 📞 Need Help?

1. **First:** check the [Troubleshooting](#troubleshooting) section
2. **Then:** paste the full error in the group chat
3. **Finally:** tag the team lead if stuck for more than 30 minutes

---

## 🔒 Security Notes

- **Never commit** `.env` or `FirebaseAccountKey.json` to Git
- **Never share** the Firebase key in the group chat
- If the key leaks, immediately:
  1. Go to Google Cloud Console → IAM → Service Accounts
  2. Delete the exposed key
  3. Generate a new one
  4. Distribute privately

The `.gitignore` in `backend/` already excludes:

```
node_modules/
.env
FirebaseAccountKey.json
*.log
```

---

**Last Updated:** Week of 8 October 2026  
**Version:** MVP 1.0 — Authentication & Registration Complete  
**Next Milestone:** Services Catalogue + Applications Module