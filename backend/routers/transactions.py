from fastapi import APIRouter, HTTPException, Query, Depends
from backend.database import get_db
from backend.auth import get_current_user
from backend.logger import logger
from backend.models.schemas import TransaccionBody
from typing import Optional

router = APIRouter()

@router.get('/resumen')
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
            SELECT tipo, SUM(monto) as total FROM transacciones
            WHERE usuario_id=? AND fecha >= ? AND fecha < ? GROUP BY tipo
        ''', (user_id, month_start, month_end)).fetchall()

        total_income = 0
        total_expense = 0
        for row in current_month_tx:
            if row['tipo'] == 'income':
                total_income = row['total']
            if row['tipo'] == 'expense':
                total_expense = row['total']

        user_row = db.execute('SELECT salario_mensual, meta_mensual FROM usuarios WHERE id=?', (user_id,)).fetchone()
        monthly_salary = user_row['salario_mensual'] if user_row else 0
        monthly_goal = user_row['meta_mensual'] if user_row else 0
        balance = total_income - total_expense

        all_time = db.execute("SELECT SUM(CASE WHEN tipo='income' THEN monto ELSE 0 END) as inc, SUM(CASE WHEN tipo='expense' THEN monto ELSE 0 END) as exp FROM transacciones WHERE usuario_id=?", (user_id,)).fetchone()
        accumulated_balance = (all_time['inc'] or 0) - (all_time['exp'] or 0)

        savings_total = db.execute("SELECT COALESCE(SUM(actual),0) FROM retos_ahorro WHERE usuario_id=? AND activo=1", (user_id,)).fetchone()[0]

        by_category = db.execute('''
            SELECT c.nombre as category_name, c.icono as icon, SUM(t.monto) as total
            FROM transacciones t JOIN categorias c ON t.categoria_id = c.id
            WHERE t.usuario_id=? AND t.tipo='expense' AND t.fecha >= ? AND t.fecha < ?
            GROUP BY c.id ORDER BY total DESC
        ''', (user_id, month_start, month_end)).fetchall()

        by_category_list = [{
            'category_name': r['category_name'],
            'icon': r['icon'],
            'total': r['total'],
            'percentage': round((r['total'] / total_expense * 100), 1) if total_expense > 0 else 0
        } for r in by_category]

        monthly_trend = db.execute('''
            SELECT strftime('%Y-%m', fecha) as month,
                   SUM(CASE WHEN tipo='income' THEN monto ELSE 0 END) as income,
                   SUM(CASE WHEN tipo='expense' THEN monto ELSE 0 END) as expense
            FROM transacciones WHERE usuario_id=? AND fecha >= date('now', 'start of month', '-5 months')
            GROUP BY month ORDER BY month ASC
        ''', (user_id,)).fetchall()

        micro_expenses = db.execute('''
            SELECT descripcion as description, SUM(monto) as amount, COUNT(*) as count
            FROM transacciones
            WHERE usuario_id=? AND tipo='expense' AND monto < 500
              AND descripcion != '' AND fecha >= ? AND fecha < ?
            GROUP BY descripcion HAVING COUNT(*) >= 3 ORDER BY amount DESC
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
        base = 'FROM transacciones t LEFT JOIN categorias c ON t.categoria_id = c.id WHERE t.usuario_id=?'
        params = [user_id]

        if type:
            base += ' AND t.tipo=?'
            params.append(type)
        if category_id:
            base += ' AND t.categoria_id=?'
            params.append(category_id)
        if month:
            base += " AND t.fecha >= ? AND t.fecha < ?"
            params.append(f'{month}-01')
            y, m = month.split('-')
            if int(m) == 12:
                params.append(f'{int(y)+1}-01-01')
            else:
                params.append(f'{y}-{int(m)+1:02d}-01')
        if search:
            base += ' AND t.descripcion LIKE ?'
            params.append(f'%{search}%')

        total = db.execute(f'SELECT COUNT(*) as total {base}', params).fetchone()['total']

        query = f'SELECT t.*, c.nombre as category_name, c.icono as category_icon {base} ORDER BY t.fecha DESC, t.creado_en DESC'
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
            SELECT t.*, c.nombre as category_name, c.icono as category_icon
            FROM transacciones t LEFT JOIN categorias c ON t.categoria_id = c.id
            WHERE t.id=? AND t.usuario_id=?
        ''', (transaction_id, user_id)).fetchone()
        if not tx:
            raise HTTPException(404, detail='Transaccion no encontrada o acceso denegado')
        return {'success': True, 'data': dict(tx)}
    finally:
        db.close()

@router.post('')
def create(body: TransaccionBody, user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        cur = db.execute('''
            INSERT INTO transacciones (usuario_id, tipo, monto, categoria_id, descripcion, fecha)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, body.tipo, body.monto, body.categoria_id, body.descripcion, body.fecha))
        tx = db.execute('''
            SELECT t.*, c.nombre as category_name, c.icono as category_icon
            FROM transacciones t LEFT JOIN categorias c ON t.categoria_id = c.id WHERE t.id=?
        ''', (cur.lastrowid,)).fetchone()
        logger.info(f'TX create id={cur.lastrowid} user_id={user_id} type={body.tipo} amount={body.monto}')
        return {'success': True, 'data': dict(tx)}
    finally:
        db.close()

@router.put('/{transaction_id}')
def update(transaction_id: int, body: TransaccionBody, user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        db.execute('BEGIN')
        existing = db.execute('SELECT id, monto, descripcion FROM transacciones WHERE id=? AND usuario_id=?', (transaction_id, user_id)).fetchone()
        if not existing:
            db.execute('ROLLBACK')
            raise HTTPException(404, detail='Transaccion no encontrada o acceso denegado')

        existing_desc = existing['descripcion']
        if existing_desc and existing_desc.startswith('Depósito a reto #') and ': ' in existing_desc:
            challenge_id_str = existing_desc.split('#')[1].split(':')[0]
            try:
                challenge_id = int(challenge_id_str)
                ch = db.execute('SELECT id, actual FROM retos_ahorro WHERE id=? AND usuario_id=?',
                    (challenge_id, user_id)).fetchone()
                if ch:
                    new_current = max(0, ch['actual'] - existing['monto'])
                    db.execute('UPDATE retos_ahorro SET actual=? WHERE id=?', (new_current, ch['id']))
                    logger.info(f'CHALLENGE deposit reversed on update id={ch["id"]} user_id={user_id} amount={existing["monto"]}')
            except (ValueError, IndexError):
                logger.info(f'CHALLENGE deposit could not parse challenge_id from desc="{existing_desc}"')

        db.execute('''
            UPDATE transacciones SET tipo=?, monto=?, categoria_id=?, descripcion=?, fecha=?
            WHERE id=? AND usuario_id=?
        ''', (body.tipo, body.monto, body.categoria_id, body.descripcion, body.fecha, transaction_id, user_id))
        tx = db.execute('''
            SELECT t.*, c.nombre as category_name, c.icono as category_icon
            FROM transacciones t LEFT JOIN categorias c ON t.categoria_id = c.id WHERE t.id=?
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
        tx = db.execute('SELECT id, monto, descripcion FROM transacciones WHERE id=? AND usuario_id=?', (transaction_id, user_id)).fetchone()
        if not tx:
            db.execute('ROLLBACK')
            raise HTTPException(404, detail='Transaccion no encontrada o acceso denegado')

        desc = tx['descripcion']

        if desc and desc.startswith('Depósito a reto #') and ': ' in desc:
            challenge_id_str = desc.split('#')[1].split(':')[0]
            try:
                challenge_id = int(challenge_id_str)
                ch = db.execute('SELECT id, actual FROM retos_ahorro WHERE id=? AND usuario_id=?',
                    (challenge_id, user_id)).fetchone()
                if ch:
                    new_current = max(0, ch['actual'] - tx['monto'])
                    db.execute('UPDATE retos_ahorro SET actual=? WHERE id=?', (new_current, ch['id']))
                else:
                    logger.info(f'CHALLENGE deposit not found id={challenge_id} user_id={user_id}')
            except (ValueError, IndexError):
                logger.info(f'CHALLENGE deposit could not parse challenge_id from desc="{desc}"')

        db.execute('DELETE FROM transacciones WHERE id=?', (transaction_id,))
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
