from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class MarketCreate(BaseModel):
    name: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    type: str = Field(..., pattern="^(retail|wholesale|online)$")
    active: bool = True


class MarketUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    type: Optional[str] = Field(None, pattern="^(retail|wholesale|online)$")
    active: Optional[bool] = None


class MarketOut(MarketCreate):
    id: str


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    color_key: str = "cocoa"
    order: int = 0


class CategoryOut(CategoryCreate):
    id: str


class ItemCreate(BaseModel):
    name: str = Field(..., min_length=2)
    category_id: str
    canonical_unit: str = Field(..., pattern="^(kg|g|L|mL|dozen|piece|pack|cylinder)$")
    min_plausible: float = Field(..., gt=0)
    max_plausible: float = Field(..., gt=0)
    active: bool = True

    @model_validator(mode="after")
    def validate_plausible_range(self):
        if self.min_plausible >= self.max_plausible:
            raise ValueError("min_plausible must be strictly less than max_plausible")
        return self


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    canonical_unit: Optional[str] = Field(None, pattern="^(kg|g|L|mL|dozen|piece|pack|cylinder)$")
    min_plausible: Optional[float] = Field(None, gt=0)
    max_plausible: Optional[float] = Field(None, gt=0)
    active: Optional[bool] = None


class ItemOut(ItemCreate):
    id: str
    category_name: Optional[str] = None


class BasketLine(BaseModel):
    item_id: str
    weight: float = Field(..., gt=0, le=1.0)
    base_quantity: float = Field(default=1.0, gt=0)


class BasketVersionCreate(BaseModel):
    name: str = Field(..., min_length=2)
    base_period: str = Field(..., min_length=4) # e.g. "2025-10" or "2025-W40"
    frequency: str = Field(..., pattern="^(weekly|monthly)$")
    lines: List[BasketLine] = Field(..., min_length=1)
    effective_from: str = Field(...)

    @model_validator(mode="after")
    def validate_weights_sum(self):
        total_weight = sum(line.weight for line in self.lines)
        # Check sum == 1.0 within tolerance 1e-3
        if abs(total_weight - 1.0) > 0.001:
            raise ValueError(f"Basket item weights must sum to exactly 1.00 (100%). Current sum: {total_weight:.4f}")
        return self


class BasketVersionOut(BaseModel):
    id: str
    name: str
    base_period: str
    frequency: str
    status: str
    lines: List[BasketLine]
    effective_from: str
    created_by: str
    created_at: str
