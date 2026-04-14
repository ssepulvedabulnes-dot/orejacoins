// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Auth Middleware (JWT Verification)
// ═══════════════════════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');

/**
 * Middleware: Verifies JWT token from Authorization header
 * Attaches user data to req.user
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'orejacoins_default_secret_2024');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
}

/**
 * Middleware: Requires admin privileges
 * Must be used AFTER authMiddleware
 */
function adminMiddleware(req, res, next) {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de admin.' });
    }
    next();
}

module.exports = { authMiddleware, adminMiddleware };
