import sqlite3
conn = sqlite3.connect('backend/db/zensave.db')
conn.row_factory = sqlite3.Row
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for t in tables:
    c = conn.execute(f'SELECT COUNT(*) as c FROM {t["name"]}').fetchone()
    print(f'{t["name"]}: {c["c"]} rows')
conn.close()
