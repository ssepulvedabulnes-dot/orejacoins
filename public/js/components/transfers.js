// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Transfer Component
// ═══════════════════════════════════════════════════════════════════════════════

const TransferComponent = {
    data: {
        users: [],
        user: null,
        selectedUser: null,
        amount: '',
        note: '',
        loading: true,
        recentTransfers: []
    },

    async loadData() {
        try {
            const [users, user, history] = await Promise.all([
                API.getUsers(),
                API.getMe(),
                API.getHistory(5)
            ]);
            this.data.users = users;
            this.data.user = user;
            this.data.recentTransfers = (history.transactions || []).filter(t => t.type === 'transfer');
            this.data.loading = false;
        } catch (err) {
            console.error('Transfer load error:', err);
            this.data.loading = false;
        }
    },

    render() {
        if (this.data.loading) {
            return `<div class="page-content"><div class="loading-spinner"><div class="spinner"></div></div></div>`;
        }

        const u = this.data.user;

        return `
            <div class="page-content">
                <h1 class="page-title">Transferir</h1>
                <p class="page-subtitle">Envía OrejaCoins a otros usuarios de forma instantánea</p>

                <!-- Balance hero -->
                <div class="balance-hero">
                    <div class="balance-label">Saldo disponible</div>
                    <div class="balance-amount">${Utils.formatNumber(u?.balance)}</div>
                    <div class="balance-unit">OrejaCoins</div>
                </div>

                <div class="transfer-layout">
                    <!-- User selection -->
                    <div class="card">
                        <div class="card-title">Selecciona destinatario</div>
                        <div class="user-select-grid">
                            ${this.data.users.length === 0 ? `
                                <div class="empty-state">
                                    <span class="emoji">👥</span>
                                    <div class="text">No hay otros usuarios registrados</div>
                                </div>
                            ` : this.data.users.map(user => `
                                <div class="user-select-card ${this.data.selectedUser === user.id ? 'selected' : ''}" data-user-id="${user.id}">
                                    <span class="av">${user.avatar}</span>
                                    <div>
                                        <div class="nm">${user.display_name}</div>
                                        <div class="bl">${Utils.formatNumber(user.balance)} OC</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Transfer form -->
                    <div>
                        <div class="card">
                            <div class="card-title">Detalles de la transferencia</div>
                            <div class="form-group">
                                <label class="form-label">Monto (OC)</label>
                                <input class="form-input" type="number" id="transfer-amount" placeholder="0" min="1" max="${u?.balance || 0}" value="${this.data.amount}">
                                <div class="form-hint">Disponible: ${Utils.formatNumber(u?.balance)} OC</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nota (opcional)</label>
                                <input class="form-input" type="text" id="transfer-note" placeholder="ej. Te debo del almuerzo" value="${this.data.note}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Imagen (opcional)</label>
                                <input class="form-input" type="file" id="transfer-image" accept="image/*">
                            </div>
                            <button class="btn-action" id="btn-transfer" ${!this.data.selectedUser ? 'disabled' : ''}>
                                Transferir →
                            </button>
                        </div>

                        <!-- Recent transfers -->
                        ${this.data.recentTransfers.length > 0 ? `
                            <div class="card">
                                <div class="card-title">Transferencias recientes</div>
                                <div class="tx-list">
                                    ${this.data.recentTransfers.slice(0, 3).map(tx => {
                                        const isOut = tx.from_id === u.id;
                                        return `
                                            <div class="tx-item">
                                                <div class="tx-icon">${isOut ? '📤' : '📥'}</div>
                                                <div class="tx-info">
                                                    <div class="tx-desc">${isOut ? `→ ${tx.to_name}` : `← ${tx.from_name}`}</div>
                                                    <div class="tx-date">${Utils.formatDate(tx.created_at)}</div>
                                                    ${tx.image_data ? `<img src="${tx.image_data}" style="max-width: 100%; height: 60px; object-fit: cover; border-radius: 4px; margin-top: 4px;">` : ''}
                                                </div>
                                                <div class="tx-amount ${isOut ? 'neg' : 'pos'}">${isOut ? '-' : '+'}${tx.amount} OC</div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        // User selection
        document.querySelectorAll('.user-select-card').forEach(card => {
            card.addEventListener('click', () => {
                this.data.selectedUser = parseInt(card.dataset.userId);
                App.renderPage();
            });
        });

        // Amount input
        document.getElementById('transfer-amount')?.addEventListener('input', (e) => {
            this.data.amount = e.target.value;
        });

        // Note input
        document.getElementById('transfer-note')?.addEventListener('input', (e) => {
            this.data.note = e.target.value;
        });

        document.getElementById('btn-transfer')?.addEventListener('click', async () => {
            const amount = parseInt(this.data.amount);
            if (!this.data.selectedUser) return Utils.showToast('Selecciona un destinatario', 'error');
            if (!amount || amount <= 0) return Utils.showToast('Monto inválido', 'error');
            if (amount > this.data.user.balance) return Utils.showToast('Saldo insuficiente', 'error');

            const fileInput = document.getElementById('transfer-image');
            let image_data = null;
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 5 * 1024 * 1024) return Utils.showToast('La imagen es muy grande (máx 5MB)', 'error');
                image_data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            const targetUser = this.data.users.find(u => u.id === this.data.selectedUser);

            Utils.showModal({
                title: 'Confirmar Transferencia',
                message: `¿Enviar <strong style="color:var(--gold)">${amount} OC</strong> a <strong style="color:var(--text)">${targetUser?.display_name}</strong>?`,
                emoji: '💸',
                confirmText: 'Enviar',
                onConfirm: async () => {
                    try {
                        const result = await API.transfer(this.data.selectedUser, amount, this.data.note, image_data);
                        Utils.showToast(result.message);
                        this.data.amount = '';
                        this.data.note = '';
                        this.data.selectedUser = null;
                        this.data.loading = true;
                        await this.loadData();
                        App.renderPage();
                    } catch (err) {
                        Utils.showToast(err.message, 'error');
                    }
                }
            });
        });
    }
};
