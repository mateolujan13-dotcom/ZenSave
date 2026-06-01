import time
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from backend.database import init_db
from backend.logger import logger
from backend.routers import auth, transactions, categories, ai

load_dotenv()     # busca .env en la raíz primero
load_dotenv('backend/.env', override=False)  # respaldo

init_db()

app = FastAPI(title='ZEN SAVE API', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.middleware('http')
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = int((time.time() - start) * 1000)
    logger.info(f'{request.method} {request.url.path} {response.status_code} {ms}ms')
    if ms > 2000:
        logger.warning(f'SLOW_REQUEST {request.method} {request.url.path} {ms}ms')
    return response

app.include_router(auth.router, prefix='/api/auth')
app.include_router(transactions.router, prefix='/api/transactions')
app.include_router(categories.router, prefix='/api/categories')
app.include_router(ai.router, prefix='/api/ai')

@app.get('/api/health')
def health():
    return {'success': True, 'data': {'status': 'online', 'name': 'ZEN SAVE API', 'version': '2.0.0'}}

app.mount('/', StaticFiles(directory='frontend', html=True), name='frontend')
