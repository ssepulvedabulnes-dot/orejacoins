// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — User Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/make-admin — Fuerza a un usuario a ser admin ──────────────
router.get('/make-admin', authMiddleware, (req, res) => {
    const db = getDB();
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(req.user.id);
    res.json({ message: '¡Ahora eres admin! Por favor, cierra sesión y vuelve a entrar para ver los cambios.' });
});

// ── GET /api/users/me — Mi perfil ───────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
    const db = getDB();
    const user = db.prepare(
        'SELECT id, username, display_name, avatar, balance, is_admin, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Get stats
    const transfersSent = db.prepare(
        "SELECT COUNT(*) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
    ).get(req.user.id).count;

    const transfersReceived = db.prepare(
        "SELECT COUNT(*) as count FROM transactions WHERE to_user_id = ? AND type = 'transfer'"
    ).get(req.user.id).count;

    const purchases = db.prepare(
        'SELECT COUNT(*) as count FROM user_purchases WHERE user_id = ?'
    ).get(req.user.id).count;

    const missionsCompleted = db.prepare(
        "SELECT COUNT(*) as count FROM user_missions WHERE user_id = ? AND status IN ('completed', 'claimed')"
    ).get(req.user.id).count;

    const uniqueTransferRecipients = db.prepare(
        "SELECT COUNT(DISTINCT to_user_id) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
    ).get(req.user.id).count;

    res.json({
        ...user,
        stats: {
            transfers_sent: transfersSent,
            transfers_received: transfersReceived,
            purchases,
            missions_completed: missionsCompleted,
            unique_recipients: uniqueTransferRecipients
        }
    });
});

// ── GET /api/users — Listar usuarios (para transferencias) ──────────────────
router.get('/', authMiddleware, (req, res) => {
    const db = getDB();
    const users = db.prepare(
        'SELECT id, username, display_name, avatar, balance FROM users WHERE id != ?'
    ).all(req.user.id);

    res.json(users);
});

// ── GET /api/users/all — Admin: listar todos ────────────────────────────────
router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
    const db = getDB();
    const users = db.prepare(
        'SELECT id, username, display_name, avatar, balance, is_admin, created_at FROM users'
    ).all();

    res.json(users);
});

// ── POST /api/users/:id/grant — Admin: otorgar OrejaCoins ──────────────────
router.post('/:id/grant', authMiddleware, adminMiddleware, (req, res) => {
    const { amount, note } = req.body;
    const targetId = parseInt(req.params.id);

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Monto inválido' });
    }

    const db = getDB();
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);

    if (!target) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const grant = db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, targetId);

        db.prepare(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)'
        ).run(null, targetId, amount, 'admin_grant', note || 'Otorgado por admin');

        return db.prepare('SELECT id, username, display_name, avatar, balance FROM users WHERE id = ?').get(targetId);
    });

    const updatedUser = grant();
    res.json({ message: `+${amount} OC otorgados a ${target.display_name}`, user: updatedUser });
});

module.exports = router;
