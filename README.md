<div align="center">
  <h1>🏢 Multi-Tenant SaaS Platform</h1>
  <p>An enterprise-grade, structurally isolated Multi-Tenant SaaS application featuring zero-knowledge encrypted file storage, real-time WebSockets, and collaborative text editing.</p>
</div>

---

## 📖 Table of Contents
1. [About The Project](#about-the-project)
2. [What is an "Enterprise Grade" System?](#what-is-an-enterprise-grade-system)
3. [Core Architecture & Multi-Tenancy](#core-architecture--multi-tenancy)
4. [Key Features](#key-features)
5. [Complete Project Structure](#complete-project-structure)
6. [API Endpoints](#api-endpoints)
7. [Screenshots](#screenshots-current-state)
8. [Future Roadmap (PostgreSQL Migration)](#future-roadmap)
9. [How to Run Locally](#how-to-run-locally)

---

## 🚀 About The Project

This project was built to solve the complex problem of **B2B (Business-to-Business) Multi-Tenancy**. 

Unlike a standard application where all users belong to the same pool, this app allows multiple distinct *Companies* (Tenants) to register. Once registered, every user, document, and invoice they create is strictly isolated from other companies using a **Shared Database, Shared Schema** architecture.

### What is an "Enterprise-Grade" System?
"Enterprise-grade" means the software is built to handle the strict security, scalability, and performance demands of large businesses. In this project, it means:
*   **Data Isolation**: Company A can never accidentally query Company B's data.
*   **Zero-Knowledge Encryption**: We don't just hide files; we scramble them into unreadable bytes before they ever touch the hard drive.
*   **Real-Time Capabilities**: Utilizing ASGI and WebSockets to push live updates, which is vastly more complex than standard HTTP request-response loops.

---

## 🏗️ Core Architecture & Multi-Tenancy

The entire system rotates around the `Tenant` database model. 

```text
               [ Database ]
                     |
         +-----------+-----------+
         |                       |
    [Tenant A]              [Tenant B]
      - Users                 - Users
      - Encrypted Docs        - Encrypted Docs
      - Subscriptions         - Subscriptions
```
Every API request made by the Frontend carries a **custom JWT (JSON Web Token)** that contains the `tenant_id`. The Backend middleware intercepts this token and automatically filters all database queries to ensure users only see their own company's data.

---

## ✨ Key Features

1. **Custom Authentication & Workspaces**
   * Role-based access control (Admins vs Standard Users).
   * JWT based secure login.

2. **Secure Encrypted File Manager**
   * Uploaded documents are encrypted via **AES-128 (Fernet Algorithm)**.
   * On-the-fly decryption streaming only when an authorized download occurs.
   * Full file versioning (rollbacks) and download/view analytics.

3. **Real-Time Collaborative Editor**
   * Uses Django Channels and WebSockets.
   * Multiple users within the same tenant can type in the same document simultaneously.
   * Remote cursor tracking.

4. **Billing & Invoices Engine**
   * Tracks storage limits (e.g., 50GB for Starter, 500GB for Growth).
   * Generates invoices and tracks simulated payment statuses.

---

## 📂 Complete Project Structure

Understanding the layout is critical for navigating this massive codebase:

```text
Multi-tenant-SaaS/
│
├── backend/                       # ✅ Django Project Configuration
│   ├── settings.py                # Database, Installed Apps, Security config
│   ├── urls.py                    # Master traffic router
│   └── asgi.py                    # Crucial: Configured for WebSockets (Channels)
│
├── core/                          # ✅ Main Application Logic
│   ├── models.py                  # Database tables (Tenant, User, Document, etc.)
│   ├── views.py                   # REST API logic (Uploads, Auth, Billing)
│   ├── serializers.py             # Translates Database rows into JSON for React
│   ├── urls.py                    # API Routes mapping
│   ├── consumers.py               # WebSocket Handlers (Real-time live sync logic)
│   ├── routing.py                 # WebSocket URL mapping
│   ├── utils/
│   │   └── encryption.py          # The AES-128 Fernet encryption engine
│   └── migrations/                # Database history state tracking
│
├── frontend/                      # ✅ React UI (Vite)
│   ├── package.json               # Node.js dependencies
│   ├── src/
│   │   ├── api.js                 # Axios HTTP client (Injects JWTs into headers)
│   │   ├── App.jsx                # Main React Router connecting all pages
│   │   ├── index.css              # Custom Glassmorphism styling system
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx    # Global state holding the user's login session
│   │   └── pages/                 # The Visual Screens
│   │       ├── Dashboard.jsx      # Live websocket-connected overview
│   │       ├── Documents.jsx      # The Encrypted File Manager Interface
│   │       ├── Editor.jsx         # The Collaborative Text Editor
│   │       ├── Invoices.jsx       # Billing UI
│   │       └── Login/Signup.jsx   # Authentication entries
│
├── manage.py                      # Django execution script
├── requirements.txt               # Python dependencies
└── HOW_TO_RUN_PROJECT.txt         # Terminal execution manual
```

---

## 🔌 API Endpoints Summary

A quick look at the central REST interactions:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `POST` | `/api/auth/register/` | Creates a new Tenant Workspace and Admin Account |
| `POST` | `/api/auth/login/` | Returns JWT Access/Refresh tokens |
| `GET`  | `/api/dashboard/` | Returns Tenant stats (Storage, Users) |
| `POST` | `/api/documents/upload/` | Encrypts and stores a new file |
| `GET`  | `/api/documents/<id>/download/` | Decrypts and streams a file to the user |
| `POST` | `/api/documents/<id>/rollback/` | Reverts an encrypted file to a previous version |

*(And many more WebSockets mapped via `ws://.../ws/tenant/` routes)*

---

## 📸 Screenshots (Current State)

*(Placeholders for actual images. Replace `link-to-image` with your actual screenshots when you upload them to GitHub)*

### 1. The Multi-Tenant Dashboard
![Dashboard Placeholder](https://via.placeholder.com/800x400.png?text=Dashboard+UI+-+Showing+Storage+Limits)

### 2. Encrypted Document Manager
![Documents Placeholder](https://via.placeholder.com/800x400.png?text=Document+Manager+-+Uploads+%26+Versions)

### 3. Collaborative Live Editor
![Editor Placeholder](https://via.placeholder.com/800x400.png?text=Real-Time+Text+Editor+with+Live+Cursors)

---

## 🔜 Future Roadmap (What's Next?)

Although the core engine is perfectly functional, there are massive plans to upgrade the infrastructure of this project. **I am currently learning advanced SQL to achieve the following step:**

1. **🔥 PostgreSQL Migration (Current Priority)**
   * **Why?** We are currently using SQLite. SQLite locks the entire database file when a single user writes to it. In a multi-tenant environment, this bottlenecks instantly. Moving to PostgreSQL allows thousands of concurrent queries safely.
   
2. **Background Tasks (Celery & Redis)**
   * Offloading file encryption to background workers so large files don't freeze the HTTP response.
   
3. **AWS S3 Cloud Storage**
   * Transitioning from local hard drive storage to scalable cloud buckets.

---

## 💻 How To Run Locally

If you clone this repository, you must run both the backend and frontend in separate terminals.

**1. Start the Backend:**
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

**2. Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> **Security Warning**: Ensure `.env`, `db.sqlite3`, and any credentials text files are added to `.gitignore` before deploying or pushing.
