// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Transfer Routes (P2P Transfers)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/transfers — Enviar OrejaCoins ─────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
    const { to_user_id, amount, note, image_data } = req.body;

    if (!to_user_id || !amount) {
        return res.status(400).json({ error: 'to_user_id y amount son requeridos' });
    }

    const parsedAmount = parseInt(amount);
    if (parsedAmount <= 0) {
        return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    if (to_user_id === req.user.id) {
        return res.status(400).json({ error: 'No puedes transferirte a ti mismo' });
    }

    const db = getDB();

    const transfer = db.transaction(() => {
        const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        const receiver = db.prepare('SELECT * FROM users WHERE id = ?').get(to_user_id);

        if (!sender) throw new Error('Remitente no encontrado');
        if (!receiver) throw new Error('Destinatario no encontrado');
        if (sender.balance < parsedAmount) throw new Error('Saldo insuficiente');

        // Deduct from sender
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(parsedAmount, req.user.id);
        // Add to receiver
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(parsedAmount, to_user_id);

        // Record transaction
        const result = db.prepare(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, note, image_data) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(req.user.id, to_user_id, parsedAmount, 'transfer', note || 'Transferencia', image_data || null);

        return {
            transaction_id: result.lastInsertRowid,
            sender: sender.display_name,
            receiver: receiver.display_name,
            amount: parsedAmount
        };
    });

    try {
        const result = transfer();
        // Check auto-missions after transfer
        checkAutoMissions(db, req.user.id);

        res.json({
            message: `✅ ${result.amount} OC enviados a ${result.receiver}`,
            ...result
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── GET /api/transfers/history — My transactions ────────────────────────────
router.get('/history', authMiddleware, (req, res) => {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = db.prepare(`
        SELECT 
            t.id, t.amount, t.type, t.note, t.image_data, t.created_at,
            sender.display_name as from_name, sender.avatar as from_avatar, sender.id as from_id,
            receiver.display_name as to_name, receiver.avatar as to_avatar, receiver.id as to_id
        FROM transactions t
        LEFT JOIN users sender ON t.from_user_id = sender.id
        LEFT JOIN users receiver ON t.to_user_id = receiver.id
        WHERE t.from_user_id = ? OR t.to_user_id = ?
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
    `).all(req.user.id, req.user.id, limit, offset);

    const total = db.prepare(
        'SELECT COUNT(*) as count FROM transactions WHERE from_user_id = ? OR to_user_id = ?'
    ).get(req.user.id, req.user.id).count;

    res.json({ transactions, total, limit, offset });
});

// ── GET /api/transfers/weekly — Weekly activity stats ────────────────────────
router.get('/weekly', authMiddleware, (req, res) => {
    const db = getDB();

    const stats = db.prepare(`
        SELECT 
            strftime('%w', created_at) as day_of_week,
            SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END) as transfers,
            SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as purchases,
            SUM(CASE WHEN type = 'mission_reward' THEN amount ELSE 0 END) as missions
        FROM transactions
        WHERE (from_user_id = ? OR to_user_id = ?)
            AND created_at >= datetime('now', '-7 days')
        GROUP BY day_of_week
        ORDER BY day_of_week
    `).all(req.user.id, req.user.id);

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weeklyData = days.map((name, i) => {
        const dayStats = stats.find(s => parseInt(s.day_of_week) === i);
        return {
            day: name,
            transfers: dayStats ? dayStats.transfers : 0,
            purchases: dayStats ? dayStats.purchases : 0,
            missions: dayStats ? dayStats.missions : 0
        };
    });

    res.json(weeklyData);
});

// ── AUTO MISSION CHECK ──────────────────────────────────────────────────────────
function checkAutoMissions(db, userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return;

    const missions = db.prepare(
        "SELECT * FROM missions WHERE type = 'auto' AND is_active = 1"
    ).all();

    const transfersSent = db.prepare(
        "SELECT COUNT(*) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
    ).get(userId).count;

    const purchasesCount = db.prepare(
        'SELECT COUNT(*) as count FROM user_purchases WHERE user_id = ?'
    ).get(userId).count;

    const uniqueRecipients = db.prepare(
        "SELECT COUNT(DISTINCT to_user_id) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
    ).get(userId).count;

    for (const mission of missions) {
        // Check if already completed/claimed
        const existing = db.prepare(
            'SELECT * FROM user_missions WHERE user_id = ? AND mission_id = ?'
        ).get(userId, mission.id);

        if (existing && (existing.status === 'completed' || existing.status === 'claimed')) continue;

        let conditionMet = false;
        try {
            const condition = JSON.parse(mission.auto_condition);
            switch (condition.type) {
                case 'transfers_count':
                    conditionMet = transfersSent >= condition.value;
                    break;
                case 'purchases_count':
                    conditionMet = purchasesCount >= condition.value;
                    break;
                case 'balance_reach':
                    conditionMet = user.balance >= condition.value;
                    break;
                case 'unique_transfers':
                    conditionMet = uniqueRecipients >= condition.value;
                    break;
            }
        } catch (e) {
            // Invalid condition JSON, skip
        }

        if (conditionMet) {
            if (existing) {
                db.prepare(
                    "UPDATE user_missions SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND mission_id = ?"
                ).run(userId, mission.id);
            } else {
                db.prepare(
                    "INSERT INTO user_missions (user_id, mission_id, status, completed_at) VALUES (?, ?, 'completed', CURRENT_TIMESTAMP)"
                ).run(userId, mission.id);
            }
        }
    }
}

module.exports = router;
module.exports.checkAutoMissions = checkAutoMissions;
