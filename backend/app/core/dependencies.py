from typing import Callable, Dict, Any, List
from fastapi import Depends, Header, HTTPException, status
import jwt
from app.core.security import decode_token
from app.repositories.all_repositories import UserRepository
from app.core.errors import AppException


def get_current_user(
    authorization: str = Header(..., description="Bearer JWT token")
) -> Dict[str, Any]:
    if not authorization.startswith("Bearer "):
        raise AppException(
            code="UNAUTHORIZED",
            message="Invalid authentication scheme. 'Bearer <token>' required.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    token = authorization.split(" ")[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise AppException(
                code="UNAUTHORIZED",
                message="Invalid token type. Expected access token.",
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        user_id = payload.get("sub")
        if not user_id:
            raise AppException(
                code="UNAUTHORIZED",
                message="Malformed token payload.",
                status_code=status.HTTP_401_UNAUTHORIZED
            )
    except jwt.ExpiredSignatureError:
        raise AppException(
            code="TOKEN_EXPIRED",
            message="Authentication session expired. Please refresh token or log in again.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    except Exception:
        raise AppException(
            code="INVALID_TOKEN",
            message="Invalid or tampered access token.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    user_repo = UserRepository()
    user = user_repo.get_by_id(user_id)
    if not user:
        raise AppException(
            code="USER_NOT_FOUND",
            message="User account associated with this token does not exist.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    if user.get("status") != "active":
        raise AppException(
            code="USER_INACTIVE",
            message="User account is deactivated.",
            status_code=status.HTTP_403_FORBIDDEN
        )
    return user


def require_roles(*allowed_roles: str) -> Callable:
    """Dependency factory ensuring user has one of the allowed roles."""
    normalized_roles = [r.lower() for r in allowed_roles]

    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "").lower()
        if user_role not in normalized_roles:
            raise AppException(
                code="FORBIDDEN",
                message=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}. Your role: {current_user.get('role')}",
                status_code=status.HTTP_403_FORBIDDEN
            )
        return current_user

    return role_checker
