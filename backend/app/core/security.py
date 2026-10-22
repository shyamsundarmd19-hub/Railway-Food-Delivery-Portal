import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings

# OAuth2 scheme looking for bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain text password against stored bcrypt hash."""
    try:
        # Bcrypt max password limit is 72 bytes
        plain_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generates bcrypt password hash with auto-generated salt."""
    plain_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_bytes, salt)
    return hashed.decode("utf-8")


def create_access_token(
    subject: Union[str, uuid.UUID, Any],
    role: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Creates a cryptographically signed JWT token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role.lower(),
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates JWT token claims."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
):
    """
    Dependency that decodes the Bearer token and retrieves user from database.
    Avoids circular imports by importing get_db & User inside.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing. Please provide 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.core.database import SessionLocal
    from app.models.models import User

    db: Session = SessionLocal()
    try:
        try:
            parsed_id = uuid.UUID(user_id_str)
        except ValueError:
            parsed_id = user_id_str

        user = db.query(User).filter(User.id == parsed_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account no longer exists.",
            )
        return user
    finally:
        db.close()


def require_role(*allowed_roles: str):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Example usage:
      @router.post("/", dependencies=[Depends(require_role("vendor", "admin"))])
    """
    normalized_allowed = [r.lower() for r in allowed_roles]

    def role_checker(current_user=Depends(get_current_user)):
        user_role = str(current_user.role).lower()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {list(allowed_roles)}. Current role is '{user_role}'.",
            )
        return current_user

    return role_checker
