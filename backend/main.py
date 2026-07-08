import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database.db import engine, Base
from backend.api import auth, users, documents, branches, analytics, notifications, logs

# Automatically create tables in database (SQLite/PostgreSQL)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Document Verification Workspace API",
    description="Backend services for Document Verification Workflow System",
    version="1.0.0"
)

# CORS configuration
# Vite development server runs on http://localhost:5173
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://bank-proj-demo-ipcx.vercel.app",
    "https://bank-proj-demo.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local upload storage as static files to allow downloading/previewing files directly
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "backend/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(documents.router)
app.include_router(branches.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(logs.router)

@app.get("/")
def read_root():
    return {"message": "Document Verification System API is running successfully."}
