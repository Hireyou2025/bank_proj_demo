from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime

# --- Branch Schemas ---
class BranchBase(BaseModel):
    name: str
    location: Optional[str] = None

class BranchCreate(BranchBase):
    pass

class BranchResponse(BranchBase):
    id: int
    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # "admin" or "employee"
    branch_id: Optional[int] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    branch_id: Optional[int] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserPasswordReset(BaseModel):
    new_password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime
    branch: Optional[BranchResponse] = None
    class Config:
        from_attributes = True

# --- Authentication Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str
    name: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# --- Document Schemas ---
class DocumentBase(BaseModel):
    document_number: str
    file_name: str
    status: str
    branch_id: Optional[int] = None
    priority: str
    remarks: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: int
    storage_path: str
    uploaded_by: int
    assigned_to: Optional[int] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    uploader_name: Optional[str] = None
    assignee_name: Optional[str] = None
    branch_name: Optional[str] = None
    class Config:
        from_attributes = True

class AssignRequest(BaseModel):
    employee_id: int

class BulkAssignRequest(BaseModel):
    document_ids: List[int]
    employee_id: int

class RemarksRequest(BaseModel):
    remarks: str

# --- Assignment Schemas ---
class AssignmentResponse(BaseModel):
    id: int
    document_id: int
    employee_id: int
    assigned_by: int
    assigned_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    document_name: Optional[str] = None
    employee_name: Optional[str] = None
    class Config:
        from_attributes = True

# --- ActivityLog Schemas ---
class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    description: str
    ip_address: Optional[str] = None
    timestamp: datetime.datetime
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime.datetime
    class Config:
        from_attributes = True
