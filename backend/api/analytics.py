import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Dict, List, Any, Optional

from backend.database.db import get_db
from backend.models.models import Document, User, Branch, Assignment
from backend.auth.auth import admin_required, employee_required, any_role_required

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/admin")
def get_admin_analytics(
    branch_id: Optional[int] = None,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    # Base document query
    doc_query = db.query(Document)
    if branch_id:
        doc_query = doc_query.filter(Document.branch_id == branch_id)
        
    # Cards
    total_docs = doc_query.count()
    uploaded = doc_query.filter(Document.status == "Uploaded").count()
    assigned = doc_query.filter(Document.assigned_to != None).count() # Or status != Uploaded
    processing = doc_query.filter(Document.status == "Processing").count()
    approved = doc_query.filter(Document.status == "Approved").count()
    rejected = doc_query.filter(Document.status == "Rejected").count()
    
    # Employees
    emp_query = db.query(User).filter(User.role == "employee")
    if branch_id:
        emp_query = emp_query.filter(User.branch_id == branch_id)
    total_employees = emp_query.count()
    active_employees = emp_query.filter(User.is_active == True).count()
    inactive_employees = emp_query.filter(User.is_active == False).count()
    
    # Date limits
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    week_start = today_start - datetime.timedelta(days=7)
    month_start = today_start - datetime.timedelta(days=30)
    
    # Completed work (Approved / Rejected)
    completed_query = doc_query.filter(Document.status.in_(["Approved", "Rejected"]))
    completed_today = completed_query.filter(Document.updated_at >= today_start).count()
    completed_week = completed_query.filter(Document.updated_at >= week_start).count()
    completed_month = completed_query.filter(Document.updated_at >= month_start).count()
    
    # Branch statistics
    branches = db.query(Branch).all()
    branch_stats = []
    for b in branches:
        count = db.query(Document).filter(Document.branch_id == b.id).count()
        app = db.query(Document).filter(Document.branch_id == b.id, Document.status == "Approved").count()
        rej = db.query(Document).filter(Document.branch_id == b.id, Document.status == "Rejected").count()
        branch_stats.append({
            "branch_id": b.id,
            "name": b.name,
            "total": count,
            "approved": app,
            "rejected": rej
        })
        
    # --- CHART DATA ---
    # 1. Documents per Branch
    docs_per_branch = [{"name": b.name, "documents": db.query(Document).filter(Document.branch_id == b.id).count()} for b in branches]
    
    # 2. Employee Productivity (top 5 employees based on completed documents)
    employees = db.query(User).filter(User.role == "employee").all()
    employee_productivity = []
    for emp in employees:
        comp = db.query(Document).filter(Document.assigned_to == emp.id, Document.status.in_(["Approved", "Rejected"])).count()
        app_rate = db.query(Document).filter(Document.assigned_to == emp.id, Document.status == "Approved").count()
        employee_productivity.append({
            "name": emp.name,
            "completed": comp,
            "approved": app_rate,
            "branch": emp.branch.name if emp.branch else "None"
        })
    employee_productivity = sorted(employee_productivity, key=lambda x: x["completed"], reverse=True)[:5]
    
    # 3. Approval Rate & Rejection Rate
    total_completed = approved + rejected
    approval_rate = (approved / total_completed * 100) if total_completed > 0 else 0
    rejection_rate = (rejected / total_completed * 100) if total_completed > 0 else 0
    
    # 4. Average Processing Time (in hours)
    assignments = db.query(Assignment).filter(Assignment.completed_at != None).all()
    total_hours = 0.0
    completed_assignments_count = len(assignments)
    for ass in assignments:
        dur = ass.completed_at - ass.assigned_at
        total_hours += dur.total_seconds() / 3600
    avg_processing_time = (total_hours / completed_assignments_count) if completed_assignments_count > 0 else 0.0
    
    # 5. Daily Work Trend (Last 7 days)
    daily_trend = []
    for i in range(6, -1, -1):
        day = today_start.date() - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min)
        day_end = datetime.datetime.combine(day, datetime.time.max)
        
        day_app = doc_query.filter(Document.status == "Approved", Document.updated_at.between(day_start, day_end)).count()
        day_rej = doc_query.filter(Document.status == "Rejected", Document.updated_at.between(day_start, day_end)).count()
        daily_trend.append({
            "date": day.strftime("%b %d"),
            "approved": day_app,
            "rejected": day_rej
        })

    return {
        "cards": {
            "total_documents": total_docs,
            "uploaded": uploaded,
            "assigned": assigned,
            "processing": processing,
            "approved": approved,
            "rejected": rejected,
            "total_employees": total_employees,
            "active_employees": active_employees,
            "inactive_employees": inactive_employees,
            "completed_today": completed_today,
            "completed_week": completed_week,
            "completed_month": completed_month
        },
        "branch_statistics": branch_stats,
        "charts": {
            "docs_per_branch": docs_per_branch,
            "employee_productivity": employee_productivity,
            "approval_rate": round(approval_rate, 1),
            "rejection_rate": round(rejection_rate, 1),
            "avg_processing_time_hours": round(avg_processing_time, 1),
            "daily_trend": daily_trend
        }
    }

@router.get("/employee")
def get_employee_analytics(
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    emp_id = current_user.id
    
    # Base queries for current employee
    emp_docs = db.query(Document).filter(Document.assigned_to == emp_id)
    
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    month_start = today_start - datetime.timedelta(days=30)
    
    # Date aggregates
    assigned_today = db.query(Assignment).filter(
        Assignment.employee_id == emp_id,
        Assignment.assigned_at >= today_start
    ).count()
    
    pending = emp_docs.filter(Document.status == "Assigned").count()
    processing = emp_docs.filter(Document.status == "Processing").count()
    
    completed_approved = emp_docs.filter(Document.status == "Approved").count()
    completed_rejected = emp_docs.filter(Document.status == "Rejected").count()
    completed = completed_approved + completed_rejected
    
    completed_today = db.query(Assignment).filter(
        Assignment.employee_id == emp_id,
        Assignment.completed_at >= today_start
    ).count()
    
    completed_month = db.query(Assignment).filter(
        Assignment.employee_id == emp_id,
        Assignment.completed_at >= month_start
    ).count()
    
    # Fetch recent assignments
    recent_assignments = db.query(Document).filter(
        Document.assigned_to == emp_id
    ).order_by(desc(Document.updated_at)).limit(5).all()
    
    recent_docs = []
    for doc in recent_assignments:
        uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
        recent_docs.append({
            "id": doc.id,
            "document_number": doc.document_number,
            "file_name": doc.file_name,
            "status": doc.status,
            "priority": doc.priority,
            "updated_at": doc.updated_at,
            "uploader_name": uploader.name if uploader else "System"
        })

    return {
        "cards": {
            "assigned_today": assigned_today,
            "pending": pending,
            "processing": processing,
            "completed": completed,
            "approved": completed_approved,
            "rejected": completed_rejected,
            "today_performance": completed_today,
            "monthly_performance": completed_month
        },
        "recent_documents": recent_docs
    }
