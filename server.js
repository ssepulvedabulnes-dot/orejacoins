// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Express Server
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, closeDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Start Server (async to await DB init) ───────────────────────────────────────
async function start() {
    // Initialize Database (async for sql.js WASM loading)
    await initDB();

    // ── API Routes ──────────────────────────────────────────────────────────────
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/transfers', require('./routes/transfers'));
    app.use('/api/store', require('./routes/store'));
    app.use('/api/missions', require('./routes/missions'));

    // ── Health Check ────────────────────────────────────────────────────────────
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', name: 'OrejaCoins API', version: '1.0.0' });
    });

    // ── SPA Fallback ────────────────────────────────────────────────────────────
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ── Listen ──────────────────────────────────────────────────────────────────
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🪙 ═══════════════════════════════════════════════`);
        console.log(`   OrejaCoins Server running on port ${PORT}`);
        console.log(`   http://localhost:${PORT}`);
        console.log(`🪙 ═══════════════════════════════════════════════\n`);
    });
}

start().catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────────
process.on('SIGINT', () => {
    closeDB();
    process.exit(0);
});

process.on('SIGTERM', () => {
    closeDB();
    process.exit(0);
});
