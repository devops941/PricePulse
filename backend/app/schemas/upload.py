from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class UploadPreviewResponse(BaseModel):
    batch_id: str
    filename: str
    checksum: str
    headers: List[str]
    suggested_mapping: Dict[str, str]
    total_rows: int
    preview_rows: List[Dict[str, Any]]
    valid_count: int
    flagged_count: int
    invalid_count: int
    already_confirmed: bool = False


class UploadConfirmRequest(BaseModel):
    mapping: Dict[str, str] # e.g. {"market": "Center", "item": "Good", "date": "Date", "price": "Rate", "unit": "Unit"}
    duplicate_policy: str = Field("skip", pattern="^(skip|replace|reject)$")


class UploadConfirmResponse(BaseModel):
    batch_id: str
    status: str
    total_processed: int
    saved_count: int
    flagged_count: int
    rejected_count: int
    checksum: str
    has_errors: bool
    errors_csv_url: Optional[str] = None
