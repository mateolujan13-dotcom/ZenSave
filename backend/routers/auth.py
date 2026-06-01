from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth import hash_password, verify_password, create_token, get_current_user
from backend.logger import logger
from backend.models.schemas import RegisterBody, LoginBody, UpdateProfileBody

router = APIRouter()

@router.post('/register')
def register(body: RegisterBody):
    with get_db() as db:
        existing = db.execute('SELECT id FROM users WHERE email=?', (body.email,)).fetchone()
        if existing:
            raise HTTPException(400, detail='El email ya esta registrado')
        hashed = hash_password(body.password)
        cur = db.execute('INSERT INTO users(name,email,password) VALUES(?,?,?)',
            (body.name, body.email, hashed))
        user_id = cur.lastrowid
        token = create_token(user_id)
        logger.info(f'AUTH register user_id={user_id} email={body.email}')
        return {'success': True, 'token': token, 'user': {'id': user_id, 'name': body.name, 'email': body.email, 'monthly_goal': 0}}

@router.post('/login')
def login(body: LoginBody):
    with get_db() as db:
        user = db.execute('SELECT * FROM users WHERE email=?', (body.email,)).fetchone()
        if not user or not verify_password(body.password, user['password']):
            raise HTTPException(400, detail='Credenciales invalidas')
        token = create_token(user['id'])
        logger.info(f'AUTH login user_id={user["id"]} email={body.email}')
        return {
            'success': True, 'token': token,
            'user': {k: user[k] for k in ('id','name','email','monthly_goal','monthly_salary','created_at')}
        }

@router.get('/profile')
def get_profile(user_id: int = Depends(get_current_user)):
    with get_db() as db:
        user = db.execute('SELECT id, name, email, monthly_goal, monthly_salary, created_at FROM users WHERE id=?', (user_id,)).fetchone()
        if not user:
            raise HTTPException(404, detail='Usuario no encontrado')
        return {'success': True, 'user': dict(user)}

@router.put('/profile')
def update_profile(body: UpdateProfileBody, user_id: int = Depends(get_current_user)):
    with get_db() as db:
        db.execute('UPDATE users SET name=?, monthly_goal=?, monthly_salary=? WHERE id=?',
            (body.name, body.monthly_goal, body.monthly_salary, user_id))
        user = db.execute('SELECT id, name, email, monthly_goal, monthly_salary FROM users WHERE id=?', (user_id,)).fetchone()
        logger.info(f'AUTH update_profile user_id={user_id}')
        return {'success': True, 'user': dict(user)}
