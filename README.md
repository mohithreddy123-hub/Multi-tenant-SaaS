<div align="center">
  <h1>🏢 TenantVault</h1>
  <p><b>🌍 Live Demo: <a href="https://multi-tenant-saa-s-nine.vercel.app">https://multi-tenant-saa-s-nine.vercel.app</a></b></p>
  <p>An enterprise-grade, multi-tenant SaaS platform — a Secure Private Workspace for startups and businesses. Built with Zero-Knowledge Privacy, Pay-to-Activate billing, Real-Time WebSockets, Collaborative Editing, and a full Team Management system.</p>

  [![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
  [![Django](https://img.shields.io/badge/Django-6.0-green.svg)](https://www.djangoproject.com/)
  [![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.3-blue.svg)](https://www.postgresql.org/)
  [![WebSockets](https://img.shields.io/badge/WebSockets-Django%20Channels-purple.svg)](https://channels.readthedocs.io/)
</div>

---

## 📖 Table of Contents
1. [About TenantVault](#-about-tenantvault)
2. [Core Architecture](#️-core-architecture)
3. [Key Features](#-key-features)
4. [Technology Stack](#️-technology-stack)
5. [Project Structure](#-project-structure)
6. [API Reference](#-api-endpoints)
7. [Setup & Installation](#-setup--installation)
8. [Future Roadmap](#-future-roadmap)

---

## 🚀 About TenantVault

**TenantVault** is a **B2B SaaS platform** that gives each company (tenant) its own completely isolated, encrypted workspace. It is not a generic storage tool — it is a **Secure Private Workspace** for teams to manage sensitive documents, ideas, and data with enterprise-grade security.

### Core Philosophy: **Privacy by Design**
Data isolation is enforced at the architectural level. A user from Company A can **never** access or see data from Company B — not through the UI, not through the API.

### What Makes It Enterprise-Grade?
- **PostgreSQL 18.3** — Concurrent multi-user read/write. No locking.
- **Zero-Knowledge Encryption** — AES-128 (Fernet) encrypts every file before it touches the disk. Not even the system admin can read tenant files.
- **Pay-to-Activate Model** — A company workspace is fully locked behind a mandatory payment gate. No payment = no access.
- **Multi-Step Onboarding** — A professional wizard-style signup with plan preview, password strength meter, and password confirmation.
- **Real-Time WebSockets** — Django Channels broadcasts live events to all users in a company room instantly.

---

## 🏗️ Core Architecture

TenantVault uses a **Shared Database, Shared Schema** architecture with strict JWT-based ID filtration.

```text
                     [ User Registers Company ]
                              │
                     [ Tenant Created in DB ]
                              │
               ┌──────────────────────────────┐
               │  Pay-to-Activate Gate (402)  │
               └──────────────────────────────┘
                              │
                    [ Payment Confirmed ]
                              │
           ┌──────────────────────────────────────┐
           │           PostgreSQL 18.3            │
           │                                      │
     [Tenant A — UserSurf]     [Tenant B — PowerGrowth]
       - 2/5 Users                - 1/20 Users
       - Encrypted Vault          - Encrypted Vault
       - Live Collab Sessions     - Live Collab Sessions
       - AuditLogs                - AuditLogs
```

Every API request carries a **JWT** that identifies the user and their company. Every single database query automatically filters by `tenant_id` — ensuring complete isolation.

---

## ✨ Key Features

### 🏢 Multi-Step Company Onboarding (Wizard)
A 3-step professional signup flow:
- **Step 1 — Company:** Company Name, Admin Username, Subscription Plan selection with a live plan preview card (Price / Users / Storage).
- **Step 2 — Security:** Email, Password with a 4-bar strength meter, Confirm Password with real-time match validation.
- On submit: workspace is created instantly. User is guided to complete activation payment.

### 💳 Pay-to-Activate Billing
- Every new workspace starts as `unpaid`.
- The backend returns HTTP `402 Payment Required` for any access attempt.
- The frontend `ProtectedRoute` intercepts this and renders the **PaymentWall**.
- PaymentWall supports **UPI** (PhonePe, GPay, Paytm) and **Credit/Debit Card** with PIN verification.
- On payment: workspace status transitions to `paid` and full access is immediately unlocked.
- **No bypass possible.** The gate is enforced on both backend and frontend.

### 👥 Team Management
- Admin dashboard page to manage all company members.
- **Slot progress bar** showing "X / Y users used" (color-coded: green → yellow → red).
- **Add Member modal** with username, email, password + confirm password, and role selection.
- **Remove member** with confirmation (admin cannot remove themselves).
- Backend enforces the plan's user limit (e.g., 5 for Starter). Returns 400 with an upgrade prompt if full.

### 📎 Smart File Upload (WhatsApp-Style)
Click **☁️ Upload** to reveal a floating glassmorphic attachment menu with 6 dedicated categories:

| Icon | Category | File Types |
|:---:|:---|:---|
| 🖼️ | Image | JPG, PNG, WebP, GIF, etc. |
| 🎬 | Video | MP4, MOV, AVI, etc. |
| 🎙️ | Audio | MP3, WAV, M4A (meeting recordings) |
| 📄 | Document | PDF, DOCX, XLSX, PPTX |
| 🗜️ | Archive | ZIP, RAR, 7Z |
| 📁 | Any File | All formats |

Each option pre-filters the OS file picker to show only the relevant type.

### 🔐 Zero-Knowledge Document Vault
- Files are asynchronously encrypted using **AES-128 (Fernet)** via **Celery background workers**.
- Encrypted bytes are securely stored on **Cloudinary**, avoiding ephemeral local disk limitations.
- Decryption only happens **in-memory** when an authorized user downloads a file.
- **Version history**: every re-upload creates a `DocumentVersion` snapshot.
- **Rollback**: replace the current file with any historical version with one click.
- **Analytics**: view per-file stats — views, downloads, and edits.
- **AuditLog**: every action (UPLOAD, DOWNLOAD, EDIT, DELETE, LOGIN) is recorded.

### ⚡ Real-Time WebSocket Features
- **Live Dashboard Sync (`DashboardConsumer`)**: If any user in the company uploads or deletes a file, every other user's dashboard instantly updates — no refresh needed.
- **Collaborative Text Editor (`EditorConsumer`)**: Multiple users from the same company can type in a shared document simultaneously with live remote cursors.

### ⚙️ Full Settings Panel
Six tabs: Profile, Security, Workspace, Billing & Plan, Notifications, Danger Zone.
- Update username, email, password (with current password check), company name.
- View plan features and upgrade options.

### ☁️ Cloud & Production Deployment
- **Frontend:** Deployed globally on **Vercel's Edge Network** with strict CORS validation.
- **Backend:** Hosted on **Render** utilizing Daphne ASGI for WebSocket support, plus an automated keep-alive ping to prevent free-tier cold starts.
- **Database & Cache:** Serverless **Neon PostgreSQL** combined with **Upstash Redis** for Celery workers and WebSocket channel layers.

---

## 🛠️ Technology Stack

| Component | Technology |
|:---|:---|
| **Backend** | Django 6.0, Django REST Framework |
| **Real-Time** | Daphne (ASGI), Django Channels, WebSockets |
| **Database** | PostgreSQL 18.3 (Neon Serverless) |
| **Frontend** | React 19, Vite, React Router v6, Axios |
| **Security** | AES-128 (Fernet), JWT (SimpleJWT), CORS |
| **Styling** | Vanilla CSS — custom dark glassmorphism design system |
| **Task Queue**| Celery, Redis (Upstash) |
| **Storage**   | Cloudinary (Secure Cloud Storage) |
| **Deployment**| Render (Backend), Vercel (Frontend) |

---

## 📂 Project Structure

```text
TenantVault/
├── backend/
│   ├── settings.py       # Full config: PostgreSQL, JWT, Channels, CORS, Encryption key
│   ├── asgi.py           # ASGI entry point (WebSocket + HTTP routing)
│   └── urls.py           # Root URL router
│
├── core/                 # Main Django application
│   ├── models.py         # 8 models: Tenant, User, Subscription, Invoice,
│   │                     #           Document, DocumentVersion, AuditLog, FileAnalytics
│   ├── views.py          # 15+ API views (auth, billing, team, documents, settings)
│   ├── serializers.py    # JSON ↔ Python object conversion
│   ├── urls.py           # All API endpoint routes
│   ├── consumers.py      # WebSocket: DashboardConsumer + EditorConsumer
│   ├── routing.py        # WebSocket URL routing
│   ├── admin.py          # Django Admin panel registrations
│   └── utils/
│       └── encryption.py # AES-128 Fernet encrypt/decrypt helpers
│
├── frontend/src/
│   ├── App.jsx           # Router + ProtectedRoute (payment gate interceptor)
│   ├── api.js            # Axios instance (JWT auto-attach + 401 global handler)
│   ├── index.css         # Complete dark glassmorphism design system
│   ├── contexts/
│   │   └── AuthContext.jsx  # Global auth state (user, login, logout)
│   └── pages/
│       ├── Login.jsx         # JWT login
│       ├── Signup.jsx        # ★ Multi-step onboarding wizard
│       ├── Dashboard.jsx     # Stats overview + live WebSocket sync
│       ├── PaymentWall.jsx   # ★ Activation payment gate (UPI + Card)
│       ├── Documents.jsx     # ★ Vault: upload/download/version/analytics
│       ├── Team.jsx          # ★ Team management (add/remove members)
│       ├── Editor.jsx        # Real-time collaborative text editor
│       ├── Invoices.jsx      # Billing & invoice history
│       └── Settings.jsx      # Profile/Security/Workspace/Plan/Notifications
│
├── credentials.txt           # Test account logins
├── PROJECT_STATUS_AND_PROCESS.txt  # Complete project documentation
├── TENANTVAULT_DOCUMENTATION.md    # Architecture & Tech Specs
├── render.yaml               # Render IaC configuration
├── vercel.json               # Vercel deployment config
├── requirements.txt          # Python dependencies
└── manage.py
```

> ★ = Newly added in Phase 2

---

## 🌐 API Endpoints

```
POST  /api/auth/register/                         Register new company + admin
POST  /api/auth/login/                            Login → JWT tokens
POST  /api/auth/refresh/                          Refresh access token
GET   /api/auth/me/                               Current user + tenant info

GET   /api/dashboard/                             Stats (402 if unpaid)
GET   /api/billing/                               Invoice list
POST  /api/billing/pay/                           Pay invoice → activate workspace

GET   /api/team/                                  List all members + slot usage
POST  /api/team/                                  Add new member (admin only)
DELETE /api/team/<user_id>/                       Remove member (admin only)

PATCH /api/settings/profile/                      Update username & email
PATCH /api/settings/password/                     Change password
PATCH /api/settings/workspace/                    Update company name

GET   /api/documents/                             List encrypted documents
POST  /api/documents/upload/                      Upload + encrypt file
GET   /api/documents/<id>/download/               Decrypt + stream file
GET   /api/documents/<id>/versions/               Version history
POST  /api/documents/<id>/rollback/<ver>/         Rollback to old version
GET   /api/documents/<id>/analytics/              View/download/edit stats

WebSocket: ws://localhost:8000/ws/tenant/<id>/    Live dashboard sync
WebSocket: ws://localhost:8000/ws/editor/<id>/    Collaborative editing
```

---

## 💻 Setup & Installation

**Requirements:** Python 3.12+, Node.js 18+, PostgreSQL 18

### 1. Clone & Backend Setup
```bash
git clone https://github.com/mohithreddy123-hub/Multi-tenant-SaaS.git
cd Multi-tenant-SaaS

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
pip install psycopg2-binary     # PostgreSQL driver
```

### 2. Configure Database
Create a PostgreSQL database named `multi_tenant_db` and configure your `DATABASE_URL` connection string in the backend `.env` file.

### 3. Run Backend
```bash
python manage.py migrate
python manage.py runserver
```

### 4. Run Frontend
```bash
cd frontend
npm install
npm run dev
```



### 5. Create Your First Company
1. Click **"Get Started"** → Fill in the 3-step signup wizard.
2. Log in → You will see the **Payment Wall**.
3. Complete activation payment → Workspace is unlocked.
4. Go to **👥 Team** to add your first employee.

---

## 🔜 Future Roadmap

| # | Feature | Description |
|:---|:---|:---|
| 1 | **PDF Receipt Generation** | Upgrading visual transaction receipts into downloadable PDF files. |
| 2 | **Backend Notification Workers** | Tying UI Email Notification toggles to actual backend SMTP dispatchers. |
| 3 | **Real Payment Gateway** | Razorpay/Stripe SDK with webhook auto-confirmation. |
| 4 | **Email Invitations** | Send invite links so employees set their own passwords. |
| 5 | **RBAC Enforcement** | Members: view/upload only. Admins: full control. |
| 6 | **Docker Deployment** | Containerized production setup with Nginx + Gunicorn for self-hosting. |

---

*Created and maintained by **Mohith Reddy**.*
