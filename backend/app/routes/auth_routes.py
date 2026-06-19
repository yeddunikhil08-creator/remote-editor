from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.db import get_db
from app.models.models import User, AuditLog
from app.services.auth_service import (
    verify_password,
    hash_password,
    create_access_token,
    get_current_user,
    require_role
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    username: str
    password: str
    role: str  # Admin, Operator, Viewer

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

def authenticate_user(username: str, password: str, db: Session) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    return user

def generate_login_response(user: User, db: Session):
    access_token = create_access_token(data={"sub": user.username})
    
    # Audit log
    log_entry = AuditLog(
        username=user.username,
        action="Login",
        detail=f"User '{user.username}' with role '{user.role}' logged in successfully."
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role
        }
    }

@router.post("/login")
def login(request_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(request_data.username, request_data.password, db)
    return generate_login_response(user, db)

@router.post("/token")
def login_for_token(form_data: OAuth2PasswordRequestForm = Depends(OAuth2PasswordRequestForm), db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    return generate_login_response(user, db)

@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister, current_user: User = Depends(require_role(["Admin"])), db: Session = Depends(get_db)):
    if user_data.role not in ["Admin", "Operator", "Viewer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: Admin, Operator, Viewer"
        )
        
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
        
    new_user = User(
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Audit log
    log_entry = AuditLog(
        username=current_user.username,
        action="Register User",
        detail=f"Admin created user '{new_user.username}' with role '{new_user.role}'."
    )
    db.add(log_entry)
    db.commit()
    
    return new_user

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
