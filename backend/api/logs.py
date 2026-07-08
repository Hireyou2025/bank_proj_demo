from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import desc

from backend.database.db import get_db
from backend.models.models import ActivityLog, User
from backend.schemas.schemas import ActivityLogResponse
from backend.auth.auth import admin_required

router = APIRouter(prefix="/api/logs", tags=["Activity Logs"])

@router.get("", response_model=List[ActivityLogResponse])
def get_activity_logs(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    logs = db.query(ActivityLog).order_by(desc(ActivityLog.timestamp)).offset(offset).limit(limit).all()
    
    response = []
    for log in logs:
        user_name = "System"
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                user_name = user.name
                
        response.append(
            ActivityLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_name=user_name,
                action=log.action,
                description=log.description,
                ip_address=log.ip_address,
                timestamp=log.timestamp
            )
        )
    return response
