from typing import List, Optional
from pydantic import BaseModel, Field

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

class LoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    market_ids: List[str] = []
    status: str
    must_change_password: bool = False


class UserCreateByAdmin(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    name: str
    role: str = Field(..., pattern="^(Admin|Analyst|Collector|Viewer)$")
    market_ids: List[str] = []
    temporary_password: Optional[str] = None
