"""
Encryption utilities for secure document storage.
Uses Fernet symmetric encryption (AES-128-CBC under the hood).
The encryption key is read from Django settings (DOCUMENT_ENCRYPTION_KEY).
"""
import os
from cryptography.fernet import Fernet
from django.conf import settings


def get_fernet():
    key = getattr(settings, 'DOCUMENT_ENCRYPTION_KEY', None)
    if not key:
        raise ValueError("DOCUMENT_ENCRYPTION_KEY is not set in settings.py")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_bytes(data: bytes) -> bytes:
    """Encrypt raw file bytes before saving to disk."""
    return get_fernet().encrypt(data)


def decrypt_bytes(data: bytes) -> bytes:
    """Decrypt raw bytes read from disk."""
    return get_fernet().decrypt(data)


def generate_key() -> str:
    """Helper to generate a new Fernet key (run once, store in settings)."""
    return Fernet.generate_key().decode()
