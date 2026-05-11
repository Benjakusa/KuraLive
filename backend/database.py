import psycopg2
import psycopg2.extras
from config import Config


def get_db():
    conn = psycopg2.connect(Config.DATABASE_URL)
    return conn


def query(sql, params=None, fetchone=False, fetchall=False):
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            if fetchone:
                return cur.fetchone()
            if fetchall:
                return cur.fetchall()
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()
