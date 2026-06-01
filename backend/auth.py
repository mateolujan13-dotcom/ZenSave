import hashlib
import secrets
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

SECRET = os.getenv('JWT_SECRET', 'zensave_irondevs_jwt_secret_2026_dev')
ALGORITHM = 'HS256'
bearer = HTTPBearer()

def hash_password(plain: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 100_000).hex()
    return f'{salt}${hashed}'

def _verify_bcrypt(plain: str, hashed: str) -> bool:
    try:
        import bcrypt as _bcrypt
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def verify_password(plain: str, stored: str) -> bool:
    if stored.startswith('$2'):
        return _verify_bcrypt(plain, stored)
    parts = stored.split('$')
    if len(parts) != 2:
        return False
    salt, hashed = parts
    return hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 100_000).hex() == hashed

def create_token(user_id: int) -> str:
    return jwt.encode({'sub': str(user_id)}, SECRET, algorithm=ALGORITHM)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> int:
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGORITHM])
        return int(payload['sub'])
    except (JWTError, ValueError, KeyError):
        raise HTTPException(status_code=401, detail='No autorizado')
