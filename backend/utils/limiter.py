from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import Config

_enabled = not Config.DISABLE_RATE_LIMIT

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=Config.REDIS_URL or "memory://",
    default_limits=["5000 per hour"] if _enabled else None,
    enabled=_enabled,
)
