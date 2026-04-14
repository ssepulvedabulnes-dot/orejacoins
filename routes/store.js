// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Store Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const { getDB } = require('../database/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { checkAutoMissions } = require('./transfers');

const router = express.Router();

// ── GET /api/store — Listar items de la tienda ──────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    const db = getDB();

    const items = await db.all('SELECT * FROM store_items WHERE is_active = 1 ORDER BY price ASC');

    // Get user's purchases
    const userPurchases = await db.all('SELECT item_id, COUNT(*) as qty FROM user_purchases WHERE user_id = ? GROUP BY item_id', req.user.id);

    const purchaseMap = {};
    userPurchases.forEach(p => { purchaseMap[p.item_id] = p.qty; });

    const enrichedItems = items.map(item => ({
        ...item,
        owned: !!purchaseMap[item.id],
        owned_qty: purchaseMap[item.id] || 0,
        available: item.stock === -1 || item.stock > 0
    }));

    res.json(enrichedItems);
});

// ── POST /api/store/buy/:id — Comprar item ──────────────────────────────────
router.post('/buy/:id', authMiddleware, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const db = getDB();

    const purchase = async () => { return await db.transaction(async (tx) => {
        const item = await db.get('SELECT * FROM store_items WHERE id = ? AND is_active = 1', itemId);
        if (!item) throw new Error('Item no encontrado');

        const user = await tx.get('SELECT * FROM users WHERE id = ?', req.user.id);
        if (user.balance < item.price) throw new Error('Saldo insuficiente');

        // Check if already owned (for unique items)
        const alreadyOwned = await db.get('SELECT * FROM user_purchases WHERE user_id = ? AND item_id = ?', req.user.id, itemId);
        if (alreadyOwned) throw new Error('Ya tienes este item');

        // Check stock
        if (item.stock !== -1 && item.stock <= 0) throw new Error('Item agotado');

        // Deduct balance
        await tx.run('UPDATE users SET balance = balance - ? WHERE id = ?', item.price, req.user.id);

        // Reduce stock if not unlimited
        if (item.stock !== -1) {
            await tx.run('UPDATE store_items SET stock = stock - 1 WHERE id = ?', itemId);
        }

        // Record purchase
        await tx.run('INSERT INTO user_purchases (user_id, item_id) VALUES (?, ?)', req.user.id, itemId);

        // Record transaction
        await tx.run(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, note) VALUES (?, ?, ?, ?, ?)', req.user.id, null, item.price, 'purchase', `Compra: ${item.name}`);

        return { item, newBalance: user.balance - item.price };
    }); };

    try {
        const result = await purchase();
        await await checkAutoMissions(db, req.user.id);
        res.json({
            message: `🎉 ¡${result.item.name} comprado!`,
            new_balance: result.newBalance
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── POST /api/store/items — Admin: crear item ──────────────────────────────
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  ADMIN: Usa esta ruta para añadir nuevos items a la tienda               ║
// ║  Body: { name, emoji, price, description, stock }                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
router.post('/items', authMiddleware, adminMiddleware, async (req, res) => {
    const { name, emoji, price, description, stock } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'name y price son requeridos' });
    }

    const db = getDB();
    const result = await db.run('INSERT INTO store_items (name, emoji, price, description, stock) VALUES (?, ?, ?, ?, ?)', name, emoji || '📦', price, description || '', stock !== undefined ? stock : -1);

    const item = await db.get('SELECT * FROM store_items WHERE id = ?', result.lastInsertRowid);
    res.status(201).json({ message: 'Item creado', item });
});

// ── PUT /api/store/items/:id — Admin: editar item ──────────────────────────
router.put('/items/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { name, emoji, price, description, stock, is_active } = req.body;
    const itemId = parseInt(req.params.id);
    const db = getDB();

    const item = await db.get('SELECT * FROM store_items WHERE id = ?', itemId);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });

    await db.run(`
        UPDATE store_items SET 
            name = COALESCE(?, name),
            emoji = COALESCE(?, emoji),
            price = COALESCE(?, price),
            description = COALESCE(?, description),
            stock = COALESCE(?, stock),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
    `, name, emoji, price, description, stock, is_active, itemId);

    const updated = await db.get('SELECT * FROM store_items WHERE id = ?', itemId);
    res.json({ message: 'Item actualizado', item: updated });
});

// ── DELETE /api/store/items/:id — Admin: eliminar item ─────────────────────
router.delete('/items/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const db = getDB();

    await tx.run('UPDATE store_items SET is_active = 0 WHERE id = ?', itemId);
    res.json({ message: 'Item desactivado' });
});

module.exports = router;
