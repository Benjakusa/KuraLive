import psycopg
from psycopg.rows import dict_row
from config import Config


def get_db():
    conn = psycopg.connect(Config.DATABASE_URL)
    return conn


def query(sql, params=None, fetchone=False, fetchall=False):
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
    finally:
        conn.close()
