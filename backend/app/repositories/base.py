from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo.collection import Collection
from app.core.database import get_db


def to_object_id(id_val: Any) -> ObjectId:
    if isinstance(id_val, ObjectId):
        return id_val
    if isinstance(id_val, str) and ObjectId.is_valid(id_val):
        return ObjectId(id_val)
    raise ValueError(f"Invalid ObjectId string: {id_val}")


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None
    res = dict(doc)
    if "_id" in res:
        res["id"] = str(res.pop("_id"))
    for k, v in res.items():
        if isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [
                str(item) if isinstance(item, ObjectId)
                else item.isoformat() if isinstance(item, datetime)
                else serialize_doc(item) if isinstance(item, dict)
                else item
                for item in v
            ]
        elif isinstance(v, dict):
            res[k] = serialize_doc(v)
    return res


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BaseRepository:
    collection_name: str

    def __init__(self, collection_name: Optional[str] = None):
        if collection_name:
            self.collection_name = collection_name
        self.db = get_db()
        self.collection: Collection = self.db[self.collection_name]

    def insert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(data)
        if "created_at" not in payload:
            payload["created_at"] = utc_now()
        payload["updated_at"] = utc_now()
        result = self.collection.insert_one(payload)
        payload["id"] = str(result.inserted_id)
        if "_id" in payload:
            del payload["_id"]
        return serialize_doc(payload)

    def insert_many(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not items:
            return []
        now = utc_now()
        payloads = []
        for it in items:
            p = dict(it)
            if "created_at" not in p:
                p["created_at"] = now
            p["updated_at"] = now
            payloads.append(p)
        result = self.collection.insert_many(payloads)
        out = []
        for idx, inserted_id in enumerate(result.inserted_ids):
            p = dict(payloads[idx])
            p["id"] = str(inserted_id)
            if "_id" in p:
                del p["_id"]
            out.append(serialize_doc(p))
        return out

    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        try:
            oid = to_object_id(item_id)
            doc = self.collection.find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            # Fallback check if stored directly as string id
            doc = self.collection.find_one({"_id": item_id}) or self.collection.find_one({"id": item_id})
            return serialize_doc(doc)

    def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = self.collection.find_one(filter_query)
        return serialize_doc(doc)

    def find(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        q = filter_query or {}
        cursor = self.collection.find(q)
        if sort:
            cursor = cursor.sort(sort)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        return [serialize_doc(d) for d in cursor]

    def count(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        return self.collection.count_documents(filter_query or {})

    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            target = {"_id": to_object_id(item_id)}
        except Exception:
            target = {"$or": [{"_id": item_id}, {"id": item_id}]}
        
        payload = dict(updates)
        payload["updated_at"] = utc_now()
        self.collection.update_one(target, {"$set": payload})
        return self.get_by_id(item_id)

    def delete(self, item_id: str) -> bool:
        try:
            target = {"_id": to_object_id(item_id)}
        except Exception:
            target = {"$or": [{"_id": item_id}, {"id": item_id}]}
        res = self.collection.delete_one(target)
        return res.deleted_count > 0


def apply_role_scope(
    filter_query: Dict[str, Any],
    user: Optional[Dict[str, Any]] = None,
    market_field: str = "market_id"
) -> Dict[str, Any]:
    """
    Enforces specification rule:
    Collector queries are always scoped to assigned market_ids server-side (spec §3, §9).
    """
    scoped = dict(filter_query or {})
    if not user:
        return scoped

    role = user.get("role", "").capitalize()
    if role == "Collector":
        assigned_markets = user.get("market_ids", [])
        if market_field in scoped:
            existing = scoped[market_field]
            if isinstance(existing, dict) and "$in" in existing:
                # Intersect with assigned
                allowed = [m for m in existing["$in"] if m in assigned_markets]
                scoped[market_field] = {"$in": allowed}
            elif isinstance(existing, str):
                if existing not in assigned_markets:
                    scoped[market_field] = {"$in": []} # Empty match
            else:
                scoped[market_field] = {"$in": assigned_markets}
        else:
            scoped[market_field] = {"$in": assigned_markets}
    return scoped
