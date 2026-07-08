from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.database.db import get_db
from backend.models.models import Notification, User
from backend.schemas.schemas import NotificationResponse
from backend.auth.auth import get_current_active_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class NotificationReadRequest(BaseModel):
    notification_id: Optional[int] = None

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

@router.put("/read")
def mark_read(
    payload: NotificationReadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if payload.notification_id:
        notification = db.query(Notification).filter(
            Notification.id == payload.notification_id,
            Notification.user_id == current_user.id
        ).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        notification.is_read = True
    else:
        # Mark all read
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).update({"is_read": True}, synchronize_session=False)
        
    db.commit()
    return {"message": "Notifications marked as read"}
