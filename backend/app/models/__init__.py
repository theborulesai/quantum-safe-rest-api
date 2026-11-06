"""
Quantum-Safe REST API - SQLAlchemy Database Models
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    messages_received = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")
    crypto_logs = relationship("CryptoLog", back_populates="user")
    key_pairs = relationship("KeyPair", back_populates="user")


class KeyPair(Base):
    __tablename__ = "key_pairs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    algorithm = Column(String(20), nullable=False)       # "ML-KEM-768" or "ML-DSA-65"
    purpose = Column(String(10), nullable=False)         # "kem" or "dsa"
    public_key = Column(Text, nullable=False)            # base64
    # NOTE: Private key stored server-side for demo only.
    # In production, private keys NEVER leave the client device.
    private_key = Column(Text, nullable=False)           # base64
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="key_pairs")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Encrypted payload
    ciphertext = Column(Text, nullable=False)         # AES-GCM encrypted content (b64)
    nonce = Column(String(50), nullable=False)         # AES-GCM nonce (b64)
    
    # KEM envelope
    kem_ciphertext = Column(Text, nullable=False)     # ML-KEM encapsulated key (b64)
    
    # Signature
    signature = Column(Text, nullable=False)          # ML-DSA signature (b64)
    
    # Metadata
    is_verified = Column(Boolean, default=False)
    is_tampered = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="messages_received")


class CryptoLog(Base):
    __tablename__ = "crypto_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    operation = Column(String(50), nullable=False)   # e.g. "keygen", "encaps", "sign"
    algorithm = Column(String(30), nullable=False)
    status = Column(String(10), nullable=False)      # "success" or "failure"
    duration_ms = Column(String(10), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="crypto_logs")

