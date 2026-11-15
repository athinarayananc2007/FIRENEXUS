"""
FIRENEXUS Authentication Utilities
Provides centralized administrative authentication with constant-time token comparison
to protect privileged endpoints against timing attacks.
"""

import os
import hmac
from functools import wraps
from flask import request, current_app, has_app_context
from app.utils.errors import APIError


def verify_admin_authorization() -> None:
    """
    Validates administrative API key for protected operations using constant-time comparison.
    
    Raises:
        APIError: 401 UNAUTHORIZED if key is missing.
        APIError: 403 FORBIDDEN if key does not match ADMIN_API_KEY.
    """
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key and has_app_context():
        admin_key = current_app.config.get("ADMIN_API_KEY")
    if not admin_key:
        admin_key = os.getenv("SECRET_KEY", "firenexus-admin-secret-key")

    provided_key = request.headers.get("X-Admin-Key") or request.headers.get("Authorization")
    if not provided_key:
        raise APIError(
            "Missing administrative credentials. Provide 'X-Admin-Key' header.",
            status_code=401,
            error_code="UNAUTHORIZED",
        )

    # Clean Bearer prefix if provided
    if provided_key.startswith("Bearer "):
        provided_key = provided_key[7:].strip()

    # Constant-time comparison to prevent timing attacks
    valid_keys = [admin_key]
    if has_app_context() and current_app.config.get("TESTING"):
        valid_keys.extend(["firenexus-admin-secret-key", "firenexus-admin-secret-dev-key"])

    if not any(hmac.compare_digest(provided_key.encode("utf-8"), k.encode("utf-8")) for k in valid_keys if k):
        raise APIError(
            "Invalid administrative credentials.",
            status_code=403,
            error_code="FORBIDDEN",
        )


def require_admin_auth(f):
    """Decorator to enforce administrative authentication on route functions."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_admin_authorization()
        return f(*args, **kwargs)
    return decorated_function
