-- ════════════════════════════════════════════════════════════
-- ZEN SAVE — Schema de Base de Datos (SQLite)
-- Ejecutado automáticamente por database.js si las tablas no existen.
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- Tabla: users
-- Almacena las cuentas de usuario.
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    password      TEXT    NOT NULL,
    monthly_goal  REAL    DEFAULT 0,
    monthly_salary REAL   DEFAULT 0,
    created_at    TEXT    DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────
-- Tabla: categories
-- Categorías predefinidas para clasificar transacciones.
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    type  TEXT    NOT NULL CHECK(type IN ('expense', 'income')),
    icon  TEXT
);

-- ─────────────────────────────────────
-- Tabla: transactions
-- Registro de ingresos y egresos del usuario.
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
    amount      REAL    NOT NULL CHECK(amount > 0),
    category_id INTEGER REFERENCES categories(id),
    description TEXT,
    date        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────
-- Tabla: saving_challenges
-- Retos de ahorro personalizados del usuario.
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS saving_challenges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    target      REAL    NOT NULL CHECK(target > 0),
    current     REAL    DEFAULT 0,
    start_date  TEXT,
    end_date    TEXT,
    active      INTEGER DEFAULT 1
);

-- ═══════════════════════════════════════
-- Índices para rendimiento
-- ═══════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type    ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_user_date         ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_saving_challenges_user_id ON saving_challenges(user_id);

-- ═══════════════════════════════════════
-- Categorías predefinidas de GASTO (expense)
-- ═══════════════════════════════════════
INSERT OR IGNORE INTO categories (id, name, type, icon) VALUES
    (1,  'Comida',      'expense', 'restaurant'),
    (2,  'Transporte',  'expense', 'directions_bus'),
    (3,  'Ocio',        'expense', 'sports_esports'),
    (4,  'Servicios',   'expense', 'lightbulb'),
    (5,  'Salud',       'expense', 'local_hospital'),
    (6,  'Educación',   'expense', 'school'),
    (7,  'Ropa',        'expense', 'checkroom'),
    (8,  'Hogar',       'expense', 'home'),
    (9,  'Suscripciones','expense','subscriptions'),
    (10, 'Otros',       'expense', 'inventory_2'),
    (11, 'Salario',     'income',  'payments'),
    (12, 'Freelance',   'income',  'work'),
    (13, 'Inversiones', 'income',  'trending_up'),
    (14, 'Otros Ingresos','income','add_card');
