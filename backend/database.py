import sqlite3
import os
from pathlib import Path
from backend.seed import SEED_SQL

DB_DIR = Path(os.getenv('RAILWAY_VOLUME_PATH', Path(__file__).parent / 'db'))
DB_PATH = DB_DIR / 'zensave.db'
SCHEMA_PATH = Path(__file__).parent / 'db' / 'schema.sql'

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.isolation_level = None
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA busy_timeout = 5000')
    return conn

def _seed():
    with get_db() as db:
        row = db.execute('SELECT COUNT(*) as c FROM usuarios').fetchone()
        if row['c'] > 0:
            return
        db.executescript(SEED_SQL)
        print('[ZEN] Seed data loaded')

def init_db():
    if not DB_PATH.exists():
        DB_DIR.mkdir(parents=True, exist_ok=True)
        with get_db() as conn:
            conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
        print(f'[ZEN] Database created at {DB_PATH}')
    else:
        with get_db() as conn:
            conn.execute('PRAGMA journal_mode = WAL')
            conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
    _seed()
