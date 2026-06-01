# 🌿 ZEN SAVE — Financial Sanctuary

ZEN SAVE es una plataforma web innovadora de organización financiera personal diseñada con una estética premium oscura y un **Asesor con Inteligencia Artificial integrado (Google Gemini)**.

Desarrollado como proyecto académico para la **Tecnicatura en Desarrollo de Software** por el equipo **IRONDEV'S**.

---

## 👥 Equipo IRONDEV'S
- Alejandro Díaz
- Leonardo Milow
- Josué Aguirre
- Mateo Luján
- Rocío Avezon

---

## 🚀 Características Principales

1. **Gestión de Sesión Segura**: Autenticación JWT con cifrado de contraseñas (PBKDF2 + bcrypt legacy).
2. **TPS (Transactions)**: Registro y filtrado de ingresos y gastos al instante.
3. **MIS (Dashboard)**: Resumen mensual, progreso de presupuesto, gráficos dinámicos con Chart.js y detección inteligente de "Gastos Hormiga".
4. **DSS (Asesor ZEN)**: Un chat interactivo integrado con IA (Gemini 2.5 Flash) capaz de leer el contexto financiero local del usuario y proveer recomendaciones personalizadas en tiempo real.
5. **Retos de Ahorro**: Creación y seguimiento de metas financieras.
6. **Diseño Premium**: Dark Theme completo, sin librerías externas voluminosas (solo CSS puro en tokens), animaciones suaves, layouts responsivos y notificaciones Toast nativas.

---

## 🛠️ Stack Tecnológico

- **Backend**: Python 3, FastAPI, Uvicorn
- **Base de Datos**: SQLite (modo WAL para concurrencia)
- **Frontend**: HTML5, Vanilla JavaScript (con arquitectura basada en fetch API) y CSS Puro (Variables nativas, Flexbox/Grid)
- **Gráficos**: Chart.js (vía CDN)
- **Inteligencia Artificial**: Google Gemini REST API (`google-genai`)

---

## ⚙️ Instalación en 5 Pasos

1. **Clonar / Descomprimir el repositorio**
   Abrí tu terminal en la carpeta raíz del proyecto.

2. **Instalar Dependencias**
   Asegurate de tener Python 3.10+ instalado y ejecutá:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar Entorno**
   Renombrá el archivo `backend/.env.example` a `backend/.env` (si aún no lo has hecho) y asegúrate de configurar tu clave de Gemini:
   ```env
   JWT_SECRET=zensave_irondevs_jwt_secret_2026_dev
   GEMINI_API_KEY=tu_clave_aqui
   ```

4. **Iniciar el Servidor Backend**
   ```bash
   python -m uvicorn backend.main:app --reload --port 3001
   ```
   *(Verás en consola que el servidor corre en el puerto 3001 y la base de datos se inicializa sola).*

5. **Abrir el Frontend**
   No es necesario un servidor frontend complejo. Simplemente da doble clic en el archivo `frontend/index.html` en tu explorador de archivos para abrirlo en el navegador.

---

## 📸 Módulos de la Aplicación

- **Pantalla de Acceso (Login)**: Efecto Glassmorphism, animaciones fade-in y validación visual.
- **Dashboard (MIS)**: Gráficos de barra, donas de categorías y listado de gastos hormiga.
- **Transacciones**: Listado transaccional con filtros dinámicos (Mes/Tipo) y un *Floating Action Button*.
- **Asesor ZEN**: Interfaz moderna simulando un consultor humano experto.

> **ZEN SAVE 2026** - Proyecto académico de excelencia diseñado y codificado por IRONDEV'S.
