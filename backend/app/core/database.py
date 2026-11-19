import os
from typing import Optional, Any
from pymongo import MongoClient, ASCENDING, DESCENDING
import mongomock
from app.core.config import get_settings
from app.core.logging import logger

_mongo_client: Optional[Any] = None

def get_mongo_client() -> Any:
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    settings = get_settings()
    if settings.TESTING or settings.USE_MOCK_DB:
        logger.info("Initializing in-memory mongomock Database Client")
        _mongo_client = mongomock.MongoClient()
    else:
        logger.info("Connecting to MongoDB Atlas at configured URI")
        _mongo_client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            appname="PricePulse"
        )
    return _mongo_client


def get_db(db_name: Optional[str] = None):
    settings = get_settings()
    client = get_mongo_client()
    target_name = db_name or (settings.MONGODB_TEST_DB_NAME if settings.TESTING else settings.MONGODB_DB_NAME)
    return client[target_name]


def create_all_indexes(db=None):
    """Creates all required indexes from Specification §9."""
    if db is None:
        db = get_db()

    logger.info("Creating MongoDB collections indexes as per Specification §9")

    # 1. users: unique email
    db.users.create_index([("email", ASCENDING)], unique=True)

    # 2. markets: unique name
    db.markets.create_index([("name", ASCENDING)], unique=True)

    # 3. categories: unique name
    db.categories.create_index([("name", ASCENDING)], unique=True)

    # 4. items: unique name
    db.items.create_index([("name", ASCENDING)], unique=True)

    # 5. basket_versions: status, effective_from
    db.basket_versions.create_index([("status", ASCENDING)])
    db.basket_versions.create_index([("effective_from", DESCENDING)])

    # 6. price_observations: (market_id, item_id, date, source) unique; (item_id, period_key); (batch_id)
    db.price_observations.create_index(
        [("market_id", ASCENDING), ("item_id", ASCENDING), ("date", ASCENDING), ("source", ASCENDING)],
        unique=True
    )
    db.price_observations.create_index([("item_id", ASCENDING), ("period_key", ASCENDING)])
    db.price_observations.create_index([("batch_id", ASCENDING)])
    db.price_observations.create_index([("date", DESCENDING)])

    # 7. upload_batches: checksum
    db.upload_batches.create_index([("checksum", ASCENDING)])

    # 8. index_runs: created_at
    db.index_runs.create_index([("created_at", DESCENDING)])

    # 9. forecasts: index_run_id
    db.forecasts.create_index([("index_run_id", ASCENDING)])

    # 10. anomalies: status
    db.anomalies.create_index([("status", ASCENDING)])
    db.anomalies.create_index([("observation_id", ASCENDING)])

    # 11. reports: index_run_id
    db.reports.create_index([("index_run_id", ASCENDING)])

    # 12. audit_logs: created_at
    db.audit_logs.create_index([("created_at", DESCENDING)])

    logger.info("All MongoDB indexes successfully verified/created.")
