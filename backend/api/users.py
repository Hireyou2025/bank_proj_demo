from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database.db import get_db
from backend.models.models import User, Branch, Document, Assignment
from backend.schemas.schemas import UserCreate, UserUpdate, UserResponse, UserPasswordReset
from backend.auth.auth import admin_required, get_password_hash, get_current_active_user
from backend.utils.helpers import log_activity, create_notification, get_client_ip

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    branch_id: Optional[int] = None,
    role: Optional[str] = None,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if branch_id:
        query = query.filter(User.branch_id == branch_id)
    if role:
        query = query.filter(User.role == role)
    return query.all()

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
        
    # Check if branch exists
    if user_data.branch_id:
        branch = db.query(Branch).filter(Branch.id == user_data.branch_id).first()
        if not branch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Branch not found"
            )
            
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_pwd,
        role=user_data.role,
        branch_id=user_data.branch_id,
        phone=user_data.phone,
        is_active=user_data.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Audit log
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Created",
        description=f"Created user {new_user.name} ({new_user.role}) under branch ID {new_user.branch_id}.",
        ip_address=ip
    )
    
    # Notification
    create_notification(db, user_id=new_user.id, message=f"Welcome {new_user.name}! Your workspace account has been created.")
    
    return new_user

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update fields
    if user_data.name is not None:
        user.name = user_data.name
    if user_data.email is not None:
        # Check if email is taken
        existing = db.query(User).filter(User.email == user_data.email, User.id != id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = user_data.email
    if user_data.branch_id is not None:
        branch = db.query(Branch).filter(Branch.id == user_data.branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        user.branch_id = user_data.branch_id
    if user_data.phone is not None:
        user.phone = user_data.phone
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
        
    db.commit()
    db.refresh(user)
    
    # Audit log
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Updated",
        description=f"Updated user profile/status for {user.name}.",
        ip_address=ip
    )
    
    return user

@router.delete("/{id}")
def delete_user(
    id: int,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
        
    # Audit log
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Deleted",
        description=f"Deleted user {user.name} ({user.email}).",
        ip_address=ip
    )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.put("/{id}/reset-password")
def reset_password(
    id: int,
    payload: UserPasswordReset,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password = get_password_hash(payload.new_password)
    db.commit()
    
    # Audit log
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Password Reset",
        description=f"Admin reset password for user {user.name}.",
        ip_address=ip
    )
    
    # Create notification for employee
    create_notification(db, user_id=user.id, message="Your password was reset by the administrator.")
    
    return {"message": "Password reset successful"}

@router.get("/{id}/performance")
def get_user_performance(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Security: Employees can only view their own performance
    if current_user.role != "admin" and current_user.id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Perform aggregation
    total_assigned = db.query(Document).filter(Document.assigned_to == id).count()
    completed_approved = db.query(Document).filter(Document.assigned_to == id, Document.status == "Approved").count()
    completed_rejected = db.query(Document).filter(Document.assigned_to == id, Document.status == "Rejected").count()
    processing = db.query(Document).filter(Document.assigned_to == id, Document.status == "Processing").count()
    
    total_completed = completed_approved + completed_rejected
    approval_pct = (completed_approved / total_completed * 100) if total_completed > 0 else 100.0
    
    # Compute performance score (simple formula: completed docs ratio + approval rates)
    # Higher completed counts increase the score up to a baseline
    perf_score = min(100.0, max(0.0, (approval_pct * 0.7) + (min(total_completed, 50) * 0.6)))
    if total_completed == 0:
        perf_score = 0.0

    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "branch": user.branch.name if user.branch else "None",
        "total_assigned": total_assigned,
        "completed": total_completed,
        "approved": completed_approved,
        "rejected": completed_rejected,
        "processing": processing,
        "approval_pct": round(approval_pct, 1),
        "performance_score": round(perf_score, 1)
    }
