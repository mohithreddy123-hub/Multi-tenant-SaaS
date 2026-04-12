<div align="center">
  <h1>🏢 TenantVault</h1>
  <p>An enterprise-grade, structurally isolated Multi-Tenant SaaS application featuring zero-knowledge encrypted file storage, real-time WebSockets, and collaborative text editing.</p>
  
  [![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
  [![Django](https://img.shields.io/badge/Django-6.0-green.svg)](https://www.djangoproject.com/)
  [![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.3-blue.svg)](https://www.postgresql.org/)
</div>

---

## 📖 Table of Contents
1. [About TenantVault](#about-tenantvault)
2. [Why Enterprise Grade?](#why-enterprise-grade)
3. [Core Architecture](#core-architecture)
4. [Key Features](#key-features)
5. [Project Structure](#project-structure)
6. [API Endpoints](#api-endpoints)
7. [Screenshots](#screenshots-current-state)
8. [Setup & Installation](#setup--installation)
9. [Future Roadmap](#future-roadmap)

---

## 🚀 About TenantVault

**TenantVault** is an enterprise-grade **B2B (Business-to-Business) SaaS platform** designed for secure information management. 

Our core philosophy is **Privacy by Design**. Unlike standard applications where all users belong to the same pool, TenantVault allows multiple distinct *Companies* (Tenants) to register. Data isolation is maintained at the architectural level, ensuring maximum security and compliance.

### Why "Enterprise-Grade"?
*   **Infrastructure**: Built on **PostgreSQL 18.3**, the most advanced relational database for handling thousands of concurrent enterprise queries.
*   **Zero-Knowledge Encryption**: Files are encrypted server-side using **AES-128 (Fernet Algorithm)** before they ever touch the disk.
*   **Structural Isolation**: Company A can never query Company B's data due to our custom tenant-aware middleware.
*   **Persistence**: Real-time capabilities handled via **Django Channels** and **WebSockets** for an "always-on" user experience.

---

## 🏗️ Core Architecture

TenantVault uses a **Shared Database, Shared Schema** architecture with strict ID-based filtration.

```text
               [ PostgreSQL 18.3 ]
                      |
         +------------+------------+
         |                         |
    [Tenant A]                [Tenant B]
    (Company A)               (Company B)
      - Users                  - Users
      - Scrambled Docs         - Scrambled Docs
      - Invoices               - Invoices
```
Every request carries a **JWT (JSON Web Token)** that identifies the user and their company. Our internal system automatically filters every database query to ensure users only interact with their company's "Vault."

---

## ✨ Key Features

1.  **🚀 Premium Landing Page**
    *   Professional "SaaS-style" entry point detailing product features and pricing.
    *   Integrated login/signup modals for a seamless user experience.

2.  **🔐 Zero-Knowledge File Manager**
    *   Server-side encryption scambles files before storage.
    *   On-the-fly decryption streaming only for authorized users.
    *   Full file versioning (revert to previous states) and activity analytics.

3.  **⚡ Real-Time Collaboration**
    *   Shared text editor allowing multiple users to type simultaneously.
    *   Live remote cursor tracking via WebSockets.

4.  **📊 Live Dashboard Sync**
    *   Instant UI updates when files are uploaded or limits are reached, powered by **Daphne** and **Django Channels**.

5.  **💳 Billing & Quota Engine**
    *   Tracks storage consumption (GB) across the tenant.
    *   Automatic invoice generation and subscription tier management.

---

## 🛠️ Technology Stack

| Component | Technology |
|:---|:---|
| **Backend** | Django 6.0, Django REST Framework |
| **Real-Time** | Daphne, WebSockets, Django Channels |
| **Database** | **PostgreSQL 18.3** (Connected via Psycopg 3) |
| **Frontend** | React 19, Vite, React Router, Axios |
| **Security** | Fernet (AES-128), SimpleJWT, CORS Protection |

---

## 📂 Project Structure

```text
TenantVault/
├── backend/            # Django Settings & Protocol Configuration (ASGI)
├── core/               # Enterprise Logic: Encryption, WebSockets, Models, Views
├── frontend/           # React 19 SPA (Vite)
│   ├── src/pages/      # Dashboard, Documents, Editor, Invoices, Login
│   └── src/contexts/   # Global Auth & State Management
├── manage.py           # Management script
└── requirements.txt    # Python dependency manifest
```

---

## 🔌 API Endpoints (Core)

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/register/` | Register a new Company Tenant & Admin |
| `POST` | `/api/auth/login/` | Secure JWT Authentication |
| `POST` | `/api/documents/upload/` | Encrypt & Upload a new document |
| `GET`  | `/api/documents/<id>/download/` | Decrypt & Stream a document |

---

## 💻 Setup & Installation

TenantVault requires **Python 3.12+**, **Node.js**, and a local **PostgreSQL 18.3** instance.

1.  **Backend**:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # or .venv\Scripts\activate on Windows
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver
    ```

2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 🔜 Future Roadmap

-   **⚡ Celery + Redis**: Offloading encryption to background workers for instant responses.
-   **💳 Stripe Integration**: Real-world payment processing.
-   **☁️ AWS S3 Migration**: Moving encrypted blobs to the cloud.

---
*Created and Maintained by Mohith Reddy.*
