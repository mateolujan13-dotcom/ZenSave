import sqlite3, sys

conn = sqlite3.connect('backend/db/zensave.db')
conn.row_factory = sqlite3.Row

user = conn.execute('SELECT * FROM users WHERE id=1').fetchone()
if not user:
    sys.exit(1)

lines = []
lines.append(f"INSERT OR IGNORE INTO users(id,name,email,password,monthly_goal,monthly_salary) VALUES(")
lines.append(f" 1, 'Mateo', 'test@zensave.com', '{user['password']}', {user['monthly_goal']}, {user['monthly_salary']});")

cats = conn.execute('SELECT * FROM categories').fetchall()
for c in cats:
    lines.append(f"INSERT OR IGNORE INTO categories(id,name,type,icon) VALUES({c['id']},'{c['name']}','{c['type']}','{c['icon']}');")

chals = conn.execute('SELECT * FROM saving_challenges WHERE user_id=1').fetchall()
for c in chals:
    lines.append(f"INSERT OR IGNORE INTO saving_challenges(id,user_id,title,target,current,start_date,end_date,active) VALUES(")
    lines.append(f" {c['id']},1,'{c['title']}',{c['target']},{c['current']},'{c['start_date']}','{c['end_date']}',{c['active']});")

txns = conn.execute('SELECT * FROM transactions WHERE user_id=1 ORDER BY date DESC').fetchall()
for t in txns:
    desc = t['description'].replace("'", "''") if t['description'] else ''
    cat = t['category_id'] if t['category_id'] else 'NULL'
    lines.append(f"INSERT OR IGNORE INTO transactions(id,user_id,type,amount,category_id,description,date) VALUES(")
    lines.append(f" {t['id']},1,'{t['type']}',{t['amount']},{cat},'{desc}','{t['date']}');")

conn.close()

sys.stdout.reconfigure(encoding='utf-8')
print('\n'.join(lines))
