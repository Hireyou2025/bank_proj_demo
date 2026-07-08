# Document Verification Workflow Management System

A modern, secure, enterprise-grade centralized workspace for tracking bank document verifications across 5 branch locations (**Hyderabad**, **Bangalore**, **Chennai**, **Mumbai**, and **Pune**). 

The application utilizes role-based access controls (RBAC) to allow administrators to upload files in bulk, manage employee records, assign and reassign work, audit activity logs, and view branch productivity. Employees can access their personal dashboards, download attachments, leave remarks, and mark documents as Approved or Rejected.

---

## Technical Stack

* **Frontend**: React (v19), TypeScript, Tailwind CSS (v3), React Router, React Query (`@tanstack/react-query`), Axios, Recharts, Lucide Icons, Framer Motion.
* **Backend**: FastAPI (Python), SQLAlchemy ORM, JWT Authentication, python-jose, passlib.
* **Database**: PostgreSQL (Production/Docker) and SQLite (Local Development fallback).
* **Deployment**: Docker, Docker Compose, Nginx.

---

## Getting Started (Local Development)

To run the application locally without Docker, follow these simple steps:

### Prerequisites
* **Python 3.10+** (pip installed)
* **Node.js 18+** (npm installed)

### 1. Backend Setup
1. Open a terminal and navigate to the project root directory.
2. Install the Python requirements globally or inside a virtual environment:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run the database initialization and seeder script. This automatically creates the local SQLite database (`dev.db`), creates the 5 branches, and generates default credentials:
   ```bash
   python backend/seed.py
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn backend.main:app --reload
   ```
   *The API will be available at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.*

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the npm packages:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The React application will be available at `http://localhost:5173`.*

---

## Getting Started (Docker Compose Build)

To spin up the entire production-grade stack including Nginx and a PostgreSQL database in Docker containers:

1. Ensure Docker Desktop is installed and running on your system.
2. Run the following command from the root directory:
   ```bash
   docker-compose up --build
   ```
3. Once the build finishes, access the services:
   * **React Frontend**: `http://localhost:3000` (served via Nginx)
   * **FastAPI Backend**: `http://localhost:8000`
   * **PostgreSQL Database**: `localhost:5432`

*Note: The backend container automatically triggers `seed.py` on startup, seeding the PostgreSQL database immediately.*

---

## Testing Workspace Credentials

Use the following seeded accounts to test the application flows:

### 1. Administrator Account
* **Role**: Admin
* **Email**: `admin@workspace.com`
* **Password**: `AdminPassword123!`
* **Capabilities**: Upload files, manage employees, assign tasks, view central analytics charts, audit activity logs.

### 2. Employee Account
* **Role**: Employee
* **Email**: `hyd_emp@workspace.com` (Hyderabad branch)
* **Password**: `EmpPassword123!`
* **Capabilities**: View assigned tasks, download attachments, input audit remarks, and mark documents as Approved/Rejected.

---

## Project Structure

```
hackathon/
├── backend/                  # FastAPI Backend Services
│   ├── api/                  # Endpoints (auth, users, docs, branches, analytics, logs, etc.)
│   ├── auth/                 # JWT helper methods, hashing, RBAC dependencies
│   ├── database/             # SQLAlchemy connection & DB initialization
│   ├── models/               # SQLAlchemy DB Models (User, Document, etc.)
│   ├── schemas/              # Pydantic validation schemas
│   ├── storage/              # File uploads helper
│   ├── utils/                # Log/Notification builders
│   ├── main.py               # FastAPI entry point
│   ├── seed.py               # Database seeder (creates admin user, branches)
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React Frontend Client
│   ├── src/
│   │   ├── components/       # Shared UI (Sidebar, Navbar, NotificationDropdown, Charts)
│   │   ├── context/          # Auth context and session management
│   │   ├── layouts/          # Dashboard grid layout structure
│   │   ├── pages/            # Admin/Employee dashboards, tables, settings
│   │   ├── services/         # Axios API clients
│   │   ├── index.css         # Tailwind & custom CSS styles
│   │   └── App.tsx           # Route mapping
│   ├── nginx.conf            # Nginx config for Docker routing
│   └── tailwind.config.js    # Tailwind configuration
│
├── docker-compose.yml        # Multi-container orchestration
└── .env                      # Local environment configurations
```
