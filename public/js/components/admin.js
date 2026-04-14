// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Admin Panel Component
// ═══════════════════════════════════════════════════════════════════════════════
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PANEL DE ADMINISTRACIÓN                                                  ║
// ║  Desde aquí puedes:                                                      ║
// ║  - Gestionar items de la tienda (crear, editar, eliminar)                ║
// ║  - Gestionar misiones (crear, editar, eliminar)                          ║
// ║  - Otorgar OrejaCoins a usuarios                                         ║
// ║  - Ver todos los usuarios registrados                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const AdminComponent = {
    data: {
        tab: 'store', // 'store', 'missions', 'users'
        storeItems: [],
        missions: [],
        users: [],
        loading: true
    },

    async loadData() {
        try {
            const [storeItems, missions, users] = await Promise.all([
                API.getStoreItems(),
                API.getMissions(),
                API.getAllUsers()
            ]);
            this.data.storeItems = storeItems;
            this.data.missions = missions;
            this.data.users = users;
            this.data.loading = false;
        } catch (err) {
            console.error('Admin load error:', err);
            this.data.loading = false;
        }
    },

    render() {
        if (this.data.loading) {
            return `<div class="page-content"><div class="loading-spinner"><div class="spinner"></div></div></div>`;
        }

        return `
            <div class="page-content">
                <h1 class="page-title">Panel de Administración</h1>
                <p class="page-subtitle">Gestiona la tienda, misiones y usuarios</p>

                <div class="admin-tabs">
                    <button class="admin-tab ${this.data.tab === 'store' ? 'active' : ''}" data-admin-tab="store">🛍️ Tienda</button>
                    <button class="admin-tab ${this.data.tab === 'missions' ? 'active' : ''}" data-admin-tab="missions">🎯 Misiones</button>
                    <button class="admin-tab ${this.data.tab === 'users' ? 'active' : ''}" data-admin-tab="users">👥 Usuarios</button>
                </div>

                ${this.data.tab === 'store' ? this.renderStoreAdmin() : ''}
                ${this.data.tab === 'missions' ? this.renderMissionsAdmin() : ''}
                ${this.data.tab === 'users' ? this.renderUsersAdmin() : ''}
            </div>
        `;
    },

    // ── STORE ADMIN ─────────────────────────────────────────────────────────────
    renderStoreAdmin() {
        return `
            <!-- Add new item form -->
            <div class="card">
                <div class="card-title">Añadir Nuevo Item</div>
                <div class="admin-form">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input class="form-input" type="text" id="admin-item-name" placeholder="Nombre del item">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Emoji</label>
                        <input class="form-input" type="text" id="admin-item-emoji" placeholder="📦" maxlength="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Precio (OC)</label>
                        <input class="form-input" type="number" id="admin-item-price" placeholder="100" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stock (-1 = ilimitado)</label>
                        <input class="form-input" type="number" id="admin-item-stock" placeholder="-1" value="-1">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Descripción</label>
                        <input class="form-input" type="text" id="admin-item-desc" placeholder="Descripción del item">
                    </div>
                    <div class="form-group full-width">
                        <button class="btn-action" id="btn-add-item">Añadir Item +</button>
                    </div>
                </div>
            </div>

            <!-- Existing items -->
            <div class="card">
                <div class="card-title">Items Actuales (${this.data.storeItems.length})</div>
                ${this.data.storeItems.map(item => `
                    <div class="admin-list-item">
                        <span class="emoji">${item.emoji}</span>
                        <div class="info">
                            <div class="name">${item.name}</div>
                            <div class="meta">${item.price} OC · Stock: ${item.stock === -1 ? '∞' : item.stock} · ${item.description}</div>
                        </div>
                        <div class="actions">
                            <button class="btn-danger" data-delete-item="${item.id}">Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ── MISSIONS ADMIN ──────────────────────────────────────────────────────────
    // ╔══════════════════════════════════════════════════════════════════════════╗
    // ║  CREAR MISIONES: Configura las misiones aquí                          ║
    // ║  Tipos de condiciones automáticas:                                    ║
    // ║  - transfers_count: número de transferencias enviadas                 ║
    // ║  - purchases_count: número de compras realizadas                      ║
    // ║  - balance_reach: saldo mínimo alcanzado                              ║
    // ║  - unique_transfers: número de destinatarios únicos                   ║
    // ╚══════════════════════════════════════════════════════════════════════════╝
    renderMissionsAdmin() {
        return `
            <!-- Add new mission form -->
            <div class="card">
                <div class="card-title">Crear Nueva Misión</div>
                <div class="admin-form">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input class="form-input" type="text" id="admin-mission-name" placeholder="Nombre de la misión">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Emoji</label>
                        <input class="form-input" type="text" id="admin-mission-emoji" placeholder="🎯" maxlength="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Recompensa (OC)</label>
                        <input class="form-input" type="number" id="admin-mission-reward" placeholder="50" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo</label>
                        <select class="form-input" id="admin-mission-type">
                            <option value="manual">Manual (admin marca)</option>
                            <option value="auto">Automática (condición)</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Descripción</label>
                        <input class="form-input" type="text" id="admin-mission-desc" placeholder="Descripción de la misión">
                    </div>
                    <div class="form-group" id="auto-condition-group" style="display:none;">
                        <label class="form-label">Condición</label>
                        <select class="form-input" id="admin-mission-condition">
                            <option value="transfers_count">Nº de transferencias</option>
                            <option value="purchases_count">Nº de compras</option>
                            <option value="balance_reach">Saldo mínimo</option>
                            <option value="unique_transfers">Destinatarios únicos</option>
                        </select>
                    </div>
                    <div class="form-group" id="auto-value-group" style="display:none;">
                        <label class="form-label">Valor requerido</label>
                        <input class="form-input" type="number" id="admin-mission-condvalue" placeholder="1" min="1">
                    </div>
                    <div class="form-group full-width">
                        <button class="btn-action" id="btn-add-mission">Crear Misión +</button>
                    </div>
                </div>
            </div>

            <!-- Existing missions -->
            <div class="card">
                <div class="card-title">Misiones Actuales (${this.data.missions.length})</div>
                ${this.data.missions.map(m => `
                    <div class="admin-list-item">
                        <span class="emoji">${m.emoji}</span>
                        <div class="info">
                            <div class="name">${m.name}</div>
                            <div class="meta">${m.reward} OC · ${m.type === 'auto' ? 'Automática' : 'Manual'} · ${m.description}</div>
                        </div>
                        <div class="actions">
                            <button class="btn-danger" data-delete-mission="${m.id}">Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ── USERS ADMIN ─────────────────────────────────────────────────────────────
    renderUsersAdmin() {
        return `
            <div class="card">
                <div class="card-title">Usuarios Registrados (${this.data.users.length})</div>
                <div class="data-table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Username</th>
                                <th>Saldo</th>
                                <th>Rol</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.data.users.map(u => `
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <span class="avatar">${u.avatar}</span>
                                            <span>${u.display_name}</span>
                                        </div>
                                    </td>
                                    <td style="color: var(--muted);">${u.username}</td>
                                    <td>
                                        <span style="color: var(--gold); font-family: var(--font-display); font-weight: 800;">${Utils.formatNumber(u.balance)} OC</span>
                                    </td>
                                    <td>
                                        <span class="status-badge ${u.is_admin ? 'success' : 'pending'}">${u.is_admin ? '⭐ Admin' : 'Usuario'}</span>
                                    </td>
                                    <td>
                                        <button class="btn-secondary" data-grant-user="${u.id}" data-grant-name="${u.display_name}" style="font-size: 10px;">💰 Otorgar OC</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    attachEvents() {
        // Tab switching
        document.querySelectorAll('[data-admin-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.data.tab = btn.dataset.adminTab;
                App.renderPage();
            });
        });

        // Toggle auto condition fields
        document.getElementById('admin-mission-type')?.addEventListener('change', (e) => {
            const isAuto = e.target.value === 'auto';
            document.getElementById('auto-condition-group').style.display = isAuto ? 'block' : 'none';
            document.getElementById('auto-value-group').style.display = isAuto ? 'block' : 'none';
        });

        // Add store item
        document.getElementById('btn-add-item')?.addEventListener('click', async () => {
            const name = document.getElementById('admin-item-name')?.value.trim();
            const emoji = document.getElementById('admin-item-emoji')?.value.trim() || '📦';
            const price = parseInt(document.getElementById('admin-item-price')?.value);
            const stock = parseInt(document.getElementById('admin-item-stock')?.value);
            const description = document.getElementById('admin-item-desc')?.value.trim();

            if (!name || !price) return Utils.showToast('Nombre y precio son requeridos', 'error');

            try {
                await API.createStoreItem({ name, emoji, price, stock: isNaN(stock) ? -1 : stock, description });
                Utils.showToast('🎉 Item creado exitosamente');
                this.data.loading = true;
                await this.loadData();
                App.renderPage();
            } catch (err) {
                Utils.showToast(err.message, 'error');
            }
        });

        // Delete store item
        document.querySelectorAll('[data-delete-item]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.deleteItem);
                Utils.showModal({
                    title: 'Eliminar Item',
                    message: '¿Estás seguro de que quieres desactivar este item de la tienda?',
                    emoji: '🗑️',
                    confirmText: 'Eliminar',
                    onConfirm: async () => {
                        try {
                            await API.deleteStoreItem(id);
                            Utils.showToast('Item eliminado');
                            this.data.loading = true;
                            await this.loadData();
                            App.renderPage();
                        } catch (err) {
                            Utils.showToast(err.message, 'error');
                        }
                    }
                });
            });
        });

        // Add mission
        document.getElementById('btn-add-mission')?.addEventListener('click', async () => {
            const name = document.getElementById('admin-mission-name')?.value.trim();
            const emoji = document.getElementById('admin-mission-emoji')?.value.trim() || '🎯';
            const reward = parseInt(document.getElementById('admin-mission-reward')?.value);
            const type = document.getElementById('admin-mission-type')?.value || 'manual';
            const description = document.getElementById('admin-mission-desc')?.value.trim();

            if (!name || !reward) return Utils.showToast('Nombre y recompensa son requeridos', 'error');

            const mission = { name, emoji, reward, type, description };

            if (type === 'auto') {
                const condType = document.getElementById('admin-mission-condition')?.value;
                const condValue = parseInt(document.getElementById('admin-mission-condvalue')?.value);
                if (!condType || !condValue) return Utils.showToast('Condición automática requerida', 'error');
                mission.auto_condition = { type: condType, value: condValue };
            }

            try {
                await API.createMission(mission);
                Utils.showToast('🎯 Misión creada exitosamente');
                this.data.loading = true;
                await this.loadData();
                App.renderPage();
            } catch (err) {
                Utils.showToast(err.message, 'error');
            }
        });

        // Delete mission
        document.querySelectorAll('[data-delete-mission]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.deleteMission);
                Utils.showModal({
                    title: 'Eliminar Misión',
                    message: '¿Estás seguro de que quieres desactivar esta misión?',
                    emoji: '🗑️',
                    confirmText: 'Eliminar',
                    onConfirm: async () => {
                        try {
                            await API.deleteMission(id);
                            Utils.showToast('Misión eliminada');
                            this.data.loading = true;
                            await this.loadData();
                            App.renderPage();
                        } catch (err) {
                            Utils.showToast(err.message, 'error');
                        }
                    }
                });
            });
        });

        // Grant OC to user
        document.querySelectorAll('[data-grant-user]').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = parseInt(btn.dataset.grantUser);
                const userName = btn.dataset.grantName;

                // Create a custom modal with input
                const backdrop = Utils.createElement(`
                    <div class="modal-backdrop">
                        <div class="modal">
                            <div style="font-size: 48px; margin-bottom: 12px;">💰</div>
                            <h2>Otorgar OrejaCoins</h2>
                            <p>Enviar OrejaCoins a <strong style="color: var(--text);">${userName}</strong></p>
                            <div class="form-group">
                                <label class="form-label">Cantidad</label>
                                <input class="form-input" type="number" id="grant-amount" placeholder="100" min="1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nota</label>
                                <input class="form-input" type="text" id="grant-note" placeholder="Motivo del otorgamiento">
                            </div>
                            <div class="modal-btns">
                                <button class="btn-cancel" id="grant-cancel">Cancelar</button>
                                <button class="btn-confirm" id="grant-confirm">Otorgar</button>
                            </div>
                        </div>
                    </div>
                `);

                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) backdrop.remove();
                });
                backdrop.querySelector('.modal').addEventListener('click', (e) => e.stopPropagation());
                backdrop.querySelector('#grant-cancel').addEventListener('click', () => backdrop.remove());
                backdrop.querySelector('#grant-confirm').addEventListener('click', async () => {
                    const amount = parseInt(document.getElementById('grant-amount')?.value);
                    const note = document.getElementById('grant-note')?.value.trim();
                    if (!amount || amount <= 0) return Utils.showToast('Monto inválido', 'error');

                    try {
                        const result = await API.grantCoins(userId, amount, note);
                        Utils.showToast(result.message);
                        backdrop.remove();
                        this.data.loading = true;
                        await this.loadData();
                        App.renderPage();
                    } catch (err) {
                        Utils.showToast(err.message, 'error');
                    }
                });

                document.body.appendChild(backdrop);
            });
        });
    }
};
