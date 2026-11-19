import logging
import sys
import re

class SensitiveFilter(logging.Filter):
    """Filter that masks MongoDB connection strings and tokens from logs."""
    _mongo_pattern = re.compile(r"mongodb(?:\+srv)?://[^\s\"']+", re.IGNORECASE)
    _jwt_pattern = re.compile(r"Bearer\s+\S+", re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self._mongo_pattern.sub("mongodb://***:***@redacted", record.msg)
            record.msg = self._jwt_pattern.sub("Bearer [REDACTED]", record.msg)
        if record.args:
            args_list = []
            for arg in record.args if isinstance(record.args, tuple) else (record.args,):
                if isinstance(arg, str):
                    arg = self._mongo_pattern.sub("mongodb://***:***@redacted", arg)
                    arg = self._jwt_pattern.sub("Bearer [REDACTED]", arg)
                args_list.append(arg)
            record.args = tuple(args_list) if isinstance(record.args, tuple) else args_list[0]
        return True


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configures structured, sanitized logging."""
    logger = logging.getLogger("pricepulse")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveFilter())
    logger.addHandler(handler)
    logger.propagate = False
    return logger

logger = setup_logging()
