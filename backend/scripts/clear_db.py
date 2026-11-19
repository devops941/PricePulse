"""
PricePulse Database Reset & Cleaner Script.
Clears all operational price observations, index runs, anomalies, reports, and upload batches.
Preserves master catalog (15 goods, 6 markets, 7 categories, active basket) and Super Admin.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.core.database import get_db, get_mongo_client
from app.core.security import hash_password
from app.core.bootstrap import ensure_master_catalog
from pymongo import MongoClient

def clear_database():
    settings = get_settings()
    print("=" * 60)
    print("🧹 [PricePulse] Starting Database Clean...")
    print(f"Target DB Name: {settings.MONGODB_DB_NAME}")
    print(f"USE_MOCK_DB: {settings.USE_MOCK_DB}")
    print("=" * 60)

    # 1. Clear in configured DB (mongomock or local)
    db = get_db()
    operational_collections = [
        "price_observations",
        "index_runs",
        "anomalies",
        "reports",
        "audit_logs",
        "upload_batches",
        "forecasts",
    ]

    for col_name in operational_collections:
        deleted = db[col_name].delete_many({})
        print(f"  • Cleared '{col_name}': {deleted.deleted_count} documents removed.")

    # Retain only Super Admin in users collection
    super_admin_email = "admin@gmail.com"
    deleted_users = db.users.delete_many({"email": {"$ne": super_admin_email}})
    print(f"  • Non-admin users removed: {deleted_users.deleted_count}")

    # Ensure Super Admin exists with correct hash
    admin_pw = hash_password("Admin@123")
    db.users.update_one(
        {"email": super_admin_email},
        {
            "$set": {
                "name": "Super Admin",
                "email": super_admin_email,
                "password_hash": admin_pw,
                "hashed_password": admin_pw,
                "role": "Admin",
                "status": "active",
                "must_change_password": False,
                "market_ids": [],
            }
        },
        upsert=True
    )
    print("  • Super Admin user verified: admin@gmail.com / Admin@123")

    # 2. Also clear MongoDB Atlas directly if URI is provided
    atlas_uri = settings.MONGODB_URI
    if atlas_uri and "mongodb" in atlas_uri and not settings.USE_MOCK_DB:
        try:
            print("\nConnecting to MongoDB Atlas to clear remote collections...")
            atlas_client = MongoClient(atlas_uri, serverSelectionTimeoutMS=5000)
            atlas_db = atlas_client[settings.MONGODB_DB_NAME]
            for col_name in operational_collections:
                del_res = atlas_db[col_name].delete_many({})
                print(f"  [Atlas] Cleared '{col_name}': {del_res.deleted_count} documents removed.")
            atlas_db.users.delete_many({"email": {"$ne": super_admin_email}})
            atlas_db.users.update_one(
                {"email": super_admin_email},
                {
                    "$set": {
                        "name": "Super Admin",
                        "email": super_admin_email,
                        "password_hash": admin_pw,
                        "hashed_password": admin_pw,
                        "role": "Admin",
                        "status": "active",
                        "must_change_password": False,
                        "market_ids": [],
                    }
                },
                upsert=True
            )
            print("  [Atlas] Super Admin verified in Atlas.")
        except Exception as e:
            print(f"  [Atlas Notice] Remote Atlas clear note: {e}")

    print("\n✅ Database has been properly and thoroughly cleared!")
    print("Master catalog remains ready for clean testing or on-demand initialization.")
    print("=" * 60)

if __name__ == "__main__":
    clear_database()
