import os
import shutil
import uuid
from fastapi import UploadFile, HTTPException, status

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "backend/uploads")
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "zip"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

def validate_file(file: UploadFile):
    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension not allowed. Supported types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    # File size validation requires reading the file.
    # We will do this during saving to avoid double-loading.
    return ext

def save_uploaded_file(file: UploadFile) -> str:
    ext = validate_file(file)
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Write file content in chunks to monitor size and optimize memory
    size = 0
    try:
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(8192):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="File exceeds maximum size of 50MB"
                    )
                buffer.write(chunk)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
        
    # Return path relative to project root or accessible static mount URL
    return unique_filename
