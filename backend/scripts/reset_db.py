"""
PricePulse Database Reset & Super Admin Provisioner.
Wipes all sample prices, items, markets, index runs, and anomalies.
Provisions ONLY the Super Admin (admin@gmail.com / Admin@123).
"""
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import get_db, create_all_indexes
from app.core.security import hash_password
from app.repositories.all_repositories import UserRepository


def reset_to_clean_state():
    print("🧹 [PricePulse] Resetting database to clean initial state...")
    db = get_db()

    collections_to_wipe = [
        "markets",
        "categories",
        "items",
        "basket_versions",
        "price_observations",
        "index_runs",
        "reports",
        "anomalies",
        "audit_logs",
        "upload_batches",
        "users",
    ]

    for col in collections_to_wipe:
        deleted = db[col].delete_many({})
        print(f"  • Cleared collection '{col}' ({deleted.deleted_count} documents removed)")

    # Ensure indexes exist
    create_all_indexes(db)

    # Insert only Super Admin
    user_repo = UserRepository()
    admin_pw = hash_password("Admin@123")
    user_repo.insert({
        "name": "Super Admin",
        "email": "admin@gmail.com",
        "password_hash": admin_pw,
        "hashed_password": admin_pw,
        "role": "Admin",
        "status": "active",
        "must_change_password": False,
        "market_ids": [],
    })

    print("👑 [PricePulse] Seeded ONLY Super Admin:")
    print("   Email:    admin@gmail.com")
    print("   Password: Admin@123")
    print("   Role:     Admin (Super Admin)")
    print("✨ Database is now completely clean and ready for production use.")


if __name__ == "__main__":
    reset_to_clean_state()
