import sys
import os

# Add parent directory to path so we can import backend packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.db import SessionLocal, Base, engine
from backend.models.models import User, Document, Branch, Assignment, ActivityLog
from backend.auth.auth import get_password_hash, verify_password, create_access_token
from backend.seed import seed_database

def run_backend_tests():
    print("=== Running Programmatic Backend Verification Tests ===")
    
    # 1. Test database creation & seeding
    try:
        seed_database()
        print("✓ Database creation and seeding verified.")
    except Exception as e:
        print(f"✗ Seeding failed: {str(e)}")
        return False

    db = SessionLocal()
    try:
        # 2. Test fetching seeded branches
        branches = db.query(Branch).all()
        if len(branches) != 5:
            print(f"✗ Unexpected branch count: {len(branches)}")
            return False
        print(f"✓ Seeded branches count verified: {len(branches)} branches found.")

        # 3. Test admin credentials
        admin = db.query(User).filter(User.email == "admin@workspace.com").first()
        if not admin or admin.role != "admin":
            print("✗ Admin user not found or incorrect role.")
            return False
            
        is_pwd_valid = verify_password("AdminPassword123!", admin.password)
        if not is_pwd_valid:
            print("✗ Admin password verification failed.")
            return False
        print("✓ Admin user credentials verified.")

        # 4. Test JWT generation
        token = create_access_token({"sub": admin.email, "role": admin.role})
        if not token:
            print("✗ JWT Access token generation failed.")
            return False
        print("✓ JWT Access token generation verified.")

        # 5. Simulate Document Upload
        test_doc = Document(
            document_number="DOC-TEST-9999",
            file_name="test_payslip.pdf",
            storage_path="test_path_uuid.pdf",
            status="Uploaded",
            branch_id=admin.branch_id,
            uploaded_by=admin.id,
            priority="High"
        )
        db.add(test_doc)
        db.commit()
        db.refresh(test_doc)
        print("✓ Simulating Document Upload verified.")

        # 6. Simulate Document Assignment & Processing
        employee = db.query(User).filter(User.role == "employee").first()
        if not employee:
            print("✗ Employee user not found.")
            return False

        # Assign document
        test_doc.assigned_to = employee.id
        test_doc.status = "Processing"
        
        assignment = Assignment(
            document_id=test_doc.id,
            employee_id=employee.id,
            assigned_by=admin.id
        )
        db.add(assignment)
        
        # Log activity
        log = ActivityLog(
            user_id=admin.id,
            action="Work Assigned",
            description=f"Assigned test document to {employee.name}."
        )
        db.add(log)
        db.commit()
        
        # Verify assignment update
        db.refresh(test_doc)
        if test_doc.status != "Processing" or test_doc.assigned_to != employee.id:
            print("✗ Document assignment state transition failed.")
            return False
        print("✓ Document assignment & transition to 'Processing' verified.")

        # 7. Approve Document
        test_doc.status = "Approved"
        test_doc.remarks = "Verified signature and PAN card details."
        
        completed_assignment = db.query(Assignment).filter(
            Assignment.document_id == test_doc.id,
            Assignment.employee_id == employee.id,
            Assignment.completed_at == None
        ).first()
        if completed_assignment:
            import datetime
            completed_assignment.completed_at = datetime.datetime.utcnow()
            
        db.commit()
        db.refresh(test_doc)
        if test_doc.status != "Approved" or test_doc.remarks != "Verified signature and PAN card details.":
            print("✗ Document approval transition failed.")
            return False
        print("✓ Document approval transition verified.")

        # Clean up test document
        db.delete(test_doc)
        db.commit()
        print("✓ Cleaned up test data.")
        
        print("\n=== ALL BACKEND PROGRAMMATIC TESTS PASSED SUCCESSFULLY ===")
        return True

    except Exception as e:
        print(f"✗ Unexpected error during tests: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_backend_tests()
    sys.exit(0 if success else 1)
