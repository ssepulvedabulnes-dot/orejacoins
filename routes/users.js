// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — User Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/make-admin?username=X — Fuerza a un usuario a ser admin ────────
router.get('/make-admin', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Debes pasar el ?username=' });
    const db = getDB();
    const result = await db.run('UPDATE users SET is_admin = 1 WHERE username = ?', username);
    if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado. Asegúrate de que el username sea exacto.' });
    res.send(`<h1>¡Éxito!</h1><p>El usuario <b>${username}</b> ahora es Administrador. Por favor vuelve a la app, <b>cierra sesión y vuelve a ingresar</b> para activarlo.</p>`);
});

// ── GET /api/users/me — Mi perfil ───────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
    const db = getDB();
    const user = await db.get('SELECT id, username, display_name, avatar, balance, is_admin, created_at FROM users WHERE id = ?', req.user.id);

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Get stats
    const transfersSent = (await db.get("SELECT COUNT(*) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'", req.user.id)).count;

    const transfersReceived = (await db.get("SELECT COUNT(*) as count FROM transactions WHERE to_user_id = ? AND type = 'transfer'", req.user.id)).count;

    const purchases = (await db.get('SELECT COUNT(*) as count FROM user_purchases WHERE user_id = ?', req.user.id)).count;

    const missionsCompleted = (await db.get("SELECT COUNT(*) as count FROM user_missions WHERE user_id = ? AND status IN ('completed', 'claimed')", req.user.id)).count;

    const uniqueTransferRecipients = (await db.get("SELECT COUNT(DISTINCT to_user_id) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'", req.user.id)).count;

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
router.get('/', authMiddleware, async (req, res) => {
    const db = getDB();
    const users = await db.all('SELECT id, username, display_name, avatar, balance FROM users WHERE id != ?', req.user.id);

    res.json(users);
});

// ── GET /api/users/all — Admin: listar todos ────────────────────────────────
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
    const db = getDB();
    const users = await db.all('SELECT id, username, display_name, avatar, balance, is_admin, created_at FROM users');

    res.json(users);
});

// ── POST /api/users/:id/grant — Admin: otorgar OrejaCoins ──────────────────
router.post('/:id/grant', authMiddleware, adminMiddleware, async (req, res) => {
    const { amount, note } = req.body;
    const targetId = parseInt(req.params.id);

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Monto inválido' });
    }

    const db = getDB();
    const target = await db.get('SELECT * FROM users WHERE id = ?', targetId);

    if (!target) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const grant = async () => { return await db.transaction(async (tx) => {
        await tx.run('UPDATE users SET balance = balance + ? WHERE id = ?', amount, targetId);

        await tx.run(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)', null, targetId, amount, 'admin_grant', note || 'Otorgado por admin');

        return await tx.get('SELECT id, username, display_name, avatar, balance FROM users WHERE id = ?', targetId);
    }); };

    const updatedUser = await grant();
    res.json({ message: `+${amount} OC otorgados a ${target.display_name}`, user: updatedUser });
});

module.exports = router;
