import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import create_all_indexes, get_db
from app.core.logging import logger

if __name__ == "__main__":
    try:
        db = get_db()
        create_all_indexes(db)
        logger.info("Successfully created/verified all collection indexes for PricePulse.")
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        sys.exit(1)
