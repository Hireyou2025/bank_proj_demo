from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.database.db import get_db
from backend.models.models import User
from backend.schemas.schemas import LoginRequest, Token, RefreshTokenRequest
from backend.auth.auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    SECRET_KEY,
    ALGORITHM
)
from backend.utils.helpers import log_activity, get_client_ip

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated",
        )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # Log activity
    ip = get_client_ip(request)
    log_activity(db, user_id=user.id, action="User Login", description=f"User {user.name} logged in successfully.", ip_address=ip)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email
    }

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    log_activity(db, user_id=current_user.id, action="User Logout", description=f"User {current_user.name} logged out.", ip_address=ip)
    return {"message": "Logged out successfully"}

@router.post("/refresh")
def refresh(refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
    )
    try:
        payload = jwt.decode(refresh_data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        is_refresh = payload.get("refresh")
        if email is None or not is_refresh:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise credentials_exception
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "branch_id": current_user.branch_id,
        "phone": current_user.phone,
        "is_active": current_user.is_active
    }
