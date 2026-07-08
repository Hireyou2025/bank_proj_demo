import datetime
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from typing import List, Optional
import uuid

from backend.database.db import get_db
from backend.models.models import Document, User, Branch, Assignment, Notification
from backend.schemas.schemas import DocumentResponse, AssignRequest, BulkAssignRequest, RemarksRequest
from backend.auth.auth import get_current_active_user, admin_required, employee_required, any_role_required
from backend.storage.storage import save_uploaded_file, UPLOAD_DIR
from backend.utils.helpers import log_activity, create_notification, get_client_ip

router = APIRouter(tags=["Documents & Workflow"])

# Helper: Auto-generate document number
def generate_doc_number() -> str:
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"DOC-{date_str}-{random_suffix}"

@router.post("/api/documents/upload", response_model=List[DocumentResponse], status_code=status.HTTP_201_CREATED)
def upload_documents(
    files: List[UploadFile] = File(...),
    priority: str = Form("Medium"),
    branch_id: Optional[int] = Form(None),
    request: Request = None,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    created_docs = []
    
    # Check if branch exists
    if branch_id:
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")

    for file in files:
        # Save file locally
        saved_filename = save_uploaded_file(file)
        
        doc_num = generate_doc_number()
        new_doc = Document(
            document_number=doc_num,
            file_name=file.filename or "unnamed_file",
            storage_path=saved_filename,
            status="Uploaded",
            branch_id=branch_id or current_user.branch_id,
            uploaded_by=current_user.id,
            priority=priority,
            remarks=None
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        created_docs.append(new_doc)
        
        # Log activity
        ip = get_client_ip(request) if request else "127.0.0.1"
        log_activity(
            db,
            user_id=current_user.id,
            action="Document Uploaded",
            description=f"Uploaded document {file.filename} (Number: {doc_num}).",
            ip_address=ip
        )
        
    # Build complete response
    response_items = []
    for doc in created_docs:
        uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
        branch = db.query(Branch).filter(Branch.id == doc.branch_id).first() if doc.branch_id else None
        
        response_items.append(
            DocumentResponse(
                id=doc.id,
                document_number=doc.document_number,
                file_name=doc.file_name,
                storage_path=doc.storage_path,
                status=doc.status,
                branch_id=doc.branch_id,
                priority=doc.priority,
                remarks=doc.remarks,
                uploaded_by=doc.uploaded_by,
                assigned_to=doc.assigned_to,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                uploader_name=uploader.name if uploader else "Unknown",
                assignee_name=None,
                branch_name=branch.name if branch else "None"
            )
        )
        
    return response_items

@router.get("/api/documents")
def get_documents(
    search: Optional[str] = None,
    branch_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(any_role_required),
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    
    # Security filter: if employee, they should only see documents assigned to them
    if current_user.role == "employee":
        query = query.filter(Document.assigned_to == current_user.id)
    
    # Filter branch_id
    if branch_id:
        query = query.filter(Document.branch_id == branch_id)
        
    # Filter employee_id
    if employee_id:
        query = query.filter(Document.assigned_to == employee_id)
        
    # Filter status
    if status:
        query = query.filter(Document.status == status)
        
    # Filter priority
    if priority:
        query = query.filter(Document.priority == priority)
        
    # Search filter (Document number, file name, remarks, status)
    if search:
        # Join user to search by employee name
        search_filter = or_(
            Document.document_number.ilike(f"%{search}%"),
            Document.file_name.ilike(f"%{search}%"),
            Document.remarks.ilike(f"%{search}%"),
            Document.status.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    # Sort
    sort_col = getattr(Document, sort_by, Document.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))
        
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    
    # Build serialization items
    response_items = []
    for doc in results:
        uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
        assignee = db.query(User).filter(User.id == doc.assigned_to).first() if doc.assigned_to else None
        branch = db.query(Branch).filter(Branch.id == doc.branch_id).first() if doc.branch_id else None
        
        # Calculate processing time if assigned and completed
        proc_time = ""
        assignment = db.query(Assignment).filter(Assignment.document_id == doc.id).order_by(desc(Assignment.assigned_at)).first()
        if assignment:
            end_time = assignment.completed_at or datetime.datetime.utcnow()
            duration = end_time - assignment.assigned_at
            hours = duration.total_seconds() / 3600
            proc_time = f"{hours:.1f} hrs"
        
        response_items.append({
            "id": doc.id,
            "document_number": doc.document_number,
            "file_name": doc.file_name,
            "storage_path": doc.storage_path,
            "status": doc.status,
            "branch_id": doc.branch_id,
            "priority": doc.priority,
            "remarks": doc.remarks,
            "uploaded_by": doc.uploaded_by,
            "assigned_to": doc.assigned_to,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "uploader_name": uploader.name if uploader else "System",
            "assignee_name": assignee.name if assignee else "None",
            "branch_name": branch.name if branch else "None",
            "processing_time": proc_time
        })
        
    return {
        "total": total,
        "items": response_items
    }

@router.get("/api/documents/{id}")
def get_document(
    id: int,
    current_user: User = Depends(any_role_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role == "employee" and doc.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not assigned to you")
        
    uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
    assignee = db.query(User).filter(User.id == doc.assigned_to).first() if doc.assigned_to else None
    branch = db.query(Branch).filter(Branch.id == doc.branch_id).first() if doc.branch_id else None
    
    # Fetch assignment details
    assignments_history = []
    assignments = db.query(Assignment).filter(Assignment.document_id == doc.id).order_by(desc(Assignment.assigned_at)).all()
    for ass in assignments:
        assigner = db.query(User).filter(User.id == ass.assigned_by).first()
        emp = db.query(User).filter(User.id == ass.employee_id).first()
        assignments_history.append({
            "id": ass.id,
            "employee_name": emp.name if emp else "Unknown",
            "assigned_by_name": assigner.name if assigner else "Unknown",
            "assigned_at": ass.assigned_at,
            "completed_at": ass.completed_at
        })

    return {
        "id": doc.id,
        "document_number": doc.document_number,
        "file_name": doc.file_name,
        "storage_path": doc.storage_path,
        "status": doc.status,
        "branch_id": doc.branch_id,
        "priority": doc.priority,
        "remarks": doc.remarks,
        "uploaded_by": doc.uploaded_by,
        "assigned_to": doc.assigned_to,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "uploader_name": uploader.name if uploader else "System",
        "assignee_name": assignee.name if assignee else "None",
        "branch_name": branch.name if branch else "None",
        "assignments_history": assignments_history
    }

@router.delete("/api/documents/{id}")
def delete_document(
    id: int,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete local file if it exists
    file_path = os.path.join(UPLOAD_DIR, doc.storage_path)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
            
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Document Deleted",
        description=f"Deleted document {doc.file_name} ({doc.document_number}).",
        ip_address=ip
    )
    
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}

# --- Assignment Endpoints ---

@router.post("/api/assign")
def assign_document(
    payload: AssignRequest,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    # This acts as single assign, taking document from URL parameter or query if we implement bulk assign
    # In bulk assign, payload takes List[int]
    pass

@router.post("/api/documents/assign-bulk")
def assign_bulk_documents(
    payload: BulkAssignRequest,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    employee = db.query(User).filter(User.id == payload.employee_id, User.role == "employee").first()
    if not employee:
        raise HTTPException(status_code=400, detail="Employee not found or role is not employee")
        
    ip = get_client_ip(request)
    assigned_count = 0
    
    for doc_id in payload.document_ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            continue
            
        # Update document
        doc.assigned_to = employee.id
        doc.status = "Processing"
        doc.updated_at = datetime.datetime.utcnow()
        
        # Add assignment record
        new_assignment = Assignment(
            document_id=doc.id,
            employee_id=employee.id,
            assigned_by=current_user.id,
            assigned_at=datetime.datetime.utcnow()
        )
        db.add(new_assignment)
        
        # Activity log
        log_activity(
            db,
            user_id=current_user.id,
            action="Work Assigned",
            description=f"Assigned document {doc.document_number} to {employee.name}.",
            ip_address=ip
        )
        
        # Notification to employee
        create_notification(
            db,
            user_id=employee.id,
            message=f"New document task assigned: {doc.file_name} ({doc.document_number})."
        )
        
        assigned_count += 1
        
    db.commit()
    return {"message": f"Successfully assigned {assigned_count} documents to {employee.name}."}

@router.put("/api/reassign")
def reassign_document(
    payload: BulkAssignRequest,
    request: Request,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    employee = db.query(User).filter(User.id == payload.employee_id, User.role == "employee").first()
    if not employee:
        raise HTTPException(status_code=400, detail="Employee not found or role is not employee")
        
    ip = get_client_ip(request)
    reassigned_count = 0
    
    for doc_id in payload.document_ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            continue
            
        old_employee_name = "None"
        if doc.assigned_to:
            old_emp = db.query(User).filter(User.id == doc.assigned_to).first()
            if old_emp:
                old_employee_name = old_emp.name
                
        # Close previous assignment completed_at
        prev_assign = db.query(Assignment).filter(
            Assignment.document_id == doc.id,
            Assignment.employee_id == doc.assigned_to,
            Assignment.completed_at == None
        ).first()
        if prev_assign:
            prev_assign.completed_at = datetime.datetime.utcnow()
            
        # Update document
        doc.assigned_to = employee.id
        doc.status = "Processing"
        doc.updated_at = datetime.datetime.utcnow()
        
        # Add assignment record
        new_assignment = Assignment(
            document_id=doc.id,
            employee_id=employee.id,
            assigned_by=current_user.id,
            assigned_at=datetime.datetime.utcnow()
        )
        db.add(new_assignment)
        
        # Activity log
        log_activity(
            db,
            user_id=current_user.id,
            action="Work Reassigned",
            description=f"Reassigned document {doc.document_number} from {old_employee_name} to {employee.name}.",
            ip_address=ip
        )
        
        # Notification to old employee
        if doc.assigned_to:
            create_notification(
                db,
                user_id=doc.assigned_to,
                message=f"Document task {doc.document_number} was reassigned to another agent."
            )
            
        # Notification to new employee
        create_notification(
            db,
            user_id=employee.id,
            message=f"Document task reassigned to you: {doc.file_name} ({doc.document_number})."
        )
        
        reassigned_count += 1
        
    db.commit()
    return {"message": f"Successfully reassigned {reassigned_count} documents to {employee.name}."}

@router.get("/api/employee/tasks")
def get_employee_tasks(
    status_filter: Optional[str] = None,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.assigned_to == current_user.id)
    if status_filter:
        query = query.filter(Document.status == status_filter)
    else:
        # Defaults to active ones (Processing or Assigned)
        query = query.filter(Document.status.in_(["Processing", "Assigned"]))
        
    tasks = query.all()
    results = []
    for t in tasks:
        uploader = db.query(User).filter(User.id == t.uploaded_by).first()
        branch = db.query(Branch).filter(Branch.id == t.branch_id).first() if t.branch_id else None
        results.append({
            "id": t.id,
            "document_number": t.document_number,
            "file_name": t.file_name,
            "status": t.status,
            "priority": t.priority,
            "remarks": t.remarks,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "uploaded_by_name": uploader.name if uploader else "System",
            "branch_name": branch.name if branch else "None"
        })
    return results

# --- Document Download Endpoint ---

@router.get("/api/documents/{id}/download")
def download_document(
    id: int,
    current_user: User = Depends(any_role_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role == "employee" and doc.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied. Document not assigned to you.")
        
    file_path = os.path.join(UPLOAD_DIR, doc.storage_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found on server")
        
    # Log download activity
    log_activity(
        db,
        user_id=current_user.id,
        action="File Downloaded",
        description=f"Downloaded file for document {doc.document_number} ({doc.file_name})."
    )
        
    return FileResponse(
        path=file_path,
        filename=doc.file_name,
        media_type="application/octet-stream"
    )

# --- Status Change & Workflow Endpoints ---

@router.put("/api/processing")
def mark_processing(
    payload: RemarksRequest,
    request: Request,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    # Find matching active task
    doc = db.query(Document).filter(
        Document.assigned_to == current_user.id,
        Document.status.in_(["Uploaded", "Assigned", "Processing"])
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="No active document task found in processing queue")
        
    doc.status = "Processing"
    doc.remarks = payload.remarks
    doc.updated_at = datetime.datetime.utcnow()
    
    # Audit log
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Document Processing Started",
        description=f"Started processing document {doc.document_number}. Remarks: {payload.remarks}",
        ip_address=ip
    )
    
    db.commit()
    return {"message": "Document marked as Processing."}

@router.put("/api/documents/{id}/processing")
def mark_doc_processing(
    id: int,
    payload: RemarksRequest,
    request: Request,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id, Document.assigned_to == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or not assigned to you")
        
    doc.status = "Processing"
    if payload.remarks:
        doc.remarks = payload.remarks
    doc.updated_at = datetime.datetime.utcnow()
    
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Document Processing Started",
        description=f"Started processing document {doc.document_number}. Remarks: {payload.remarks}",
        ip_address=ip
    )
    db.commit()
    return {"message": "Document is now in Processing."}

@router.put("/api/approve")
def approve_document(
    payload: RemarksRequest,
    request: Request,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    # Takes active tasks and marks Approved
    doc = db.query(Document).filter(
        Document.assigned_to == current_user.id,
        Document.status == "Processing"
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="No active processing document task found")
        
    # Close assignment
    assignment = db.query(Assignment).filter(
        Assignment.document_id == doc.id,
        Assignment.employee_id == current_user.id,
        Assignment.completed_at == None
    ).first()
    if assignment:
        assignment.completed_at = datetime.datetime.utcnow()
        
    doc.status = "Approved"
    doc.remarks = payload.remarks
    doc.updated_at = datetime.datetime.utcnow()
    
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Approved Document",
        description=f"Approved document {doc.document_number}. Remarks: {payload.remarks}",
        ip_address=ip
    )
    
    # Notify Admin(s)
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db,
            user_id=admin.id,
            message=f"Document {doc.document_number} has been Approved by {current_user.name}."
        )
        
    db.commit()
    return {"message": "Document marked as Approved."}

@router.put("/api/documents/{id}/approve")
def approve_doc_by_id(
    id: int,
    payload: RemarksRequest,
    request: Request,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id, Document.assigned_to == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or not assigned to you")
        
    # Close assignment
    assignment = db.query(Assignment).filter(
        Assignment.document_id == doc.id,
        Assignment.employee_id == current_user.id,
        Assignment.completed_at == None
    ).first()
    if assignment:
        assignment.completed_at = datetime.datetime.utcnow()
        
    doc.status = "Approved"
    doc.remarks = payload.remarks
    doc.updated_at = datetime.datetime.utcnow()
    
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Approved Document",
        description=f"Approved document {doc.document_number}. Remarks: {payload.remarks}",
        ip_address=ip
    )
    
    # Notify Admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db,
            user_id=admin.id,
            message=f"Document {doc.document_number} has been Approved by {current_user.name}."
        )
        
    db.commit()
    return {"message": "Document approved."}

@router.put("/api/reject")
def reject_document(
    payload: RemarksRequest,
    request: Request,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.assigned_to == current_user.id,
        Document.status == "Processing"
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="No active processing document task found")
        
    # Close assignment
    assignment = db.query(Assignment).filter(
        Assignment.document_id == doc.id,
        Assignment.employee_id == current_user.id,
        Assignment.completed_at == None
    ).first()
    if assignment:
        assignment.completed_at = datetime.datetime.utcnow()
        
    doc.status = "Rejected"
    doc.remarks = payload.remarks
    doc.updated_at = datetime.datetime.utcnow()
    
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Rejected Document",
        description=f"Rejected document {doc.document_number}. Remarks: {payload.remarks}",
        ip_address=ip
    )
    
    # Notify Admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db,
            user_id=admin.id,
            message=f"Document {doc.document_number} has been Rejected by {current_user.name}. Remarks: {payload.remarks}"
        )
        
    db.commit()
    return {"message": "Document marked as Rejected."}

@router.put("/api/documents/{id}/reject")
def reject_doc_by_id(
    id: int,
    payload: RemarksRequest,
    request: Request,
    current_user: User = Depends(employee_required),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id, Document.assigned_to == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or not assigned to you")
        
    # Close assignment
    assignment = db.query(Assignment).filter(
        Assignment.document_id == doc.id,
        Assignment.employee_id == current_user.id,
        Assignment.completed_at == None
    ).first()
    if assignment:
        assignment.completed_at = datetime.datetime.utcnow()
        
    doc.status = "Rejected"
    doc.remarks = payload.remarks
    doc.updated_at = datetime.datetime.utcnow()
    
    ip = get_client_ip(request)
    log_activity(
        db,
        user_id=current_user.id,
        action="Employee Rejected Document",
        description=f"Rejected document {doc.document_number}. Remarks: {payload.remarks}",
        ip_address=ip
    )
    
    # Notify Admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db,
            user_id=admin.id,
            message=f"Document {doc.document_number} has been Rejected by {current_user.name}. Remarks: {payload.remarks}"
        )
        
    db.commit()
    return {"message": "Document rejected."}
