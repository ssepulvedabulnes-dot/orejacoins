const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/submit-score', authMiddleware, async (req, res) => {
    const { gameId, score } = req.body;
    
    if (!gameId || typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: 'Datos de puntuación inválidos' });
    }

    // Calcular recompensa según el juego. 
    // Ajustaremos el factor para que no se hagan millonarios tan rápido.
    let coinsEarned = 0;
    
    switch (gameId) {
        case 'oreja_drop':
            coinsEarned = Math.floor(score / 5); // 1 moneda cada 5 atrapadas
            break;
        case 'oreja_jump':
            coinsEarned = Math.floor(score / 100); // 1 moneda cada 100 metros
            break;
        case 'flappy_oreja':
            coinsEarned = Math.floor(score * 1.5); // 1.5 monedas por cada tubo pasado
            break;
        case 'whack_oreja':
            coinsEarned = Math.floor(score / 3); // 1 moneda cada 3 aciertos
            break;
        case 'oreja_runner':
            coinsEarned = Math.floor(score / 50); // 1 moneda cada 50 metros
            break;
        default:
            return res.status(400).json({ error: 'Juego desconocido' });
    }

    // Limitamos la recompensa máxima por partida para evitar abusos (ej. 100 OC por juego)
    coinsEarned = Math.min(coinsEarned, 200);

    if (coinsEarned > 0) {
        const db = getDB();
        await db.transaction(async (tx) => {
            await tx.run('UPDATE users SET balance = balance + ? WHERE id = ?', coinsEarned, req.user.id);
            await tx.run(
                'INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)',
                null, req.user.id, coinsEarned, 'mission_reward', `Recompensa Minijuego: ${gameId} (Puntaje: ${score})`
            );
        });
    }

    res.json({ 
        message: coinsEarned > 0 ? `¡Ganaste +${coinsEarned} OC!` : '¡Buen intento! Sigue jugando para ganar OC.',
        coinsEarned,
        score
    });
});

module.exports = router;
