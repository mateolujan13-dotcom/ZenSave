from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.auth import get_current_user

router = APIRouter()

@router.get('')
def obtener_categorias(user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        categorias = db.execute('SELECT * FROM categorias ORDER BY nombre ASC').fetchall()
        return {'success': True, 'data': [dict(r) for r in categorias]}
    finally:
        db.close()
