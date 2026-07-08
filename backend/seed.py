from backend.database.db import SessionLocal, engine, Base
from backend.models.models import Branch, User
from backend.auth.auth import get_password_hash

def seed_database():
    db = SessionLocal()
    try:
        print("Checking/creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # 1. Seed Branches
        branches_data = [
            {"name": "Hyderabad", "location": "Madhapur, Hitech City"},
            {"name": "Bangalore", "location": "Whitefield"},
            {"name": "Chennai", "location": "T. Nagar"},
            {"name": "Mumbai", "location": "Bandra Kurla Complex"},
            {"name": "Pune", "location": "Hinjewadi"}
        ]
        
        branches = {}
        for b_info in branches_data:
            existing_branch = db.query(Branch).filter(Branch.name == b_info["name"]).first()
            if not existing_branch:
                branch = Branch(name=b_info["name"], location=b_info["location"])
                db.add(branch)
                db.commit()
                db.refresh(branch)
                print(f"Seeded branch: {branch.name}")
                branches[branch.name] = branch.id
            else:
                branches[existing_branch.name] = existing_branch.id
                
        # 2. Seed Admin User
        admin_email = "admin@workspace.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            admin_pwd = get_password_hash("AdminPassword123!")
            admin = User(
                name="Admin User",
                email=admin_email,
                password=admin_pwd,
                role="admin",
                branch_id=branches["Hyderabad"],
                phone="+919876543210",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"Seeded Admin user: {admin_email} (Password: AdminPassword123!)")
            
        # 3. Seed Employee Users
        employees_data = [
            {
                "name": "Hyderabad Employee",
                "email": "hyd_emp@workspace.com",
                "password": "EmpPassword123!",
                "branch": "Hyderabad",
                "phone": "+919876543211"
            },
            {
                "name": "Bangalore Employee",
                "email": "blr_emp@workspace.com",
                "password": "EmpPassword123!",
                "branch": "Bangalore",
                "phone": "+919876543212"
            }
        ]
        
        for emp_info in employees_data:
            existing_emp = db.query(User).filter(User.email == emp_info["email"]).first()
            if not existing_emp:
                emp_pwd = get_password_hash(emp_info["password"])
                emp = User(
                    name=emp_info["name"],
                    email=emp_info["email"],
                    password=emp_pwd,
                    role="employee",
                    branch_id=branches[emp_info["branch"]],
                    phone=emp_info["phone"],
                    is_active=True
                )
                db.add(emp)
                db.commit()
                print(f"Seeded Employee user: {emp_info['email']} (Password: EmpPassword123!)")
                
        print("Database seeding completed successfully.")
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
