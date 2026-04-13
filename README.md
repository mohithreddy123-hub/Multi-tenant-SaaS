<div align="center">
  <h1>🏢 TenantVault</h1>
  <p>An enterprise-grade, structurally isolated Multi-Tenant SaaS designed as a Secure Private Workspace for Startups. Featuring Zero-Knowledge Privacy, Real-Time WebSockets, and Collaborative Text Editing.</p>
  
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
6. [API Reference](#api-endpoints)
7. [Setup & Installation](#setup--installation)
8. [Future Roadmap](#future-roadmap)

---

## 🚀 About TenantVault

**TenantVault** is an enterprise-grade **B2B (Business-to-Business) SaaS platform** providing secure information management. It is designed explicitly not as a commodity storage tool, but as a **Secure Private Workspace** for teams to manage sensitive ideas, documents, and discussions.

Our core philosophy is **Privacy by Design**. Data isolation is maintained at the architectural level, ensuring maximum security. A user from Company A can never access or view data from Company B.

### Why "Enterprise-Grade"?
*   **Infrastructure**: Built on **PostgreSQL 18.3** for handling concurrent enterprise queries.
*   **Zero-Knowledge Privacy**: Files are encrypted server-side using **AES-128** before they touch the disk. Even system admins cannot read tenant data.
*   **Structural Isolation**: Strict multi-tenancy ensures data silos via custom ID-based middleware filtration.
*   **Persistent Collaboration**: Real-time capabilities handled via **Django Channels** and **WebSockets** for a native "always-on" sync experience.

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
      - Encrypted Vault        - Encrypted Vault
      - Live Collab Sessions   - Live Collab Sessions
```
Every request carries a **JWT (JSON Web Token)** that identifies the user and their company. Our internal system automatically filters every database query to ensure users only interact with their company's "Vault."

---

## ✨ Key Features

1.  **🚀 Premium SaaS Interface**
    *   Professional dashboard built with modern glassmorphism and Vanilla CSS (no bloated frameworks).
    *   Integrated login, signup, and robust onboarding workflows.

2.  **🔐 Secure Private Vault**
    *   Server-side zero-knowledge encryption scrambles all documents before storage.
    *   Strict access control limits document access to authenticated organization members.

3.  **⚡ Real-Time Collaboration**
    *   Shared text editor allowing multiple authorized users to type simultaneously.
    *   Live cursor tracking and instantaneous text synchronization via WebSockets.

4.  **📊 Live Dashboard Sync**
    *   Instant UX updates alerting teams when documents are modified or tasks occur.

5.  **💳 Enterprise Billing Gateway**
    *   Amazon-style checkout mechanism with multiple payment tiers (Starter, Growth, Enterprise).
    *   Accepts UPI, Net Banking, Credit/Debit, and EMI with localized Transaction Receipts.

---

## 🛠️ Technology Stack

| Component | Technology |
|:---|:---|
| **Backend** | Django 6.0, Django REST Framework |
| **Real-Time** | Daphne, WebSockets, Django Channels |
| **Database** | **PostgreSQL** (Connected via psycopg3) / SQLite (Dev) |
| **Frontend** | React 19, Vite, React Router, Axios |
| **Security** | AES-128 Encryption, JWT Authentication, CORS Protection |

---

## 📂 Project Structure

A clean, separated monolith directory structure organizing backend API orchestration and frontend UI delivery.

```text
TenantVault/
├── backend/            # Django ASGI configuration and core settings
│   └── settings.py     # Main application settings, origins, apps config
├── core/               # The Enterprise Engine
│   ├── models.py       # Database schema (Tenant, User, Document, Invoice) & DB-level Encryption
│   ├── views.py        # REST API Controllers (Data isolation, fetching, modifying)
│   ├── consumers.py    # WebSocket Controllers (Live Team Sync, Collab Editing)
│   ├── routing.py      # WebSocket Protocol router
│   ├── urls.py         # HTTP HTTP Protocol router (Endpoints)
│   └── serializers.py  # Data translation between API JSON and Django Models
├── frontend/           # The User Interface (React + Vite)
│   └── src/
│       ├── api.js      # Axios Interceptor configuring JWT Injection
│       ├── index.css   # Hand-crafted Glassmorphism Design System
│       ├── contexts/   # Global Auth State Management (AuthContext)
│       └── pages/      # The Application Views
│           ├── Dashboard.jsx  # Live metrics and Security Status
│           ├── Documents.jsx  # The Secure Vault Manager
│           ├── Editor.jsx     # WebSocket Collaborative Workspace
│           ├── Settings.jsx   # Organization config and Feature Toggles
│           └── Invoices.jsx   # Multi-option Enterprise Checkout Modal
├── manage.py           # Backend Management script
└── requirements.txt    # Python backend dependency manifest
```

---

## 💻 Setup & Installation

TenantVault requires **Python 3.12+** and **Node.js**.

1.  **Backend Environment**:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # or .venv\Scripts\activate on Windows
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver 8000
    ```

2.  **Frontend Environment**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Visit **http://localhost:5173** to use the application.

---

## 🔜 Future Roadmap

-   **⚡ Celery + Redis**: Offloading heavy cryptographic tasks to background workers.
-   **📄 Reporting**: Automated, downloadable PDF generations for Enterprise Transaction Receipts.
-   **☁️ Production Deployment**: Orchestrating via Docker, Gunicorn, and Nginx.

---
*Created and Maintained by Mohith Reddy.*
