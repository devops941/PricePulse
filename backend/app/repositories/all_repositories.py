from typing import Any, Dict, List, Optional
from pymongo import DESCENDING, ASCENDING
from app.repositories.base import BaseRepository, apply_role_scope, serialize_doc


class UserRepository(BaseRepository):
    collection_name = "users"

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"email": email.strip().lower()})


class MarketRepository(BaseRepository):
    collection_name = "markets"

    def get_active_markets(self) -> List[Dict[str, Any]]:
        return self.find({"active": True}, sort=[("name", ASCENDING)])


class CategoryRepository(BaseRepository):
    collection_name = "categories"

    def get_all_ordered(self) -> List[Dict[str, Any]]:
        return self.find({}, sort=[("order", ASCENDING)])


class ItemRepository(BaseRepository):
    collection_name = "items"

    def get_active_items(self) -> List[Dict[str, Any]]:
        return self.find({"active": True}, sort=[("name", ASCENDING)])

    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"name": name.strip()})


class BasketRepository(BaseRepository):
    collection_name = "basket_versions"

    def get_active_basket(self) -> Optional[Dict[str, Any]]:
        return self.find_one({"status": "active"})

    def activate_basket(self, basket_id: str) -> Optional[Dict[str, Any]]:
        # Archive any currently active
        self.collection.update_many({"status": "active"}, {"$set": {"status": "archived"}})
        return self.update(basket_id, {"status": "active"})


class PriceRepository(BaseRepository):
    collection_name = "price_observations"

    def find_scoped(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        user: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        scoped_q = apply_role_scope(filter_query or {}, user)
        return self.find(scoped_q, sort=[("date", DESCENDING)], skip=skip, limit=limit)

    def count_scoped(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        user: Optional[Dict[str, Any]] = None
    ) -> int:
        scoped_q = apply_role_scope(filter_query or {}, user)
        return self.count(scoped_q)

    def find_by_period(self, period_key: str, status: str = "valid") -> List[Dict[str, Any]]:
        return self.find({"period_key": period_key, "status": status})


class UploadRepository(BaseRepository):
    collection_name = "upload_batches"

    def get_by_checksum(self, checksum: str) -> Optional[Dict[str, Any]]:
        return self.find_one({"checksum": checksum})


class IndexRunRepository(BaseRepository):
    collection_name = "index_runs"

    def get_latest_run(self) -> Optional[Dict[str, Any]]:
        runs = self.find({}, sort=[("created_at", DESCENDING)], limit=1)
        return runs[0] if runs else None


class ForecastRepository(BaseRepository):
    collection_name = "forecasts"

    def get_by_run_id(self, run_id: str) -> List[Dict[str, Any]]:
        return self.find({"index_run_id": run_id})


class AnomalyRepository(BaseRepository):
    collection_name = "anomalies"

    def get_open_anomalies(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.find({"status": "open"}, sort=[("created_at", DESCENDING)], limit=limit)


class ReportRepository(BaseRepository):
    collection_name = "reports"

    def get_by_run(self, run_id: str) -> List[Dict[str, Any]]:
        return self.find({"index_run_id": run_id}, sort=[("generated_at", DESCENDING)])


class AuditRepository(BaseRepository):
    collection_name = "audit_logs"

    def log_event(self, actor: str, action: str, resource: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.insert({
            "actor": actor,
            "action": action,
            "resource": resource,
            "safe_metadata": metadata or {},
        })
