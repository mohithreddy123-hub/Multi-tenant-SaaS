# TenantVault Platform Architecture & Documentation

## 1. Project Purpose & Core Idea

**TenantVault** is an enterprise-grade, Multi-Tenant Software-as-a-Service (SaaS) application. 

**The Core Idea:** TenantVault is NOT a basic cloud storage commodity (like Google Drive or Dropbox). It is positioned as a **Secure Private Workspace for Startups**. It solves the problem of decentralized and insecure team collaboration by offering a centralized vault where teams can store sensitive ideas, collaborate on documents in real-time, and manage their organization securely. 

**Key Value Propositions:**
- **Zero-Knowledge Privacy:** Document contents are encrypted using AES-128 before hitting the database. Even the platform administrators cannot read the sensitive data of the tenants.
- **Strict Data Isolation (Multi-Tenancy):** Users belong to isolated Workspaces (Tenants). A user from Company A can never access or view data, invoices, or profiles from Company B.
- **Real-Time Collaboration:** Powered by WebSockets, teams can edit documents together simultaneously (like Google Docs) and receive live update events on their dashboards.
- **Premium Enterprise Flow:** Provides a beautiful, glassmorphic UI, complete with high-security checkout flows and advanced workspace settings.

---

## 2. How the Platform Runs and Orchestrates Data

### The Stack
- **Backend:** Python + Django 6.0 + Django REST Framework + Django Channels (WebSockets)
- **Frontend:** React 19 + Vite (Vanilla CSS, Glassmorphism aesthetic)
- **Database:** PostgreSQL (simulated currently with SQLite in dev)

### The Data Flow
1. **Authentication:** A user registers a new Company. The backend creates a `Tenant` and an `Admin User` tied specifically to that tenant.
2. **Authorization & JWT:** The user logs in via `Login.jsx`. The Django backend authenticates them and issues a JSON Web Token (JWT). The frontend stores this token in the browser's `localStorage` and automatically attaches it to all future requests via `api.js`.
3. **Fetching Data:** When the user visits the Dashboard, the frontend requests data from `/api/dashboard/`. The Django View introspects the JWT, identifies the User's Tenant ID, and strictly returns *only* data belonging to that Workspace.
4. **Real-Time Sync:** When a user opens the Collaborative Editor (`Editor.jsx`), the frontend establishes a persistent WebSocket connection to `ws://.../editor/<id>/`. Django Channels routes these messages in real-time between all users connected to the same document.

---

## 3. How to Run the Project Locally

Because the project utilizes WebSockets, it runs on Django's ASGI server (Daphne).

**Terminal 1: Start the Backend**
```bash
cd backend  # or the root directory where manage.py is
python -m venv .venv
# Activate venv: .venv\Scripts\activate (Windows) OR source .venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

**Terminal 2: Start the Frontend**
```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173** to use the application.

---

## 4. Pending Tasks for Completion (Pre-Deployment)

*Please note: This project is currently running in a local development environment and has not yet been deployed to production.* 

The following items remain on the roadmap to finalize the platform:
1. **Background Task Queue (Celery + Redis):** Offloading heavy cryptographic tasks, email sending, and scheduled backup jobs to background processes so the main web thread stays fast.
2. **PDF Receipt Generation:** Upgrading the visual transaction receipts in the billing section into fully downloadable, generated PDF files using a library like ReportLab.
3. **Backend Notification Workers:** Tying the Frontend UI Email Notification toggles to actual backend email dispatchers (SMTP configuration).
4. **Production Deployment Orchestration:** Containerizing the app with Docker, serving Django through Gunicorn/Uvicorn, serving React through Nginx, and migrating to a managed PostgreSQL cluster.

---

## 5. Extensive File-by-File Breakdown

### 🏗️ Backend (Django `core/`)
- **`models.py`:** The heart of the database. Defines `Tenant` (Workspaces), `User` (Workspace Members), `Document`, `DocumentVersion` (History), and `Invoice`. It also contains the overridden `save()` methods that encrypt document content using AES-128 before writing to the disk.
- **`views.py`:** The REST API Controllers. Handles incoming HTTP requests. Contains logic for registering tenants, paginating documents, handling payments, and updating profile settings. Critically ensures `filter(tenant=request.user.tenant)` is applied everywhere for data isolation.
- **`serializers.py`:** Defines the translation layer. Validates complex JSON data sent by the frontend React app and converts Django Model querysets back into JSON.
- **`urls.py`:** The API router. Maps specific URLs (e.g., `/api/documents/`) to the specific python functions inside `views.py`.
- **`consumers.py`:** The WebSocket controllers for Django Channels. Handles the persistent TCP connections for Real-Time Notification feeds and the Collaborative Text Editor.
- **`routing.py`:** Maps `ws://` URL paths to the consumers defined in `consumers.py`.
- **`admin.py`:** Instructs the default Django Superadmin site on how to display models for the platform operators.

### 🎨 Frontend (`frontend/src/`)
- **`main.jsx` / `App.jsx`:** The React entry points. `App.jsx` contains the `react-router-dom` configuration that protects private routes (Dashboard, Editor) and exposes public routes (Login, Signup).
- **`api.js`:** A custom `axios` HTTP client interceptor. It ensures that the JWT access token is injected into the headers of every request going to the backend, and automatically handles token refreshing if the session expires.
- **`contexts/AuthContext.jsx`:** Global React State for authentication. It dictates to the entire application whether a user is logged in, securely holds their JWT tokens, and provides global `login()` and `logout()` functions.
- **`index.css`:** The design system. Contains all the custom CSS responsible for the premium, dark-mode glassmorphism aesthetic. No Tailwind CSS was used; everything is hand-crafted vanilla CSS to ensure absolute control over animations and layouts.

### 📄 Pages (`frontend/src/pages/`)
- **`Signup.jsx` & `Login.jsx`:** Forms for onboarding non-authenticated users into secure sessions.
- **`Dashboard.jsx`:** The executive summary view. It retrieves broad workspace statistics and prominently displays the Workspace's active "Privacy Status" and "Live Sync" connection states.
- **`Documents.jsx`:** The centralized Secure Vault. Allows users to upload code, images, and text. Shows files in a beautifully formatted table with options to preview or edit.
- **`Editor.jsx`:** The Real-Time Collab Editor. Uses React Context and WebSockets to allow multiple members of the same organization to type simultaneously on a single document, reflecting cursor positions and text changes instantly.
- **`Invoices.jsx`:** The enterprise checkout system. Showcases an advanced Amazon-style split-panel payment gateway allowing users to pay subscription dues via UPI, Credit Cards, Net Banking, or EMI, concluding with a custom receipt format.
- **`Settings.jsx`:** The core configuration engine. Contains a multi-tabbed interface for managing Personal Profiles, Changing Passwords, Configuring Workspace details (Admin only), toggling Email Notification preferences, and reviewing SaaS Subscription Plans.

---

## 6. API Reference (Internal & External)

TenantVault relies on a bespoke, highly secure Django REST Framework (DRF) backend to handle all application logic, meaning the vast majority of our APIs are custom-built for absolute data control.

### How the Frontend connects to the Backend (The Bridge):
To bridge the React frontend with the Django backend, we used two specific technologies:
1. **Axios (HTTP Client API):** We used the `axios` library (specifically configured inside `frontend/src/api.js`) to process all standard REST requests. Axios was chosen over the native `fetch()` API because it allows us to build "interceptors" that automatically attach the secure JWT tokens to every request globally.
2. **Native WebSocket API:** For real-time features like the collaborative editor and live dashboard events, we used the browser's native `new WebSocket(url)` API to establish persistent TCP bridges with Django Channels.

### Custom Internal APIs Developed:
- **Authentication APIs:**
  - `POST /api/register/`: Registers a new Tenant workspace and an associated Admin user.
  - `POST /api/token/`: Generates a secure JWT Access/Refresh token pair for authentication.
  - `POST /api/token/refresh/`: Refreshes expired JWT tokens without requiring a re-login.
- **Dashboard & Sync APIs:**
  - `GET /api/dashboard/`: Fetches live workspace metrics, tenant data, and user limits securely scoped to the logged-in user.
- **Document Vault APIs:**
  - `GET /api/documents/`: Retrieves all documents inside the user's workspace.
  - `POST /api/documents/`: Uploads a new document, runs AES-128 encryption, and stores it.
  - `GET /api/documents/<id>/`: Retrieves and decrypts a specific document to preview.
- **Settings & Profile APIs:**
  - `PATCH /api/settings/profile/`: Updates the user's username/email.
  - `PATCH /api/settings/password/`: Validates and securely changes the user's password.
  - `PATCH /api/settings/workspace/`: Allows workspace Admins to modify company settings.
- **Billing APIs:**
  - `GET /api/billing/`: Retrieves all generated invoices for the workspace.
  - `POST /api/billing/pay/`: Processes the payment gateway logic, marks invoices as paid, and handles the transaction receipt flow.
- **Real-Time WebSockets:**
  - `ws://.../tenant/<jwt>/`: Pushes real-time alerts and document update notifications to all users in a tenant.
  - `ws://.../editor/<id>/`: Facilitates synchronized, simultaneous document typing across browsers.

### External APIs Leveraged:
- **QR Code Generator API (`api.qrserver.com`):** Used dynamically on the frontend checkout page (`Invoices.jsx`) to generate scannable UPI QR codes for desktop users to securely pay with their mobile banking apps. This avoids bloating the backend while delivering a seamless UX.
