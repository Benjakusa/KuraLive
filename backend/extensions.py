"""
extensions.py — Shared Flask extension singletons.

Import these into app.py and any blueprint that needs them.
This module MUST NOT import from app.py to avoid circular imports.
"""
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

cache = Cache()

limiter = Limiter(
    key_func=get_remote_address,
    # Storage URI and default limits are configured in app.py via init_app()
)
