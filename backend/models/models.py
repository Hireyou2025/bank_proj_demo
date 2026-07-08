import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database.db import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=True)

    # Relationships
    users = relationship("User", back_populates="branch")
    documents = relationship("Document", back_populates="branch")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)  # Hashed password
    role = Column(String, nullable=False)  # "admin" or "employee"
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="users")
    uploaded_documents = relationship("Document", foreign_keys="[Document.uploaded_by]", back_populates="uploader")
    assigned_documents = relationship("Document", foreign_keys="[Document.assigned_to]", back_populates="assignee")
    assignments = relationship("Assignment", foreign_keys="[Assignment.employee_id]", back_populates="employee")
    created_assignments = relationship("Assignment", foreign_keys="[Assignment.assigned_by]", back_populates="assigner")
    activity_logs = relationship("ActivityLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_number = Column(String, unique=True, index=True, nullable=False)
    file_name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    status = Column(String, default="Uploaded")  # Uploaded, Assigned, Processing, Approved, Rejected
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    priority = Column(String, default="Medium")  # Low, Medium, High
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_documents")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_documents")
    assignments = relationship("Assignment", back_populates="document", cascade="all, delete-orphan")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    document = relationship("Document", back_populates="assignments")
    employee = relationship("User", foreign_keys=[employee_id], back_populates="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by], back_populates="created_assignments")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., "Document Uploaded", "Login"
    description = Column(Text, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
