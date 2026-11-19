from typing import List, Optional
from fastapi import APIRouter, Depends, status
from app.core.dependencies import get_current_user, require_roles
from app.core.errors import AppException
from app.repositories.all_repositories import (
    MarketRepository,
    CategoryRepository,
    ItemRepository,
    BasketRepository,
    UserRepository,
    AuditRepository,
)
from app.schemas.master import (
    MarketCreate,
    MarketUpdate,
    MarketOut,
    CategoryCreate,
    CategoryOut,
    ItemCreate,
    ItemUpdate,
    ItemOut,
    BasketVersionCreate,
    BasketVersionOut,
)

router = APIRouter(tags=["Master Data & Basket"])

# ----------------- MARKETS -----------------
@router.get("/markets", response_model=List[MarketOut])
def list_markets(active_only: bool = False):
    repo = MarketRepository()
    query = {"active": True} if active_only else {}
    return repo.find(query)


@router.post("/markets", response_model=MarketOut)
def create_market(
    data: MarketCreate,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = MarketRepository()
    existing = repo.find_one({"name": data.name.strip()})
    if existing:
        raise AppException(
            code="DUPLICATE_MARKET",
            message=f"Market with name '{data.name}' already exists.",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    created = repo.insert(data.model_dump())
    AuditRepository().log_event(
        actor=current_user["email"],
        action="MARKET_CREATED",
        resource=f"markets/{created['id']}",
        metadata={"name": data.name}
    )
    return created


@router.patch("/markets/{market_id}", response_model=MarketOut)
def update_market(
    market_id: str,
    data: MarketUpdate,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = MarketRepository()
    updated = repo.update(market_id, {k: v for k, v in data.model_dump().items() if v is not None})
    if not updated:
        raise AppException(code="NOT_FOUND", message="Market not found", status_code=404)
    AuditRepository().log_event(
        actor=current_user["email"],
        action="MARKET_UPDATED",
        resource=f"markets/{market_id}",
        metadata={"updates": data.model_dump(exclude_unset=True)}
    )
    return updated


# ----------------- CATEGORIES -----------------
@router.get("/categories", response_model=List[CategoryOut])
def list_categories():
    return CategoryRepository().get_all_ordered()


@router.post("/categories", response_model=CategoryOut)
def create_category(
    data: CategoryCreate,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = CategoryRepository()
    existing = repo.find_one({"name": data.name.strip()})
    if existing:
        raise AppException(code="DUPLICATE_CATEGORY", message="Category already exists", status_code=400)
    created = repo.insert(data.model_dump())
    AuditRepository().log_event(
        actor=current_user["email"],
        action="CATEGORY_CREATED",
        resource=f"categories/{created['id']}",
        metadata={"name": data.name}
    )
    return created


# ----------------- ITEMS -----------------
@router.get("/items", response_model=List[ItemOut])
def list_items(active_only: bool = False):
    item_repo = ItemRepository()
    cat_repo = CategoryRepository()
    cats = {c["id"]: c["name"] for c in cat_repo.find({})}
    
    query = {"active": True} if active_only else {}
    items = item_repo.find(query)
    for it in items:
        it["category_name"] = cats.get(it.get("category_id", ""), "General")
    return items


@router.post("/items", response_model=ItemOut)
def create_item(
    data: ItemCreate,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = ItemRepository()
    existing = repo.get_by_name(data.name)
    if existing:
        raise AppException(code="DUPLICATE_ITEM", message="Item with this name already exists", status_code=400)
    created = repo.insert(data.model_dump())
    AuditRepository().log_event(
        actor=current_user["email"],
        action="ITEM_CREATED",
        resource=f"items/{created['id']}",
        metadata={"name": data.name, "unit": data.canonical_unit}
    )
    return created


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: str,
    data: ItemUpdate,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = ItemRepository()
    updated = repo.update(item_id, {k: v for k, v in data.model_dump().items() if v is not None})
    if not updated:
        raise AppException(code="NOT_FOUND", message="Item not found", status_code=404)
    AuditRepository().log_event(
        actor=current_user["email"],
        action="ITEM_UPDATED",
        resource=f"items/{item_id}",
        metadata={"updates": data.model_dump(exclude_unset=True)}
    )
    return updated


# ----------------- BASKET VERSIONS -----------------
@router.get("/basket-versions", response_model=List[BasketVersionOut])
def list_basket_versions():
    repo = BasketRepository()
    return repo.find({})


@router.get("/basket-versions/active", response_model=BasketVersionOut)
def get_active_basket():
    repo = BasketRepository()
    active = repo.get_active_basket()
    if not active:
        raise AppException(code="NO_ACTIVE_BASKET", message="No active basket version configured", status_code=404)
    return active


@router.post("/basket-versions", response_model=BasketVersionOut)
def create_basket_version(
    data: BasketVersionCreate,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = BasketRepository()
    payload = data.model_dump()
    payload["status"] = "draft"
    payload["created_by"] = current_user["email"]
    
    created = repo.insert(payload)
    AuditRepository().log_event(
        actor=current_user["email"],
        action="BASKET_VERSION_CREATED",
        resource=f"basket_versions/{created['id']}",
        metadata={"name": data.name, "lines_count": len(data.lines)}
    )
    return created


@router.post("/basket-versions/{basket_id}/activate", response_model=BasketVersionOut)
def activate_basket_version(
    basket_id: str,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = BasketRepository()
    target = repo.get_by_id(basket_id)
    if not target:
        raise AppException(code="NOT_FOUND", message="Basket version not found", status_code=404)
    
    activated = repo.activate_basket(basket_id)
    AuditRepository().log_event(
        actor=current_user["email"],
        action="BASKET_VERSION_ACTIVATED",
        resource=f"basket_versions/{basket_id}",
        metadata={"name": target["name"], "effective_from": target["effective_from"]}
    )
    return activated


# ----------------- AUDIT LOGS -----------------
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    current_user: dict = Depends(require_roles("Admin"))
):
    repo = AuditRepository()
    return repo.find({}, sort=[("created_at", -1)], limit=limit)
