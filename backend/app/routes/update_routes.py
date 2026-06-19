from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import shutil
import os
import datetime
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User, SoftwareUpdate, AuditLog
from app.services.auth_service import require_role

router = APIRouter(prefix="/updates", tags=["Software Update Management"])

UPDATE_FOLDER = "updates"
os.makedirs(UPDATE_FOLDER, exist_ok=True)

class SoftwareUpdateResponse(BaseModel):
    id: int
    version: str
    release_notes: Optional[str]
    upload_date: datetime.datetime
    package_size: int
    file_path: str

    class Config:
        from_attributes = True

@router.post("/upload-update", response_model=SoftwareUpdateResponse)
async def upload_update(
    version: str = Form(...),
    release_notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP archive files (.zip) are allowed"
        )

    # Check if this version exists
    existing_update = db.query(SoftwareUpdate).filter(SoftwareUpdate.version == version).first()
    if existing_update:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Software update version {version} is already registered"
        )

    file_path = os.path.join(UPDATE_FOLDER, f"{version}.zip")
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    package_size = os.path.getsize(file_path)

    new_update = SoftwareUpdate(
        version=version,
        release_notes=release_notes,
        package_size=package_size,
        file_path=file_path
    )
    db.add(new_update)
    
    # Log audit
    log_entry = AuditLog(
        username=current_user.username,
        action="Upload Update",
        detail=f"Uploaded software update package version '{version}' ({package_size} bytes)."
    )
    db.add(log_entry)
    db.commit()
    db.refresh(new_update)

    return new_update

@router.get("/check-update")
def check_update(
    client_version: str,
    db: Session = Depends(get_db)
):
    # Fetch the latest version ordered by upload date
    latest_update = db.query(SoftwareUpdate).order_by(SoftwareUpdate.upload_date.desc()).first()
    
    if not latest_update:
        return {
            "update_available": False,
            "message": "No software updates registered on the server"
        }
        
    # Compare strings for a basic check, or semantic comparison if needed.
    # To keep it simple and robust, check if client_version matches latest_update.version
    if client_version != latest_update.version:
        return {
            "update_available": True,
            "latest_version": latest_update.version,
            "release_notes": latest_update.release_notes,
            "package_size": latest_update.package_size,
            "download_url": f"/updates/download-update/{latest_update.version}"
        }
        
    return {
        "update_available": False,
        "message": "Client software is up-to-date"
    }

@router.get("/download-update/{version}")
def download_update(
    version: str,
    db: Session = Depends(get_db)
):
    update_pkg = db.query(SoftwareUpdate).filter(SoftwareUpdate.version == version).first()
    if not update_pkg or not os.path.exists(update_pkg.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Software update package version {version} not found"
        )
        
    # Log audit for update download (represented as client request)
    log_entry = AuditLog(
        username="System/ClientAgent",
        action="Update Download",
        detail=f"Downloaded update package version '{version}'."
    )
    db.add(log_entry)
    db.commit()

    return FileResponse(
        path=update_pkg.file_path,
        filename=f"{version}.zip",
        media_type="application/zip"
    )

@router.get("/update-history", response_model=List[SoftwareUpdateResponse])
def get_update_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    return db.query(SoftwareUpdate).order_by(SoftwareUpdate.upload_date.desc()).all()
