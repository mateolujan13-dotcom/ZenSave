from fastapi import APIRouter, Depends
from backend.database import get_db
from backend.auth import get_current_user

router = APIRouter()

@router.get('')
def get_categories(user_id: int = Depends(get_current_user)):
    db = get_db()
    try:
        categories = db.execute('SELECT * FROM categories ORDER BY name ASC').fetchall()
        return {'success': True, 'data': [dict(r) for r in categories]}
    finally:
        db.close()
