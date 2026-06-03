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

        # ── Datos del mes actual ──
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

        # ── Balance acumulado histórico ──
        all_time = db.execute("SELECT SUM(CASE WHEN tipo='income' THEN monto ELSE 0 END) as inc, SUM(CASE WHEN tipo='expense' THEN monto ELSE 0 END) as exp FROM transacciones WHERE usuario_id=?", (user_id,)).fetchone()
        accumulated_balance = (all_time['inc'] or 0) - (all_time['exp'] or 0)

        # ── Top categorías del mes ──
        top_cats = db.execute('''
            SELECT c.nombre, SUM(t.monto) as total
            FROM transacciones t JOIN categorias c ON t.categoria_id = c.id
            WHERE t.usuario_id=? AND t.tipo='expense' AND strftime('%Y-%m', t.fecha)=?
            GROUP BY c.id ORDER BY total DESC LIMIT 5
        ''', (user_id, current_month)).fetchall()
        top_categories_str = '\n'.join([f'- {r["nombre"]}: ${r["total"]:.2f}' for r in top_cats]) if top_cats else 'No hay gastos registrados este mes.'

        # ── Gastos hormiga ──
        micro = db.execute('''
            SELECT descripcion, SUM(monto) as amount, COUNT(*) as count
            FROM transacciones WHERE usuario_id=? AND tipo='expense' AND monto<500
              AND descripcion!='' AND strftime('%Y-%m', fecha)=?
            GROUP BY descripcion HAVING COUNT(*)>=3 ORDER BY amount DESC
        ''', (user_id, current_month)).fetchall()
        micro_str = '\n'.join([f'- {r["descripcion"]}: ${r["amount"]:.2f} ({r["count"]} veces)' for r in micro]) if micro else 'Sin gastos hormiga significativos.'

        # ── Historial mes a mes (últimos 6) ──
        monthly_history = db.execute('''
            SELECT strftime('%Y-%m', fecha) as mes,
                   SUM(CASE WHEN tipo='income' THEN monto ELSE 0 END) as ingresos,
                   SUM(CASE WHEN tipo='expense' THEN monto ELSE 0 END) as gastos
            FROM transacciones WHERE usuario_id=?
            GROUP BY mes ORDER BY mes DESC LIMIT 6
        ''', (user_id,)).fetchall()
        monthly_history.reverse()
        monthly_str_lines = [f'- {r["mes"]}: ingresos=${r["ingresos"] or 0:.2f}, gastos=${r["gastos"] or 0:.2f}' for r in monthly_history]
        monthly_str = '\n'.join(monthly_str_lines) if monthly_str_lines else 'Sin datos historicos.'

        # ── Últimas transacciones recientes ──
        recent_tx = db.execute('''
            SELECT t.tipo, t.monto, t.descripcion, t.fecha, c.nombre as categoria
            FROM transacciones t LEFT JOIN categorias c ON t.categoria_id = c.id
            WHERE t.usuario_id=? ORDER BY t.fecha DESC, t.creado_en DESC LIMIT 5
        ''', (user_id,)).fetchall()
        recent_str = '\n'.join([
            f'- {r["fecha"]} | {r["tipo"]=="income" and "INGRESO" or "GASTO"} | ${r["monto"]:.2f} | {r["categoria"] or "General"}{r["descripcion"] and ": "+r["descripcion"] or ""}'
            for r in recent_tx
        ]) if recent_tx else 'Sin transacciones recientes.'

        # ── Retos de ahorro con progreso ──
        challenges = db.execute('''
            SELECT titulo, objetivo, actual FROM retos_ahorro WHERE usuario_id=? AND activo=1
        ''', (user_id,)).fetchall()
        challenges_str_lines = []
        for r in challenges:
            pct = round((r['actual'] / r['objetivo']) * 100, 1) if r['objetivo'] > 0 else 0
            challenges_str_lines.append(f'- {r["titulo"]}: ${r["actual"]:.2f} / ${r["objetivo"]:.2f} ({pct}%)')
        challenges_str = '\n'.join(challenges_str_lines) if challenges_str_lines else 'Sin retos activos.'

        # ── Tendencia vs mes anterior ──
        prev_month = (now.replace(day=1) - datetime.timedelta(days=1)).strftime('%Y-%m')
        prev = db.execute('''
            SELECT SUM(monto) as total FROM transacciones
            WHERE usuario_id=? AND tipo='expense' AND strftime('%Y-%m', fecha)=?
        ''', (user_id, prev_month)).fetchone()
        prev_expense = prev['total'] or 0
        trend_direction = 'SUBIO' if total_expense > prev_expense else 'BAJO'
        trend_pct = abs(round((total_expense - prev_expense) / max(prev_expense, 1) * 100, 1))

        # ── Construir conversación ──
        chat_history = ''
        for msg in body.historial:
            role = 'Usuario' if msg.role == 'user' else 'Asesor ZEN'
            chat_history += f'\n{role}: {msg.text}'

        prompt = f'''Sos ZEN AI, un asesor financiero personal experto dentro de la app ZEN SAVE. Tene siempre presente que tu propósito es ayudar al usuario a tomar mejores decisiones financieras.

## Identidad y tono
- Te llamas "Asesor ZEN" o "ZEN AI".
- Hablás en español rioplatense argentino (voseo: "tenés", "podés", "decime").
- Tu tono es mixto: profesional y preciso cuando analizás números, cálido y motivacional cuando aconsejás.
- Usás un estilo zen pero sin ser esotérico: sos claro, directo y con vocación de ayudar.
- Respondé siempre en Markdown para facilitar la lectura.
- Si el usuario está en una mala situación financiera, sé empático pero constructivo.
- Si el usuario viene bien, festejalo brevemente ("¡Venis bárbaro!", "Buen laburo este mes").

## Perfil del usuario
- Nombre: {user['nombre']}
- Salario mensual declarado: ${monthly_salary:.2f}
- Meta de gasto mensual: ${monthly_goal:.2f}
- Hoy: {fecha_str} | Días restantes del mes: {days_left}

## Situación financiera del mes actual ({current_month})
- Ingresos totales (con salario): ${total_income:.2f}
- Gastos totales: ${total_expense:.2f}
- Balance mensual: ${balance:.2f}
- Meta de gasto consumida: {goal_percent}%
- Gasto diario promedio: ${daily_avg:.2f}
- Tendencia vs mes anterior ({prev_month}): {trend_direction} un {trend_pct}%
- Balance acumulado histórico (desde el inicio): ${accumulated_balance:.2f}

## Top categorías de gasto este mes
{top_categories_str}

## Gastos hormiga detectados
{micro_str}

## Historial mes a mes (últimos 6 meses)
{monthly_str}

## Últimas transacciones
{recent_str}

## Retos de ahorro activos
{challenges_str}

## Reglas de conducta
1. Usá datos concretos del perfil financiero del usuario para responder. No inventes números.
2. Si los gastos superan la meta o la tendencia es negativa, alertá al usuario aunque no lo pregunte.
3. Si el historial mensual muestra un patrón (ej: todos los meses gasta de más), señálo.
4. Si hay retos de ahorro activos, mencionálos cuando sea relevante y motivá al usuario a seguirlos.
5. Cuando des consejos, sé específico y accionable ("podrías reducir X categoría" en vez de "gastá menos").
6. Si el balance acumulado es negativo, priorizá estrategias de reducción de deuda.
7. No respondas con más de 3-4 párrafos a menos que el usuario pida más detalle.
8. Si el usuario te pide crear un reto, analizá si es realista según sus ingresos y gastos, y decí "Para crear este reto, necesito que vayas a la sección de Retos o me confirmes para generarlo".
9. Si el usuario NO ha proporcionado datos de salario o meta mensual, sugerile amablemente que complete su perfil financiero.

## Historial de la conversación actual
{chat_history}

## Mensaje del usuario
{body.mensaje}'''

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
