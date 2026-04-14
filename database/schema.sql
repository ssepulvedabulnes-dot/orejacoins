-- ═══════════════════════════════════════════════════════════════════════════════
-- OREJACOINS — Database Schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── USUARIOS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT '🦊',
    balance INTEGER DEFAULT 500,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── TRANSACCIONES ───────────────────────────────────────────────────────────────
-- type: 'transfer' | 'purchase' | 'mission_reward' | 'admin_grant'
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER,
    to_user_id INTEGER,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('transfer', 'purchase', 'mission_reward', 'admin_grant')),
    note TEXT,
    image_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- ── TIENDA ──────────────────────────────────────────────────────────────────────
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MODIFICABLE: Puedes añadir items directamente en la DB o desde el panel   ║
-- ║  admin. stock = -1 significa stock ilimitado.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS store_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📦',
    price INTEGER NOT NULL,
    description TEXT,
    stock INTEGER DEFAULT -1,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── COMPRAS DE USUARIOS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES store_items(id)
);

-- ── MISIONES ────────────────────────────────────────────────────────────────────
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  MODIFICABLE: El admin puede crear misiones desde el panel de control.     ║
-- ║  type: 'manual' = el admin marca como completada                           ║
-- ║        'auto'   = se completa automáticamente al cumplir auto_condition    ║
-- ║  auto_condition es un JSON string, ej:                                     ║
-- ║    {"type":"transfers_count","value":1}                                     ║
-- ║    {"type":"purchases_count","value":3}                                     ║
-- ║    {"type":"balance_reach","value":1000}                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🎯',
    description TEXT,
    reward INTEGER NOT NULL,
    type TEXT DEFAULT 'manual' CHECK(type IN ('manual', 'auto')),
    auto_condition TEXT,
    image_data TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── PROGRESO DE MISIONES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mission_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'claimed')),
    completed_at DATETIME,
    claimed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (mission_id) REFERENCES missions(id),
    UNIQUE(user_id, mission_id)
);

-- ── ÍNDICES ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);

-- ── DATOS INICIALES DE TIENDA ───────────────────────────────────────────────────
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  Modifica estos valores para personalizar la tienda inicial                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
INSERT OR IGNORE INTO store_items (id, name, emoji, price, description, stock) VALUES
    (1, 'Sticker Pack',       '🎨', 50,  'Pack de stickers exclusivos',         -1),
    (2, 'Avatar Premium',     '⭐', 150, 'Desbloquea avatares especiales',      -1),
    (3, 'Badge Dorado',       '🏅', 100, 'Badge dorado para tu perfil',         -1),
    (4, 'Tema Oscuro',        '🌙', 75,  'Tema oscuro premium',                 -1),
    (5, 'Cofre Misterioso',   '📦', 200, 'Contenido sorpresa garantizado',      10),
    (6, 'Título VIP',         '👑', 500, 'Título VIP en tu perfil',              5),
    (7, 'Marco Especial',     '🖼️', 80,  'Marco especial para avatar',          -1),
    (8, 'Emoji Personalizado','✨', 120, 'Emoji único para tu nombre',          -1);

-- ── MISIONES INICIALES ──────────────────────────────────────────────────────────
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  Modifica estos valores para personalizar las misiones iniciales           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
INSERT OR IGNORE INTO missions (id, name, emoji, description, reward, type, auto_condition) VALUES
    (1, 'Primera Transferencia',  '💸', 'Realiza tu primera transferencia',       25,  'auto', '{"type":"transfers_count","value":1}'),
    (2, 'Comprador Novato',       '🛍️', 'Compra algo en la tienda',              30,  'auto', '{"type":"purchases_count","value":1}'),
    (3, 'Ahorrista',              '🏦', 'Alcanza un saldo de 1000 OC',            50,  'auto', '{"type":"balance_reach","value":1000}'),
    (4, 'Conector Social',        '🤝', 'Transfiere a 2 usuarios distintos',      20,  'auto', '{"type":"unique_transfers","value":2}'),
    (5, 'Gran Comprador',         '🎁', 'Compra 3 items en la tienda',            75,  'auto', '{"type":"purchases_count","value":3}'),
    (6, 'Millonario',             '💰', 'Alcanza un saldo de 2000 OC',           100,  'auto', '{"type":"balance_reach","value":2000}');
