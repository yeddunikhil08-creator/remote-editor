from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User, Client, AuditLog
from app.services.auth_service import require_role

router = APIRouter(prefix="/clients", tags=["Client Monitoring"])

class HeartbeatRequest(BaseModel):
    client_id: str
    version: str
    status: str
    ip: str
    hostname: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    client_id: str
    hostname: Optional[str]
    ip: Optional[str]
    version: str
    status: str
    last_seen: datetime.datetime
    is_online: bool

    class Config:
        from_attributes = True

@router.post("/heartbeat")
def client_heartbeat(
    payload: HeartbeatRequest,
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.client_id == payload.client_id).first()
    now = datetime.datetime.utcnow()

    # Determine status
    client_status = payload.status if payload.status else "Healthy"

    if client:
        # Update client
        client.hostname = payload.hostname if payload.hostname else client.hostname
        client.ip = payload.ip
        client.version = payload.version
        client.status = client_status
        client.last_seen = now
    else:
        # Create client
        client = Client(
            client_id=payload.client_id,
            hostname=payload.hostname if payload.hostname else payload.client_id,
            ip=payload.ip,
            version=payload.version,
            status=client_status,
            last_seen=now
        )
        db.add(client)
        
        # Log discovery in Audit Trail
        log_entry = AuditLog(
            username="System",
            action="Client Connected",
            detail=f"Discovered new client agent with ID '{payload.client_id}' at IP {payload.ip}."
        )
        db.add(log_entry)

    db.commit()
    return {"message": "Heartbeat accepted"}

@router.get("", response_model=List[ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Operator", "Viewer"]))
):
    clients = db.query(Client).all()
    now = datetime.datetime.utcnow()
    
    response_list = []
    for client in clients:
        # A client is considered online if it has sent a heartbeat within the last 60 seconds
        time_diff = (now - client.last_seen).total_seconds()
        is_online = time_diff < 60
        
        # Determine status representation
        display_status = client.status
        if not is_online:
            display_status = "Offline"
            
        response_list.append({
            "id": client.id,
            "client_id": client.client_id,
            "hostname": client.hostname,
            "ip": client.ip,
            "version": client.version,
            "status": display_status,
            "last_seen": client.last_seen,
            "is_online": is_online
        })
        
    return response_list
