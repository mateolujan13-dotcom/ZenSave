from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db
from backend.auth import hash_password, verify_password, create_token, get_current_user
from backend.logger import logger
from backend.models.schemas import RegistroBody, InicioSesionBody, ActualizarPerfilBody

router = APIRouter()

@router.post('/register')
def register(body: RegistroBody):
    with get_db() as db:
        existing = db.execute('SELECT id FROM usuarios WHERE email=?', (body.email,)).fetchone()
        if existing:
            raise HTTPException(400, detail='El email ya esta registrado')
        hashed = hash_password(body.contrasena)
        cur = db.execute('INSERT INTO usuarios(nombre,email,contrasena) VALUES(?,?,?)',
            (body.nombre, body.email, hashed))
        user_id = cur.lastrowid
        token = create_token(user_id)
        logger.info(f'AUTH register user_id={user_id} email={body.email}')
        return {'success': True, 'token': token, 'user': {'id': user_id, 'nombre': body.nombre, 'email': body.email, 'meta_mensual': 0, 'salario_mensual': 0}}

@router.post('/login')
def login(body: InicioSesionBody):
    with get_db() as db:
        user = db.execute('SELECT * FROM usuarios WHERE email=?', (body.email,)).fetchone()
        if not user or not verify_password(body.contrasena, user['contrasena']):
            raise HTTPException(400, detail='Credenciales invalidas')
        token = create_token(user['id'])
        logger.info(f'AUTH login user_id={user["id"]} email={body.email}')
        return {
            'success': True, 'token': token,
            'user': {k: user[k] for k in ('id','nombre','email','meta_mensual','salario_mensual','fecha_creacion')}
        }

@router.get('/profile')
def get_profile(user_id: int = Depends(get_current_user)):
    with get_db() as db:
        user = db.execute('SELECT id, nombre, email, meta_mensual, salario_mensual, fecha_creacion FROM usuarios WHERE id=?', (user_id,)).fetchone()
        if not user:
            raise HTTPException(404, detail='Usuario no encontrado')
        return {'success': True, 'user': dict(user)}

@router.put('/profile')
def update_profile(body: ActualizarPerfilBody, user_id: int = Depends(get_current_user)):
    with get_db() as db:
        db.execute('UPDATE usuarios SET nombre=?, meta_mensual=?, salario_mensual=? WHERE id=?',
            (body.nombre, body.meta_mensual, body.salario_mensual, user_id))
        user = db.execute('SELECT id, nombre, email, meta_mensual, salario_mensual FROM usuarios WHERE id=?', (user_id,)).fetchone()
        logger.info(f'AUTH update_profile user_id={user_id}')
        return {'success': True, 'user': dict(user)}
