"""
Quantum-Safe REST API - Core Configuration
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Quantum-Safe REST API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "quantum-safe-secret-key-change-in-production-must-be-32-bytes-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./quantum_safe.db"
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

