import sqlite3
import os
import hashlib
from datetime import date, timedelta
from pathlib import Path

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
        row = db.execute('SELECT COUNT(*) as c FROM users').fetchone()
        if row['c'] > 0:
            return
        salt = os.urandom(16).hex()
        hashed = hashlib.pbkdf2_hmac('sha256', b'test123', salt.encode(), 100_000).hex()
        db.execute('INSERT INTO users(id,name,email,password,monthly_goal,monthly_salary) VALUES(?,?,?,?,?,?)',
            (1, 'Mateo', 'test@zensave.com', f'{salt}${hashed}', 30000, 75000))
        db.execute('INSERT INTO saving_challenges(user_id,title,target,current,start_date,end_date,active) VALUES'
            '(?,?,?,?,?,?,?)', (1, 'Viaje a Cancún', 30000, 8500, '2026-01-01', '2026-12-31', 1))
        db.execute('INSERT INTO saving_challenges(user_id,title,target,current,start_date,end_date,active) VALUES'
            '(?,?,?,?,?,?,?)', (1, 'Laptop nueva', 25000, 12000, '2026-03-01', '2026-09-30', 1))
        print('[ZEN] Seed data created')

def init_db():
    if not DB_PATH.exists():
        DB_DIR.mkdir(parents=True, exist_ok=True)
        with get_db() as conn:
            conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))
        print(f'[ZEN] Database created at {DB_PATH}')
    else:
        with get_db() as conn:
            conn.execute('PRAGMA journal_mode = WAL')
    _seed()
