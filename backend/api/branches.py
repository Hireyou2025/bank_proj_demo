from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from backend.database.db import get_db
from backend.models.models import Branch, User
from backend.schemas.schemas import BranchCreate, BranchResponse
from backend.auth.auth import admin_required, any_role_required
from backend.utils.helpers import log_activity, get_client_ip

router = APIRouter(prefix="/api/branches", tags=["Branches"])

@router.get("", response_model=List[BranchResponse])
def get_branches(
    current_user: User = Depends(any_role_required),
    db: Session = Depends(get_db)
):
    return db.query(Branch).all()

@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    payload: BranchCreate,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    # Check if name is unique
    existing = db.query(Branch).filter(Branch.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch name already exists"
        )
        
    new_branch = Branch(
        name=payload.name,
        location=payload.location
    )
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    
    # Audit log
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Branch Created",
        description=f"Admin created a new branch: {new_branch.name} ({new_branch.location}).",
        ip_address=ip
    )
    
    return new_branch
