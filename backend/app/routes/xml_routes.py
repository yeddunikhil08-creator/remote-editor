from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, status
from fastapi.responses import PlainTextResponse, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import shutil
import os
import datetime
from typing import Optional, List

from app.database.db import get_db
from app.models.models import User, XMLFile, XMLVersion, Backup, AuditLog
from app.services.auth_service import get_current_user, require_role
from app.utils.xml_utils import validate_xml

router = APIRouter(prefix="/xml", tags=["XML Management"])

XML_FOLDER = "xml_files"
BACKUP_FOLDER = "backups"

# Ensure folders exist
os.makedirs(XML_FOLDER, exist_ok=True)
os.makedirs(BACKUP_FOLDER, exist_ok=True)

class EditXMLRequest(BaseModel):
    content: str
    change_notes: Optional[str] = "Updated via editor"

class RollbackRequest(BaseModel):
    version: int
    change_notes: Optional[str] = "Rollback initiated"

class XMLFileResponse(BaseModel):
    id: int
    filename: str
    current_version: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_editor: Optional[str]

    class Config:
        from_attributes = True

class VersionHistoryResponse(BaseModel):
    version_number: int
    timestamp: datetime.datetime
    editor: Optional[str]
    change_notes: Optional[str]

    class Config:
        from_attributes = True

@router.post("/upload-xml")
async def upload_xml(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    if not file.filename.endswith(".xml"):
        raise HTTPException(
            status_code=400,
            detail="Only XML files are allowed"
        )

    file_path = os.path.join(XML_FOLDER, file.filename)
    
    # Save file to temp location for validation
    temp_path = file_path + ".tmp"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    is_valid = validate_xml(temp_path)

    if not is_valid:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(
            status_code=400,
            detail="Invalid XML file structure"
        )

    # Rename temp file to actual file
    if os.path.exists(file_path):
        os.remove(file_path)
    os.rename(temp_path, file_path)

    # Database updates
    db_file = db.query(XMLFile).filter(XMLFile.filename == file.filename).first()
    
    # Read XML content to save in DB version history
    with open(file_path, "r", encoding="utf-8") as f:
        xml_content = f.read()

    if db_file:
        # Existing file: increment version
        db_file.current_version += 1
        db_file.updated_at = datetime.datetime.utcnow()
        db_file.last_editor = current_user.username
        version_num = db_file.current_version
    else:
        # New file
        db_file = XMLFile(
            filename=file.filename,
            current_version=1,
            last_editor=current_user.username
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        version_num = 1

    # Create new version history entry
    new_version = XMLVersion(
        xml_file_id=db_file.id,
        version_number=version_num,
        content=xml_content,
        editor=current_user.username,
        change_notes="Initial file upload" if version_num == 1 else "Re-uploaded file"
    )
    db.add(new_version)
    
    # Log audit
    log_entry = AuditLog(
        username=current_user.username,
        action="Upload",
        detail=f"Uploaded configuration file '{file.filename}' (Version {version_num})."
    )
    db.add(log_entry)
    db.commit()

    return {
        "message": "XML uploaded successfully",
        "filename": file.filename,
        "version": version_num
    }

@router.get("/list-xml", response_model=List[XMLFileResponse])
def list_xml(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    # Retrieve files registered in the database
    return db.query(XMLFile).all()

@router.get("/read-xml/{filename}")
def read_xml(
    filename: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    file_path = os.path.join(XML_FOLDER, filename)

    if version is not None:
        # Read a specific historical version from the DB
        db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()
        if not db_file:
            raise HTTPException(status_code=404, detail="File not found in database")
        
        db_version = db.query(XMLVersion).filter(
            XMLVersion.xml_file_id == db_file.id,
            XMLVersion.version_number == version
        ).first()
        
        if not db_version:
            raise HTTPException(status_code=404, detail=f"Version {version} not found")
        
        return PlainTextResponse(db_version.content)

    # Otherwise read current version from disk
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()

    return PlainTextResponse(content)

@router.get("/download-xml/{filename}")
def download_xml(
    filename: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    file_path = os.path.join(XML_FOLDER, filename)

    if version is not None:
        # Download historic version
        db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()
        if not db_file:
            raise HTTPException(status_code=404, detail="File not found in database")
        db_version = db.query(XMLVersion).filter(
            XMLVersion.xml_file_id == db_file.id,
            XMLVersion.version_number == version
        ).first()
        if not db_version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        # Write temporarily to serve
        temp_download = os.path.join(XML_FOLDER, f"temp_{version}_{filename}")
        with open(temp_download, "w", encoding="utf-8") as f:
            f.write(db_version.content)
            
        return FileResponse(
            path=temp_download,
            filename=f"v{version}_{filename}",
            media_type='application/xml'
        )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/xml'
    )

@router.put("/edit-xml/{filename}")
def edit_xml(
    filename: str,
    content: Optional[str] = None,
    request_data: Optional[EditXMLRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    file_path = os.path.join(XML_FOLDER, filename)
    db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()
    
    if not os.path.exists(file_path) or not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Extract target content
    xml_content = ""
    change_notes = "Manual configuration edit"
    
    if request_data:
        xml_content = request_data.content
        if request_data.change_notes:
            change_notes = request_data.change_notes
    elif content is not None:
        xml_content = content

    if not xml_content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    # 1. Read current content for backup
    with open(file_path, "r", encoding="utf-8") as file:
        current_content = file.read()

    # 2. Create backup file
    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{os.path.splitext(filename)[0]}_backup_{timestamp_str}.xml"
    backup_path = os.path.join(BACKUP_FOLDER, backup_filename)
    
    with open(backup_path, "w", encoding="utf-8") as backup_file:
        backup_file.write(current_content)

    # 3. Save backup in database
    db_backup = Backup(
        filename=filename,
        backup_path=backup_path,
        editor=current_user.username
    )
    db.add(db_backup)

    # 4. Write new content to active file
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(xml_content)

    # 5. Validate the written XML
    if not validate_xml(file_path):
        # Roll back disk changes to current_content
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(current_content)
        raise HTTPException(status_code=400, detail="Invalid XML content structure. Reverted edits.")

    # 6. Update XML metadata in DB
    db_file.current_version += 1
    db_file.updated_at = datetime.datetime.utcnow()
    db_file.last_editor = current_user.username

    # 7. Create new XML version history record
    new_version = XMLVersion(
        xml_file_id=db_file.id,
        version_number=db_file.current_version,
        content=xml_content,
        editor=current_user.username,
        change_notes=change_notes
    )
    db.add(new_version)

    # 8. Audit logging
    log_entry = AuditLog(
        username=current_user.username,
        action="Edit",
        detail=f"Edited file '{filename}' updating from version {db_file.current_version - 1} to {db_file.current_version}."
    )
    db.add(log_entry)
    db.commit()

    return {
        "message": "XML updated successfully",
        "version": db_file.current_version
    }

@router.delete("/delete-xml/{filename}")
def delete_xml(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    file_path = os.path.join(XML_FOLDER, filename)
    db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found in database")

    # Remove local file if exists
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete db record
    db.delete(db_file)

    # Log deletion
    log_entry = AuditLog(
        username=current_user.username,
        action="Delete",
        detail=f"Deleted configuration file '{filename}' and all its version history."
    )
    db.add(log_entry)
    db.commit()

    return {
        "message": f"XML file {filename} deleted successfully"
    }

@router.get("/version-history/{filename}", response_model=List[VersionHistoryResponse])
def get_version_history(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="XML File not found")

    versions = db.query(XMLVersion).filter(
        XMLVersion.xml_file_id == db_file.id
    ).order_by(XMLVersion.version_number.desc()).all()

    return versions

@router.post("/rollback/{filename}")
def rollback_xml(
    filename: str,
    payload: RollbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    file_path = os.path.join(XML_FOLDER, filename)
    db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()

    if not db_file or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    target_version = db.query(XMLVersion).filter(
        XMLVersion.xml_file_id == db_file.id,
        XMLVersion.version_number == payload.version
    ).first()

    if not target_version:
        raise HTTPException(status_code=404, detail=f"Target version {payload.version} not found")

    # Read current active file content to save as backup
    with open(file_path, "r", encoding="utf-8") as file:
        current_content = file.read()

    # Create backup on disk
    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{os.path.splitext(filename)[0]}_rollback_backup_{timestamp_str}.xml"
    backup_path = os.path.join(BACKUP_FOLDER, backup_filename)
    
    with open(backup_path, "w", encoding="utf-8") as backup_file:
        backup_file.write(current_content)

    # Save backup in database
    db_backup = Backup(
        filename=filename,
        backup_path=backup_path,
        editor=current_user.username
    )
    db.add(db_backup)

    # Write target content back to configuration file
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(target_version.content)

    # Increment file version
    old_version = db_file.current_version
    db_file.current_version += 1
    db_file.updated_at = datetime.datetime.utcnow()
    db_file.last_editor = current_user.username

    # Create new XML version entry
    new_version_record = XMLVersion(
        xml_file_id=db_file.id,
        version_number=db_file.current_version,
        content=target_version.content,
        editor=current_user.username,
        change_notes=f"Rolled back from v{old_version} to v{payload.version}. Note: {payload.change_notes}"
    )
    db.add(new_version_record)

    # Log audit
    log_entry = AuditLog(
        username=current_user.username,
        action="Rollback",
        detail=f"Rolled back '{filename}' from version {old_version} to version {payload.version} (saved as new version {db_file.current_version})."
    )
    db.add(log_entry)
    db.commit()

    return {
        "message": f"Successfully rolled back to version {payload.version}",
        "new_version": db_file.current_version
    }

@router.get("/compare/{filename}")
def compare_versions(
    filename: str,
    v1: int = Query(...),
    v2: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    db_file = db.query(XMLFile).filter(XMLFile.filename == filename).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    version1 = db.query(XMLVersion).filter(
        XMLVersion.xml_file_id == db_file.id,
        XMLVersion.version_number == v1
    ).first()

    version2 = db.query(XMLVersion).filter(
        XMLVersion.xml_file_id == db_file.id,
        XMLVersion.version_number == v2
    ).first()

    if not version1 or not version2:
        raise HTTPException(status_code=404, detail="One or both versions not found")

    return {
        "filename": filename,
        "v1": v1,
        "v1_content": version1.content,
        "v2": v2,
        "v2_content": version2.content
    }