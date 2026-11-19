from datetime import timedelta
from typing import List, Optional, Dict, Any
import secrets
from fastapi import APIRouter, Depends, Request, status
from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.dependencies import get_current_user, require_roles
from app.core.errors import AppException
from app.core.logging import logger
from app.repositories.all_repositories import UserRepository, AuditRepository
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UserResponse,
    UserCreateByAdmin
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory token store for forgot/reset flows (dev console logged)
_reset_tokens = {}

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request):
    user_repo = UserRepository()
    audit_repo = AuditRepository()
    user = user_repo.get_by_email(req.email)
    
    stored_hash = user.get("password_hash") or user.get("hashed_password") or ""
    if not user or not verify_password(req.password, stored_hash):
        audit_repo.log_event(
            actor=req.email,
            action="LOGIN_FAILED",
            resource="users",
            metadata={"ip": request.client.host if request.client else "unknown"}
        )
        raise AppException(
            code="INVALID_CREDENTIALS",
            message="Invalid email or password.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    if user.get("status") != "active":
        raise AppException(
            code="USER_INACTIVE",
            message="User account is deactivated. Contact Administrator.",
            status_code=status.HTTP_403_FORBIDDEN
        )

    access_token = create_access_token(
        data={"sub": str(user["id"]), "role": user["role"], "email": user["email"]}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user["id"]), "role": user["role"], "email": user["email"]}
    )

    audit_repo.log_event(
        actor=user["email"],
        action="LOGIN_SUCCESS",
        resource="users",
        metadata={"role": user["role"]}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        must_change_password=user.get("must_change_password", False),
        user=UserResponse(**user)
    )


@router.post("/refresh")
def refresh(req: RefreshRequest):
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise AppException(
                code="INVALID_TOKEN",
                message="Token is not a refresh token.",
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        user_id = payload.get("sub")
    except Exception:
        raise AppException(
            code="INVALID_TOKEN",
            message="Expired or invalid refresh token.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    user_repo = UserRepository()
    user = user_repo.get_by_id(user_id)
    if not user or user.get("status") != "active":
        raise AppException(
            code="USER_NOT_FOUND",
            message="User is inactive or not found.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    new_access_token = create_access_token(
        data={"sub": str(user["id"]), "role": user["role"], "email": user["email"]}
    )
    new_refresh_token = create_refresh_token(
        data={"sub": str(user["id"]), "role": user["role"], "email": user["email"]}
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    audit_repo = AuditRepository()
    audit_repo.log_event(
        actor=current_user["email"],
        action="LOGOUT",
        resource="users"
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    user_repo = UserRepository()
    audit_repo = AuditRepository()
    
    if not verify_password(req.current_password, current_user.get("password_hash", "")):
        raise AppException(
            code="INVALID_PASSWORD",
            message="Current password is incorrect.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    new_hash = hash_password(req.new_password)
    user_repo.update(current_user["id"], {
        "password_hash": new_hash,
        "must_change_password": False
    })

    audit_repo.log_event(
        actor=current_user["email"],
        action="PASSWORD_CHANGED",
        resource="users"
    )
    return {"message": "Password changed successfully"}


@router.post("/forgot")
def forgot_password(req: ForgotPasswordRequest):
    user_repo = UserRepository()
    user = user_repo.get_by_email(req.email)
    
    # Always return 200 to prevent user enumeration
    if user:
        reset_token = secrets.token_urlsafe(32)
        _reset_tokens[reset_token] = user["id"]
        # As per specification §3 & §17: "email can be console-logged in dev"
        logger.info(f"[DEV CONSOLE RESET TOKEN] User: {user['email']}, Token: {reset_token}")
        return {
            "message": "If the account exists, a password reset link has been issued.",
            "dev_reset_token": reset_token # Exposed in response for easy dev/academic demo
        }

    return {"message": "If the account exists, a password reset link has been issued."}


@router.post("/reset")
def reset_password(req: ResetPasswordRequest):
    user_id = _reset_tokens.get(req.token)
    if not user_id:
        raise AppException(
            code="INVALID_RESET_TOKEN",
            message="Reset token is invalid or expired.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    user_repo = UserRepository()
    user_repo.update(user_id, {
        "password_hash": hash_password(req.new_password),
        "must_change_password": False
    })
    del _reset_tokens[req.token]

    AuditRepository().log_event(
        actor=user_id,
        action="PASSWORD_RESET_COMPLETE",
        resource="users"
    )
    return {"message": "Password reset successfully. You may now log in with the new password."}


@router.post("/users", response_model=UserResponse)
def register_user_by_admin(
    req: UserCreateByAdmin,
    admin_user: dict = Depends(require_roles("Admin"))
):
    """Admin-only user creation as per specification §3."""
    user_repo = UserRepository()
    existing = user_repo.get_by_email(req.email)
    if existing:
        raise AppException(
            code="DUPLICATE_EMAIL",
            message="A user with this email already exists.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    settings = get_settings()
    temp_pass = req.temporary_password or settings.DEMO_USER_PASSWORD
    doc = {
        "email": req.email.strip().lower(),
        "name": req.name.strip(),
        "role": req.role,
        "market_ids": req.market_ids,
        "password_hash": hash_password(temp_pass),
        "status": "active",
        "must_change_password": True
    }
    created = user_repo.insert(doc)
    
    AuditRepository().log_event(
        actor=admin_user["email"],
        action="USER_CREATED",
        resource=f"users/{created['id']}",
        metadata={"role": req.role, "email": req.email}
    )
    return UserResponse(**created)


@router.get("/users", response_model=List[UserResponse])
def list_users(
    admin_user: dict = Depends(require_roles("Admin"))
):
    """Admin-only listing of all system users."""
    user_repo = UserRepository()
    users = user_repo.find({})
    res = []
    for u in users:
        res.append(UserResponse(
            id=str(u.get("id", "")),
            email=u.get("email", ""),
            name=u.get("name", ""),
            role=u.get("role", "Viewer"),
            market_ids=u.get("market_ids", []),
            status=u.get("status", "active"),
            must_change_password=u.get("must_change_password", False)
        ))
    return res


@router.patch("/users/{user_id}/status", response_model=UserResponse)
def toggle_user_status(
    user_id: str,
    payload: dict,
    admin_user: dict = Depends(require_roles("Admin"))
):
    """Admin-only toggle of user account active/inactive status."""
    user_repo = UserRepository()
    target = user_repo.get_by_id(user_id)
    if not target:
        raise AppException(code="NOT_FOUND", message="User not found", status_code=404)
    
    new_status = payload.get("status", "active")
    updated = user_repo.update(user_id, {"status": new_status})
    AuditRepository().log_event(
        actor=admin_user["email"],
        action="USER_STATUS_UPDATED",
        resource=f"users/{user_id}",
        metadata={"status": new_status, "target_email": target["email"]}
    )
    return UserResponse(
        id=str(updated.get("id", user_id)),
        email=updated.get("email", ""),
        name=updated.get("name", ""),
        role=updated.get("role", "Viewer"),
        market_ids=updated.get("market_ids", []),
        status=updated.get("status", "active"),
        must_change_password=updated.get("must_change_password", False)
    )

