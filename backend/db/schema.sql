-- ZEN SAVE — Schema de Base de Datos (SQLite)

CREATE TABLE IF NOT EXISTS usuarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT    NOT NULL,
    email           TEXT    UNIQUE NOT NULL,
    contrasena      TEXT    NOT NULL,
    meta_mensual    REAL    DEFAULT 0,
    salario_mensual REAL    DEFAULT 0,
    fecha_creacion  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre  TEXT    NOT NULL,
    tipo  TEXT    NOT NULL CHECK(tipo IN ('expense', 'income')),
    icono TEXT
);

CREATE TABLE IF NOT EXISTS transacciones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo        TEXT    NOT NULL CHECK(tipo IN ('income', 'expense')),
    monto       REAL    NOT NULL CHECK(monto > 0),
    categoria_id INTEGER REFERENCES categorias(id),
    descripcion TEXT,
    fecha       TEXT    NOT NULL,
    creado_en   TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retos_ahorro (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo      TEXT    NOT NULL,
    objetivo    REAL    NOT NULL CHECK(objetivo > 0),
    actual      REAL    DEFAULT 0,
    fecha_inicio TEXT,
    fecha_fin   TEXT,
    activo      INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha    ON transacciones(fecha);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo    ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_tx_usuario_fecha      ON transacciones(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_retos_ahorro_usuario_id ON retos_ahorro(usuario_id);

INSERT OR IGNORE INTO categorias (id, nombre, tipo, icono) VALUES
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
