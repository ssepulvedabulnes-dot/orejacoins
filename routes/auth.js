// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Auth Routes (Register & Login)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../database/db');

const router = express.Router();

// ── REGISTRO ────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { username, password, display_name, avatar } = req.body;

    if (!username || !password || !display_name) {
        return res.status(400).json({ error: 'username, password y display_name son requeridos' });
    }

    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'El username debe tener entre 3 y 20 caracteres' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const db = getDB();

    // Check if username already exists
    const existing = await db.get('SELECT id FROM users WHERE username = ?', username);
    if (existing) {
        return res.status(409).json({ error: 'El username ya está en uso' });
    }

    // First user becomes admin automatically
    const userCount = ((await db.get('SELECT COUNT(*) as count FROM users'))).count;
    const isAdmin = userCount === 0 ? 1 : 0;

    const passwordHash = bcrypt.hashSync(password, 10);
    const initialBalance = parseInt(process.env.INITIAL_BALANCE) || 500;

    const result = await db.run('INSERT INTO users (username, password_hash, display_name, avatar, balance, is_admin) VALUES (?, ?, ?, ?, ?, ?)', username, passwordHash, display_name, avatar || '🦊', initialBalance, isAdmin);

    const user = await db.get('SELECT id, username, display_name, avatar, balance, is_admin, created_at FROM users WHERE id = ?', result.lastInsertRowid);

    // Generate JWT
    const token = jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin },
        process.env.JWT_SECRET || 'orejacoins_default_secret_2024',
        { expiresIn: '7d' }
    );

    res.status(201).json({
        message: isAdmin ? '¡Cuenta admin creada exitosamente!' : '¡Cuenta creada exitosamente!',
        token,
        user
    });
});

// ── LOGIN ───────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'username y password son requeridos' });
    }

    const db = getDB();
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);

    if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Generate JWT
    const token = jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin },
        process.env.JWT_SECRET || 'orejacoins_default_secret_2024',
        { expiresIn: '7d' }
    );

    // Don't send password hash to client
    const { password_hash, ...safeUser } = user;

    res.json({
        message: '¡Bienvenido de vuelta!',
        token,
        user: safeUser
    });
});

module.exports = router;
