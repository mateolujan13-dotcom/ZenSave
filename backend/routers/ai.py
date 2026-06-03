import os
import datetime
from google import genai
from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth import get_current_user
from backend.logger import logger
from backend.models.schemas import ConsejoBody, RetoBody, DepositoBody

router = APIRouter()

_ai_client = None

def get_ai_client():
    global _ai_client
    if _ai_client is None:
        _ai_client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    return _ai_client

@router.post('/consejo')
def get_advice(body: ConsejoBody, user_id: int = Depends(get_current_user)):
    if not body.mensaje:
        raise HTTPException(400, detail='Mensaje requerido')

    db = get_db()
    try:
        user = db.execute('SELECT nombre, salario_mensual, meta_mensual FROM usuarios WHERE id=?', (user_id,)).fetchone()
        if not user:
            raise HTTPException(404, detail='Usuario no encontrado')

        now = datetime.datetime.now()
        current_month = now.strftime('%Y-%m')
        fecha_str = now.strftime('%d/%m/%Y %H:%M')
        days_left = (datetime.date(now.year, now.month + 1, 1) - now.date()).days if now.month < 12 else (datetime.date(now.year + 1, 1, 1) - now.date()).days

        month_tx = db.execute('''
            SELECT tipo, SUM(monto) as total FROM transacciones
            WHERE usuario_id=? AND strftime('%Y-%m', fecha)=? GROUP BY tipo
        ''', (user_id, current_month)).fetchall()

        total_income = 0
        total_expense = 0
        for row in month_tx:
            if row['tipo'] == 'income':
                total_income = row['total'] or 0
            if row['tipo'] == 'expense':
                total_expense = row['total'] or 0

        monthly_salary = user['salario_mensual'] or 0
        monthly_goal = user['meta_mensual'] or 0
        total_income += monthly_salary
        balance = total_income - total_expense

        goal_percent = round((total_expense / monthly_goal * 100), 1) if monthly_goal > 0 else 0
        daily_avg = round(total_expense / now.day, 2) if now.day > 0 else 0

        top_cats = db.execute('''
            SELECT c.nombre, SUM(t.monto) as total
            FROM transacciones t JOIN categorias c ON t.categoria_id = c.id
            WHERE t.usuario_id=? AND t.tipo='expense' AND strftime('%Y-%m', t.fecha)=?
            GROUP BY c.id ORDER BY total DESC LIMIT 3
        ''', (user_id, current_month)).fetchall()
        top_categories_str = '\n'.join([f'- {r["nombre"]}: ${r["total"]:.2f}' for r in top_cats]) if top_cats else 'No hay gastos registrados este mes.'

        micro = db.execute('''
            SELECT descripcion, SUM(monto) as amount, COUNT(*) as count
            FROM transacciones WHERE usuario_id=? AND tipo='expense' AND monto<500
              AND descripcion!='' AND strftime('%Y-%m', fecha)=?
            GROUP BY descripcion HAVING COUNT(*)>=3 ORDER BY amount DESC
        ''', (user_id, current_month)).fetchall()
        micro_str = '\n'.join([f'- {r["descripcion"]}: ${r["amount"]:.2f} (repetido {r["count"]} veces)' for r in micro]) if micro else 'No se detectaron gastos hormiga significativos.'

        prev_month = (now.replace(day=1) - datetime.timedelta(days=1)).strftime('%Y-%m')
        prev = db.execute('''
            SELECT SUM(monto) as total FROM transacciones
            WHERE usuario_id=? AND tipo='expense' AND strftime('%Y-%m', fecha)=?
        ''', (user_id, prev_month)).fetchone()
        prev_expense = prev['total'] or 0
        trend_direction = 'SUBIO' if total_expense > prev_expense else 'BAJO'
        trend_pct = abs(round((total_expense - prev_expense) / max(prev_expense, 1) * 100, 1))

        challenges = db.execute('''
            SELECT titulo, objetivo FROM retos_ahorro WHERE usuario_id=? AND activo=1
        ''', (user_id,)).fetchall()
        challenges_str = '\n'.join([f'- {r["titulo"]}: Meta de ${r["objetivo"]:.2f}' for r in challenges]) if challenges else 'No tiene retos de ahorro activos en este momento.'

        prompt = f'''Sos ZEN AI, asesor financiero personal de la app ZEN SAVE.
El usuario se llama {user['nombre']}. Hoy es {fecha_str}.

SITUACION FINANCIERA ACTUAL:
- Ingresos: ${total_income:.2f} | Gastos: ${total_expense:.2f} | Balance: ${balance:.2f}
- Meta de gasto mensual: ${monthly_goal:.2f} ({goal_percent}% consumido)
- Tendencia vs mes anterior: {trend_direction} un {trend_pct}%
- Gasto diario promedio: ${daily_avg:.2f} | Dias restantes del mes: {days_left}
- Top categorias de gasto:
{top_categories_str}
- Gastos hormiga detectados:
{micro_str}
- Retos de ahorro activos:
{challenges_str}

INSTRUCCIONES: Responde en espanol rioplatense. Se proactivo: si el gasto supera
la meta o la tendencia es negativa, alertalo aunque no te lo pregunten. Usa Markdown.
Maximo 3 parrafos cortos. Si el balance es negativo, prioriza estrategias de reduccion.

El usuario pregunta: "{body.mensaje}"'''

        response = get_ai_client().models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        reply = response.text

        logger.info(f'AI advice user_id={user_id}')
        return {'success': True, 'data': {'reply': reply}}

    except Exception as e:
        logger.error(f'AI advice error: {e}')
        raise HTTPException(500, detail='No se pudo contactar al Asesor ZEN en este momento.')
    finally:
        db.close()

@router.post('/retos')
def crear_reto(body: RetoBody, user_id: int = Depends(get_current_user)):
    if not body.titulo or body.objetivo <= 0:
        raise HTTPException(400, detail='Datos del reto invalidos')
    db = get_db()
    try:
        cur = db.execute('''
            INSERT INTO retos_ahorro (usuario_id, titulo, objetivo, fecha_inicio, fecha_fin)
            VALUES (?, ?, ?, date('now'), ?)
        ''', (user_id, body.titulo, body.objetivo, body.fecha_fin))
        logger.info(f'CHALLENGE create id={cur.lastrowid} user_id={user_id} titulo={body.titulo}')
        return {'success': True, 'data': {'id': cur.lastrowid}}
    finally:
        db.close()

@router.get('/retos')
def obtener_retos(user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        retos = db.execute('''
            SELECT * FROM retos_ahorro WHERE usuario_id=? AND activo=1 ORDER BY id DESC
        ''', (user_id,)).fetchall()
        return {'success': True, 'data': [dict(r) for r in retos]}
    finally:
        db.close()

@router.patch('/retos/{challenge_id}/depositar')
def depositar_reto(challenge_id: int, body: DepositoBody, user_id: int = Depends(get_current_user)):
    if body.monto <= 0:
        raise HTTPException(400, detail='Monto debe ser mayor a 0')
    db = get_db()
    try:
        ch = db.execute('SELECT * FROM retos_ahorro WHERE id=? AND usuario_id=? AND activo=1',
            (challenge_id, user_id)).fetchone()
        if not ch:
            raise HTTPException(404, detail='Reto no encontrado')
        new_current = ch['actual'] + body.monto
        if new_current > ch['objetivo']:
            raise HTTPException(400, detail='El monto supera la meta del reto')
        db.execute('UPDATE retos_ahorro SET actual=? WHERE id=?', (new_current, challenge_id))
        from datetime import date as dt_date
        local_date = dt_date.today().isoformat()
        db.execute('''
            INSERT INTO transacciones (usuario_id, tipo, monto, descripcion, fecha)
            VALUES (?, 'expense', ?, ?, ?)
        ''', (user_id, body.monto, f'Depósito a reto #{ch["id"]}: {ch["titulo"]}', local_date))
        progress = round((new_current / ch['objetivo']) * 100, 2)
        logger.info(f'CHALLENGE deposit id={challenge_id} amount={body.monto} user_id={user_id}')
        return {
            'success': True, 'data': {
                'id': challenge_id, 'current': new_current,
                'target': ch['objetivo'], 'progress': progress
            }
        }
    finally:
        db.close()
