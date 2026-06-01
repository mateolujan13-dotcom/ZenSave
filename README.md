# Zen Save — Santuario Financiero

Plataforma web de organización financiera personal con asesoría inteligente potenciada por **Google Gemini IA**. Diseñada con estética premium, modo oscuro y experiencia de usuario fluida.

---

## Features

- **Autenticación segura** — JWT con cifrado de contraseñas (PBKDF2 + bcrypt legacy)
- **Dashboard interactivo** — Resumen mensual, métricas en tiempo real, gráficos dinámicos (Chart.js) y detección de gastos hormiga
- **Gestión de transacciones** — Altas, bajas, modificaciones, filtros por tipo/mes y búsqueda
- **Asesor ZEN (IA)** — Chat contextual integrado con Gemini 2.5 Flash que analiza tu perfil financiero y brinda recomendaciones personalizadas
- **Retos de ahorro** — Creación y seguimiento de metas financieras con depósitos parciales
- **Presupuesto mensual** — Barra de progreso visual con alertas de consumo
- **Modo oscuro/claro** — Toggle persistente con detección de preferencias
- **Responsive** — Sidebar desktop + navegación inferior móvil
- **Toast notifications** — Feedback visual no intrusivo

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, FastAPI, Uvicorn |
| Base de datos | SQLite (WAL mode) |
| Frontend | HTML5, Vanilla JS, CSS puro (Flexbox/Grid, variables nativas) |
| Gráficos | Chart.js vía CDN |
| IA | Google Gemini API (`google-genai`) |
| Autenticación | JWT + PBKDF2 |

---

## Instalación

### Requisitos
- Python 3.10+
- Git

### Pasos

```bash
# 1. Clonar
git clone https://github.com/mateolujan13-dotcom/ZenSave.git
cd ZenSave

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con:
#   JWT_SECRET=tu_clave_secreta
#   GEMINI_API_KEY=tu_api_key_de_gemini

# 4. Iniciar servidor
python -m uvicorn backend.main:app --reload --port 3001

# 5. Abrir en navegador
# http://localhost:3001
```

> La base de datos se inicializa automáticamente al primer inicio.  
> Usuario de prueba: `test@zensave.com` / contraseña: consultar al equipo.

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/profile` | Perfil del usuario |
| PUT | `/api/auth/profile` | Actualizar perfil |
| GET | `/api/transactions/summary` | Resumen financiero del mes |
| GET | `/api/transactions` | Listar transacciones (filtros) |
| POST | `/api/transactions` | Crear transacción |
| PUT | `/api/transactions/{id}` | Actualizar transacción |
| DELETE | `/api/transactions/{id}` | Eliminar transacción |
| GET | `/api/categories` | Listar categorías |
| POST | `/api/ai/advice` | Consultar al Asesor ZEN |
| POST | `/api/ai/challenges` | Crear reto de ahorro |
| GET | `/api/ai/challenges` | Listar retos activos |
| PATCH | `/api/ai/challenges/{id}/deposit` | Depositar en reto |
| GET | `/api/health` | Health check |

---

## Despliegue

### Railway
El proyecto incluye `Procfile` y `requirements.txt` para deploy directo:

```bash
# Variables requeridas en Railway
JWT_SECRET=<tu_secreto>
GEMINI_API_KEY=<tu_api_key>
```

### Vercel (frontend estático)
El frontend puede servirse desde Vercel apuntando al backend en Railway. Ver `vercel.txt`.

---

## Equipo

**IRONDEV'S** — Proyecto académico · Tecnicatura en Desarrollo de Software

- Alejandro Díaz
- Leonardo Milow
- Josué Aguirre
- Mateo Luján
- Rocío Avezon

---

<p align="center">Zen Save 2026 — Santuario Financiero</p>
