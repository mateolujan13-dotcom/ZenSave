from fastapi import APIRouter, HTTPException, Query, Depends
from backend.database import get_db
from backend.auth import get_current_user
from backend.logger import logger
from backend.models.schemas import TransactionBody
from typing import Optional

router = APIRouter()

@router.get('/summary')
def get_summary(user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        from datetime import datetime, date, timedelta
        now = datetime.now()

        month_start = date(now.year, now.month, 1).isoformat()
        if now.month == 12:
            month_end = date(now.year + 1, 1, 1).isoformat()
        else:
            month_end = date(now.year, now.month + 1, 1).isoformat()

        current_month_tx = db.execute('''
            SELECT type, SUM(amount) as total FROM transactions
            WHERE user_id=? AND date >= ? AND date < ? GROUP BY type
        ''', (user_id, month_start, month_end)).fetchall()

        total_income = 0
        total_expense = 0
        for row in current_month_tx:
            if row['type'] == 'income':
                total_income = row['total']
            if row['type'] == 'expense':
                total_expense = row['total']

        user_row = db.execute('SELECT monthly_salary, monthly_goal FROM users WHERE id=?', (user_id,)).fetchone()
        monthly_salary = user_row['monthly_salary'] if user_row else 0
        monthly_goal = user_row['monthly_goal'] if user_row else 0
        balance = total_income - total_expense

        all_time = db.execute("SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as inc, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as exp FROM transactions WHERE user_id=?", (user_id,)).fetchone()
        accumulated_balance = (all_time['inc'] or 0) - (all_time['exp'] or 0)

        savings_total = db.execute("SELECT COALESCE(SUM(current),0) FROM saving_challenges WHERE user_id=? AND active=1", (user_id,)).fetchone()[0]

        by_category = db.execute('''
            SELECT c.name as category_name, c.icon, SUM(t.amount) as total
            FROM transactions t JOIN categories c ON t.category_id = c.id
            WHERE t.user_id=? AND t.type='expense' AND t.date >= ? AND t.date < ?
            GROUP BY c.id ORDER BY total DESC
        ''', (user_id, month_start, month_end)).fetchall()

        by_category_list = [{
            'category_name': r['category_name'],
            'icon': r['icon'],
            'total': r['total'],
            'percentage': round((r['total'] / total_expense * 100), 1) if total_expense > 0 else 0
        } for r in by_category]

        monthly_trend = db.execute('''
            SELECT strftime('%Y-%m', date) as month,
                   SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
                   SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
            FROM transactions WHERE user_id=? AND date >= date('now', 'start of month', '-5 months')
            GROUP BY month ORDER BY month ASC
        ''', (user_id,)).fetchall()

        micro_expenses = db.execute('''
            SELECT description, SUM(amount) as amount, COUNT(*) as count
            FROM transactions
            WHERE user_id=? AND type='expense' AND amount < 500
              AND description != '' AND date >= ? AND date < ?
            GROUP BY description HAVING COUNT(*) >= 3 ORDER BY amount DESC
        ''', (user_id, month_start, month_end)).fetchall()

        return {
            'success': True, 'data': {
                'total_income': total_income, 'total_expense': total_expense,
                'balance': balance, 'accumulated_balance': accumulated_balance,
                'savings_total': savings_total,
                'monthly_salary': monthly_salary,
                'monthly_goal': monthly_goal,
                'by_category': by_category_list,
                'monthly_trend': [dict(r) for r in monthly_trend],
                'micro_expenses': [dict(r) for r in micro_expenses]
            }
        }
    finally:
        db.close()

@router.get('')
def get_all(
    user_id: int = Depends(get_current_user),
    type: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    month: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(0)
):
    db = get_db()
    try:
        base = 'FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id=?'
        params = [user_id]

        if type:
            base += ' AND t.type=?'
            params.append(type)
        if category_id:
            base += ' AND t.category_id=?'
            params.append(category_id)
        if month:
            base += " AND t.date >= ? AND t.date < ?"
            params.append(f'{month}-01')
            y, m = month.split('-')
            if int(m) == 12:
                params.append(f'{int(y)+1}-01-01')
            else:
                params.append(f'{y}-{int(m)+1:02d}-01')
        if search:
            base += ' AND t.description LIKE ?'
            params.append(f'%{search}%')

        total = db.execute(f'SELECT COUNT(*) as total {base}', params).fetchone()['total']

        query = f'SELECT t.*, c.name as category_name, c.icon as category_icon {base} ORDER BY t.date DESC, t.created_at DESC'
        if limit:
            query += ' LIMIT ? OFFSET ?'
            params.extend([limit, offset or 0])

        transactions = db.execute(query, params).fetchall()
        return {'success': True, 'data': [dict(r) for r in transactions], 'total': total}
    finally:
        db.close()

@router.get('/{transaction_id}')
def get_one(transaction_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        tx = db.execute('''
            SELECT t.*, c.name as category_name, c.icon as category_icon
            FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id=? AND t.user_id=?
        ''', (transaction_id, user_id)).fetchone()
        if not tx:
            raise HTTPException(404, detail='Transaccion no encontrada o acceso denegado')
        return {'success': True, 'data': dict(tx)}
    finally:
        db.close()

@router.post('')
def create(body: TransactionBody, user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        cur = db.execute('''
            INSERT INTO transactions (user_id, type, amount, category_id, description, date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, body.type, body.amount, body.category_id, body.description, body.date))
        tx = db.execute('''
            SELECT t.*, c.name as category_name, c.icon as category_icon
            FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id=?
        ''', (cur.lastrowid,)).fetchone()
        logger.info(f'TX create id={cur.lastrowid} user_id={user_id} type={body.type} amount={body.amount}')
        return {'success': True, 'data': dict(tx)}
    finally:
        db.close()

@router.put('/{transaction_id}')
def update(transaction_id: int, body: TransactionBody, user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        db.execute('BEGIN')
        existing = db.execute('SELECT id, amount, description FROM transactions WHERE id=? AND user_id=?', (transaction_id, user_id)).fetchone()
        if not existing:
            db.execute('ROLLBACK')
            raise HTTPException(404, detail='Transaccion no encontrada o acceso denegado')

        existing_desc = existing['description']
        if existing_desc and existing_desc.startswith('Depósito a reto #') and ': ' in existing_desc:
            challenge_id_str = existing_desc.split('#')[1].split(':')[0]
            try:
                challenge_id = int(challenge_id_str)
                ch = db.execute('SELECT id, current FROM saving_challenges WHERE id=? AND user_id=?',
                    (challenge_id, user_id)).fetchone()
                if ch:
                    new_current = max(0, ch['current'] - existing['amount'])
                    db.execute('UPDATE saving_challenges SET current=? WHERE id=?', (new_current, ch['id']))
                    logger.info(f'CHALLENGE deposit reversed on update id={ch["id"]} user_id={user_id} amount={existing["amount"]}')
            except (ValueError, IndexError):
                logger.info(f'CHALLENGE deposit could not parse challenge_id from desc="{existing_desc}"')

        db.execute('''
            UPDATE transactions SET type=?, amount=?, category_id=?, description=?, date=?
            WHERE id=? AND user_id=?
        ''', (body.type, body.amount, body.category_id, body.description, body.date, transaction_id, user_id))
        tx = db.execute('''
            SELECT t.*, c.name as category_name, c.icon as category_icon
            FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id=?
        ''', (transaction_id,)).fetchone()
        db.execute('COMMIT')
        logger.info(f'TX update id={transaction_id} user_id={user_id}')
        return {'success': True, 'data': dict(tx)}
    except HTTPException:
        raise
    except Exception as e:
        db.execute('ROLLBACK')
        logger.error(f'TX update error id={transaction_id} user_id={user_id}: {e}')
        raise HTTPException(500, detail='Error al actualizar la transacción')
    finally:
        db.close()

@router.delete('/{transaction_id}')
def remove(transaction_id: int, user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        db.execute('BEGIN')
        tx = db.execute('SELECT id, amount, description FROM transactions WHERE id=? AND user_id=?', (transaction_id, user_id)).fetchone()
        if not tx:
            db.execute('ROLLBACK')
            raise HTTPException(404, detail='Transaccion no encontrada o acceso denegado')

        desc = tx['description']

        if desc and desc.startswith('Depósito a reto #') and ': ' in desc:
            challenge_id_str = desc.split('#')[1].split(':')[0]
            try:
                challenge_id = int(challenge_id_str)
                ch = db.execute('SELECT id, current FROM saving_challenges WHERE id=? AND user_id=?',
                    (challenge_id, user_id)).fetchone()
                if ch:
                    new_current = max(0, ch['current'] - tx['amount'])
                    db.execute('UPDATE saving_challenges SET current=? WHERE id=?', (new_current, ch['id']))
                else:
                    logger.info(f'CHALLENGE deposit not found id={challenge_id} user_id={user_id}')
            except (ValueError, IndexError):
                logger.info(f'CHALLENGE deposit could not parse challenge_id from desc="{desc}"')

        db.execute('DELETE FROM transactions WHERE id=?', (transaction_id,))
        db.execute('COMMIT')
        logger.info(f'TX delete id={transaction_id} user_id={user_id}')
        return {'success': True, 'data': {'id': transaction_id}}
    except HTTPException:
        raise
    except Exception as e:
        db.execute('ROLLBACK')
        logger.error(f'TX delete error id={transaction_id} user_id={user_id}: {e}')
        raise HTTPException(500, detail='Error al eliminar la transacción')
    finally:
        db.close()
