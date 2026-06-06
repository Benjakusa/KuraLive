from contextlib import contextmanager
import threading
import time
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from config import Config
import logging

logger = logging.getLogger(__name__)

_pool = None
_pool_lock = threading.Lock()


def init_pool():
    global _pool
    if _pool is not None:
        return _pool
    with _pool_lock:
        if _pool is None:
            _pool = ConnectionPool(
                Config.DATABASE_URL,
                min_size=4,
                max_size=20,
                open=True,
                kwargs={"row_factory": dict_row},
            )
            logger.info("Database connection pool initialized (min=4, max=20)")
    return _pool


def get_pool():
    if _pool is None:
        return init_pool()
    return _pool


def get_db():
    return get_pool().connection()


@contextmanager
def transaction():
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


MAX_RETRIES = 3


def query(sql, params=None, fetchone=False, fetchall=False):
    last_exc = None
    for attempt in range(MAX_RETRIES):
        conn = get_db()
        try:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, params)
                if fetchone:
                    return cur.fetchone()
                if fetchall:
                    return cur.fetchall()
                conn.commit()
                return cur.rowcount
        except Exception as e:
            conn.rollback()
            if _is_retryable(e) and attempt < MAX_RETRIES - 1:
                last_exc = e
                logger.warning(f"Query retry {attempt + 1}/{MAX_RETRIES}: {e}")
                time.sleep(0.1 * (2**attempt))
            else:
                raise
        finally:
            conn.close()
    raise last_exc  # type: ignore[misc]


def _is_retryable(exc):
    code = getattr(exc, "sqlstate", None) or getattr(exc, "pgcode", None)
    return code in ("40001", "40P01")


def query_in_transaction(conn, sql, params=None, fetchone=False, fetchall=False):
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, params)
        if fetchone:
            return cur.fetchone()
        if fetchall:
            return cur.fetchall()
        return cur.rowcount


def close_pool():
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


def check_db_health():
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.close()
        return True, None
    except Exception as e:
        return False, str(e)
