from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import shutil
import datetime
from pydantic import BaseModel
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User, Backup, XMLFile, XMLVersion, AuditLog
from app.services.auth_service import require_role
from app.utils.xml_utils import validate_xml

router = APIRouter(prefix="/backups", tags=["Backups"])

XML_FOLDER = "xml_files"
BACKUP_FOLDER = "backups"

class BackupResponse(BaseModel):
    id: int
    filename: str
    backup_path: str
    timestamp: datetime.datetime
    editor: Optional[str] = None

    class Config:
        from_attributes = True

class RestoreBackupRequest(BaseModel):
    backup_id: int
    change_notes: Optional[str] = "Restored from backup"

@router.get("", response_model=List[BackupResponse])
def list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    return db.query(Backup).order_by(Backup.timestamp.desc()).all()

@router.post("/restore-backup")
def restore_backup(
    payload: RestoreBackupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    backup = db.query(Backup).filter(Backup.id == payload.backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup record not found")

    if not os.path.exists(backup.backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found on disk")

    # Read backup file content
    with open(backup.backup_path, "r", encoding="utf-8") as f:
        backup_content = f.read()

    # Get or create active file
    db_file = db.query(XMLFile).filter(XMLFile.filename == backup.filename).first()
    file_path = os.path.join(XML_FOLDER, backup.filename)

    # 1. Read current content for backup (so we don't lose current state if needed)
    current_content = ""
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            current_content = f.read()

    # 2. Write backup content to active file
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(backup_content)

    # 3. Validate
    if not validate_xml(file_path):
        # Restore disk back to current content
        if current_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(current_content)
        raise HTTPException(status_code=400, detail="Invalid XML content in backup file. Aborting restore.")

    # 4. If file not in DB, create it
    if not db_file:
        db_file = XMLFile(
            filename=backup.filename,
            current_version=1,
            last_editor=current_user.username
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        new_version_num = 1
    else:
        db_file.current_version += 1
        db_file.updated_at = datetime.datetime.utcnow()
        db_file.last_editor = current_user.username
        new_version_num = db_file.current_version

    # 5. Insert new XML version
    new_version = XMLVersion(
        xml_file_id=db_file.id,
        version_number=new_version_num,
        content=backup_content,
        editor=current_user.username,
        change_notes=f"Restored from backup ({backup.backup_path}). Note: {payload.change_notes}"
    )
    db.add(new_version)

    # 6. Log audit
    log_entry = AuditLog(
        username=current_user.username,
        action="Restore",
        detail=f"Restored file '{backup.filename}' from backup ID {backup.id} (Saved as new version {new_version_num})."
    )
    db.add(log_entry)
    db.commit()

    return {
        "message": f"Successfully restored '{backup.filename}' to version {new_version_num}",
        "new_version": new_version_num
    }

@router.delete("/backup/{id}")
def delete_backup(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    backup = db.query(Backup).filter(Backup.id == id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup record not found")

    # Delete disk file
    if os.path.exists(backup.backup_path):
        try:
            os.remove(backup.backup_path)
        except Exception as e:
            pass

    # Delete database record
    filename = backup.filename
    db.delete(backup)

    # Log audit
    log_entry = AuditLog(
        username=current_user.username,
        action="Delete Backup",
        detail=f"Deleted backup file for '{filename}' with ID {id}."
    )
    db.add(log_entry)
    db.commit()

    return {
        "message": f"Backup ID {id} deleted successfully"
    }
