from typing import List, Optional
from pydantic import BaseModel, Field


class PriceCreate(BaseModel):
    market_id: str
    item_id: str
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$") # YYYY-MM-DD
    price: float = Field(..., gt=0)
    unit: str
    source: str = "manual"
    notes: Optional[str] = None


class PriceBatchCreate(BaseModel):
    observations: List[PriceCreate] = Field(..., min_length=1)


class PriceUpdateAudit(BaseModel):
    price: float = Field(..., gt=0)
    unit: Optional[str] = None
    reason: str = Field(..., min_length=3)


class PriceObservationOut(BaseModel):
    id: str
    market_id: str
    item_id: str
    date: str
    period_key: str
    price: float
    unit: str
    price_per_canonical_unit: float
    canonical_unit: str
    source: str
    status: str
    flag_reason: Optional[str] = None
    notes: Optional[str] = None
    batch_id: Optional[str] = None
    entered_by: Optional[str] = None
    created_at: Optional[str] = None
    market_name: Optional[str] = None
    item_name: Optional[str] = None


class PriceBatchResult(BaseModel):
    saved_count: int
    flagged_count: int
    rejected_count: int
    saved_ids: List[str] = []
    errors: List[dict] = []
