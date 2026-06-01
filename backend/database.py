import sqlite3
import os
from pathlib import Path

DB_DIR = Path(os.getenv('RAILWAY_VOLUME_PATH', Path(__file__).parent / 'db'))
DB_PATH = DB_DIR / 'zensave.db'
SCHEMA_PATH = Path(__file__).parent / 'db' / 'schema.sql'

def _db_path():
    env = os.getenv('DB_PATH')
    if env:
        p = Path(env)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p
    p = BASE_DIR / 'data' / 'zensave.db'
    p.parent.mkdir(parents=True, exist_ok=True)
    return p

def get_db():
    conn = sqlite3.connect(str(_db_path()))
    conn.row_factory = sqlite3.Row
    conn.isolation_level = None
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA busy_timeout = 5000')
    return conn

def init_db():
    p = _db_path()
    if p.exists():
        # ensure WAL mode on existing db
        with get_db() as conn:
            conn.execute('PRAGMA journal_mode = WAL')
        return
    with get_db() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
    print(f'[ZEN] Database created at {p}')
