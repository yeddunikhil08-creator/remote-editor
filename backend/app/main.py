from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database.db import Base, engine, SessionLocal
from app.models.models import User
from app.services.auth_service import hash_password

# Import routers
from app.routes.auth_routes import router as auth_router
from app.routes.xml_routes import router as xml_router
from app.routes.backup_routes import router as backup_router
from app.routes.update_routes import router as update_router
from app.routes.client_routes import router as client_router
from app.routes.log_routes import router as log_router

# Initialize database
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Remote Configuration & Software Update Management System (RCSUMS)",
    description="Enterprise API engine for remote software and configuration controls.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo purposes allow all, or configure to client URL like http://localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            print("No users found. Seeding default demo accounts...")
            admin_user = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                role="Admin"
            )
            operator_user = User(
                username="operator",
                hashed_password=hash_password("operator123"),
                role="Operator"
            )
            viewer_user = User(
                username="viewer",
                hashed_password=hash_password("viewer123"),
                role="Viewer"
            )
            db.add_all([admin_user, operator_user, viewer_user])
            db.commit()
            print("Database seeding completed successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

# Include Routers
app.include_router(auth_router)
app.include_router(xml_router)
app.include_router(backup_router)
app.include_router(update_router)
app.include_router(client_router)
app.include_router(log_router)

@app.get("/")
def home():
    return {
        "message": "Remote Editor Backend Running",
        "status": "Healthy"
    }