// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Mission Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/missions — Listar misiones con estado del usuario ──────────────
router.get('/', authMiddleware, (req, res) => {
    const db = getDB();

    const missions = db.prepare('SELECT * FROM missions WHERE is_active = 1 ORDER BY reward ASC').all();

    const userMissions = db.prepare(
        'SELECT mission_id, status, completed_at, claimed_at FROM user_missions WHERE user_id = ?'
    ).all(req.user.id);

    const statusMap = {};
    userMissions.forEach(um => { statusMap[um.mission_id] = um; });

    // Get user stats for auto-mission checking
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const transfersSent = db.prepare(
        "SELECT COUNT(*) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
    ).get(req.user.id).count;
    const purchasesCount = db.prepare(
        'SELECT COUNT(*) as count FROM user_purchases WHERE user_id = ?'
    ).get(req.user.id).count;
    const uniqueRecipients = db.prepare(
        "SELECT COUNT(DISTINCT to_user_id) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
    ).get(req.user.id).count;

    const enrichedMissions = missions.map(mission => {
        const userStatus = statusMap[mission.id];
        let status = userStatus ? userStatus.status : 'pending';

        // Check auto conditions for pending missions
        if (status === 'pending' && mission.type === 'auto' && mission.auto_condition) {
            try {
                const condition = JSON.parse(mission.auto_condition);
                let conditionMet = false;
                switch (condition.type) {
                    case 'transfers_count': conditionMet = transfersSent >= condition.value; break;
                    case 'purchases_count': conditionMet = purchasesCount >= condition.value; break;
                    case 'balance_reach': conditionMet = user.balance >= condition.value; break;
                    case 'unique_transfers': conditionMet = uniqueRecipients >= condition.value; break;
                }
                if (conditionMet) status = 'completed';
            } catch (e) { /* invalid JSON */ }
        }

        return {
            ...mission,
            user_status: status,
            completed_at: userStatus ? userStatus.completed_at : null,
            claimed_at: userStatus ? userStatus.claimed_at : null
        };
    });

    res.json(enrichedMissions);
});

// ── POST /api/missions/:id/claim — Reclamar recompensa de misión ────────────
router.post('/:id/claim', authMiddleware, (req, res) => {
    const missionId = parseInt(req.params.id);
    const db = getDB();

    const claim = db.transaction(() => {
        const mission = db.prepare('SELECT * FROM missions WHERE id = ? AND is_active = 1').get(missionId);
        if (!mission) throw new Error('Misión no encontrada');

        // Check if already claimed
        const existing = db.prepare(
            'SELECT * FROM user_missions WHERE user_id = ? AND mission_id = ?'
        ).get(req.user.id, missionId);

        if (existing && existing.status === 'claimed') {
            throw new Error('Ya reclamaste esta recompensa');
        }

        // For auto missions, verify condition is met
        if (mission.type === 'auto' && mission.auto_condition) {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
            const condition = JSON.parse(mission.auto_condition);
            let conditionMet = false;

            const transfersSent = db.prepare(
                "SELECT COUNT(*) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
            ).get(req.user.id).count;
            const purchasesCount = db.prepare(
                'SELECT COUNT(*) as count FROM user_purchases WHERE user_id = ?'
            ).get(req.user.id).count;
            const uniqueRecipients = db.prepare(
                "SELECT COUNT(DISTINCT to_user_id) as count FROM transactions WHERE from_user_id = ? AND type = 'transfer'"
            ).get(req.user.id).count;

            switch (condition.type) {
                case 'transfers_count': conditionMet = transfersSent >= condition.value; break;
                case 'purchases_count': conditionMet = purchasesCount >= condition.value; break;
                case 'balance_reach': conditionMet = user.balance >= condition.value; break;
                case 'unique_transfers': conditionMet = uniqueRecipients >= condition.value; break;
            }

            if (!conditionMet) throw new Error('Aún no cumples los requisitos');
        }

        // Grant reward
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(mission.reward, req.user.id);

        // Update/create user_mission record
        if (existing) {
            db.prepare(
                "UPDATE user_missions SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND mission_id = ?"
            ).run(req.user.id, missionId);
        } else {
            db.prepare(
                "INSERT INTO user_missions (user_id, mission_id, status, completed_at, claimed_at) VALUES (?, ?, 'claimed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ).run(req.user.id, missionId);
        }

        // Record transaction
        db.prepare(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)'
        ).run(null, req.user.id, mission.reward, 'mission_reward', `Misión: ${mission.name}`);

        const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
        return { mission, newBalance: updatedUser.balance };
    });

    try {
        const result = claim();
        res.json({
            message: `🎯 +${result.mission.reward} OC — ¡Misión completada!`,
            new_balance: result.newBalance
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── POST /api/missions — Admin: crear misión ───────────────────────────────
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  ADMIN: Usa esta ruta para crear nuevas misiones                          ║
// ║  Body: { name, emoji, description, reward, type, auto_condition }        ║
// ║  type: 'manual' o 'auto'                                                 ║
// ║  auto_condition: JSON string, ej: {"type":"transfers_count","value":5}   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { name, emoji, description, reward, type, auto_condition, image_data } = req.body;

    if (!name || !reward) {
        return res.status(400).json({ error: 'name y reward son requeridos' });
    }

    const db = getDB();
    const result = db.prepare(
        'INSERT INTO missions (name, emoji, description, reward, type, auto_condition, image_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, emoji || '🎯', description || '', reward, type || 'manual', auto_condition ? JSON.stringify(auto_condition) : null, image_data || null);

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Misión creada', mission });
});

// ── PUT /api/missions/:id — Admin: editar misión ───────────────────────────
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { name, emoji, description, reward, type, auto_condition, image_data, is_active } = req.body;
    const missionId = parseInt(req.params.id);
    const db = getDB();

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(missionId);
    if (!mission) return res.status(404).json({ error: 'Misión no encontrada' });

    db.prepare(`
        UPDATE missions SET 
            name = COALESCE(?, name),
            emoji = COALESCE(?, emoji),
            description = COALESCE(?, description),
            reward = COALESCE(?, reward),
            type = COALESCE(?, type),
            auto_condition = COALESCE(?, auto_condition),
            image_data = COALESCE(?, image_data),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
    `).run(name, emoji, description, reward, type, auto_condition ? JSON.stringify(auto_condition) : null, image_data || null, is_active, missionId);

    const updated = db.prepare('SELECT * FROM missions WHERE id = ?').get(missionId);
    res.json({ message: 'Misión actualizada', mission: updated });
});

// ── POST /api/missions/:id/complete/:userId — Admin: marcar completada ─────
router.post('/:id/complete/:userId', authMiddleware, adminMiddleware, (req, res) => {
    const missionId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const db = getDB();

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(missionId);
    if (!mission) return res.status(404).json({ error: 'Misión no encontrada' });

    const existing = db.prepare(
        'SELECT * FROM user_missions WHERE user_id = ? AND mission_id = ?'
    ).get(userId, missionId);

    if (existing && (existing.status === 'completed' || existing.status === 'claimed')) {
        return res.status(400).json({ error: 'La misión ya está completada/reclamada' });
    }

    if (existing) {
        db.prepare(
            "UPDATE user_missions SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND mission_id = ?"
        ).run(userId, missionId);
    } else {
        db.prepare(
            "INSERT INTO user_missions (user_id, mission_id, status, completed_at) VALUES (?, ?, 'completed', CURRENT_TIMESTAMP)"
        ).run(userId, missionId);
    }

    res.json({ message: 'Misión marcada como completada' });
});

// ── DELETE /api/missions/:id — Admin: desactivar misión ────────────────────
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const missionId = parseInt(req.params.id);
    const db = getDB();

    db.prepare('UPDATE missions SET is_active = 0 WHERE id = ?').run(missionId);
    res.json({ message: 'Misión desactivada' });
});

module.exports = router;
