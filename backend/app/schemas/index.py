from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class IndexRunCreate(BaseModel):
    basket_version_id: Optional[str] = None
    frequency: str = Field("weekly", pattern="^(weekly|monthly)$")
    aggregation_method: str = Field("mean", pattern="^(mean|median|geometric)$")
    market_ids: Optional[List[str]] = None
    start_period: Optional[str] = None
    end_period: Optional[str] = None


class SeriesPoint(BaseModel):
    period: str
    index: float
    mom: float
    yoy: Optional[float] = None
    coverage: float
    basket_cost: float
    purchasing_power_100: float
    warnings: List[str] = []


class IndexRunOut(BaseModel):
    id: str
    basket_version_id: str
    basket_name: Optional[str] = None
    formula_version: str
    frequency: str
    aggregation_method: str
    filters: Dict[str, Any]
    series: List[SeriesPoint]
    created_by: str
    created_at: str


class DashboardSummaryOut(BaseModel):
    run_id: Optional[str] = None
    period: str
    headline_yoy: float
    mom: float
    coverage: float
    basket_cost: float
    purchasing_power_100: float
    open_flags_count: int
    data_freshness_days: int
    latest_observation_date: Optional[str] = None
    basket_version_name: str


class MoverItem(BaseModel):
    item_id: str
    item_name: str
    category_name: str
    current_price: float
    prev_price: float
    change_pct: float
    points_contribution: float
    canonical_unit: str


class DashboardMoversOut(BaseModel):
    period: str
    top_risers: List[MoverItem]
    top_fallers: List[MoverItem]
