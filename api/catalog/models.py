from sqlalchemy import Column, String, Text, Boolean, BigInteger, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from api.common.db import Base
import uuid
import datetime as dt

def uuid_pk(): 
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

class CatalogItem(Base):
    __tablename__ = "catalog_items"
    
    id = uuid_pk()
    item_id = Column(String, unique=True, nullable=False)   # "backup-config"
    name = Column(String, nullable=False)
    description = Column(Text)
    labels = Column(JSONB, default=dict)
    # Example field for migration demo - remove after testing
    tags = Column(JSONB, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), default=dt.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=dt.datetime.utcnow)

    versions = relationship("CatalogVersion", back_populates="item", cascade="all,delete-orphan")

class CatalogVersion(Base):
    __tablename__ = "catalog_versions"
    
    id = uuid_pk()
    catalog_item_id = Column(UUID(as_uuid=True), ForeignKey("catalog_items.id"), nullable=False)
    version = Column(String, nullable=False)                 # semver string
    manifest = Column(JSONB, nullable=False)
    json_schema = Column(JSONB, nullable=False)
    ui_schema = Column(JSONB)
    storage_uri = Column(Text, nullable=False)
    source = Column(JSONB)                                   # repo/ref/path or local/bundle metadata
    size_bytes = Column(BigInteger)
    checksum_sha256 = Column(String)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=dt.datetime.utcnow)

    item = relationship("CatalogItem", back_populates="versions")
    __table_args__ = (UniqueConstraint("catalog_item_id", "version", name="uq_item_version"),)

class StorageObject(Base):
    __tablename__ = "storage_objects"
    
    id = uuid_pk()
    uri = Column(Text, unique=True, nullable=False)
    bytes = Column(BigInteger)
    checksum_sha256 = Column(String)
    last_accessed_at = Column(DateTime(timezone=True), default=dt.datetime.utcnow)
