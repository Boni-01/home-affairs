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

### Step 2: Create the database and tables

Open MySQL Workbench or Command Prompt, then run the **complete schema** from `backend/database/lesotho_gov_complete.sql`.

**Using the CLI:**

```bash
mysql -u root -p < backend/database/lesotho_gov_complete.sql
```

This creates:
- The `lesotho_gov` database
- All 25 tables
- All service catalogue entries
- All form field definitions

### Step 3: Add the `photo_path` column (if missing)

If your database was created before the photo feature was added:

```sql
USE lesotho_gov;

ALTER TABLE users
  ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL
  AFTER national_id;
```

If you get "Duplicate column name 'photo_path'", skip this step.

### Step 4: Verify

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
