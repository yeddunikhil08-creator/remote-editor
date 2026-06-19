from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime
import io
import csv
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User, AuditLog
from app.services.auth_service import require_role

router = APIRouter(prefix="/logs", tags=["Audit Logging"])

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    username: Optional[str]
    action: str
    detail: Optional[str]

    class Config:
        from_attributes = True

@router.get("", response_model=List[AuditLogResponse])
def get_logs(
    query: Optional[str] = Query(None, description="Search term for actions or details"),
    action: Optional[str] = Query(None, description="Filter logs by exact action"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    db_query = db.query(AuditLog)
    
    if action:
        db_query = db_query.filter(AuditLog.action == action)
        
    if query:
        db_query = db_query.filter(
            (AuditLog.detail.ilike(f"%{query}%")) | 
            (AuditLog.username.ilike(f"%{query}%")) |
            (AuditLog.action.ilike(f"%{query}%"))
        )
        
    return db_query.order_by(AuditLog.timestamp.desc()).all()

@router.get("/export")
def export_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator"]))
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    
    # Write to a string buffer
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Timestamp (UTC)", "User", "Action", "Detail"])
    
    # Data
    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            log.username or "System",
            log.action,
            log.detail or ""
        ])
        
    output.seek(0)
    
    response = StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=audit_logs.csv"
    return response
