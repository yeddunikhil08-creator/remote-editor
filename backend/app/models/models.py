import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Viewer", nullable=False)  # Admin, Operator, Viewer

class XMLFile(Base):
    __tablename__ = "xml_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True, nullable=False)
    current_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_editor = Column(String, nullable=True)

    versions = relationship("XMLVersion", back_populates="xml_file", cascade="all, delete-orphan")

class XMLVersion(Base):
    __tablename__ = "xml_versions"
    id = Column(Integer, primary_key=True, index=True)
    xml_file_id = Column(Integer, ForeignKey("xml_files.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    editor = Column(String, nullable=True)
    change_notes = Column(String, nullable=True)

    xml_file = relationship("XMLFile", back_populates="versions")

class Backup(Base):
    __tablename__ = "backups"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    backup_path = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    editor = Column(String, nullable=True)

class SoftwareUpdate(Base):
    __tablename__ = "software_updates"
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, index=True, nullable=False)
    release_notes = Column(Text, nullable=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    package_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, unique=True, index=True, nullable=False)
    hostname = Column(String, nullable=True)
    ip = Column(String, nullable=True)
    version = Column(String, default="1.0", nullable=False)
    status = Column(String, default="Healthy", nullable=False)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    username = Column(String, nullable=True)
    action = Column(String, nullable=False)  # e.g., Upload, Edit, Rollback, Backup, Delete, Login, Logout, Update, Heartbeat
    detail = Column(Text, nullable=True)
