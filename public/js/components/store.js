// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Store Component
// ═══════════════════════════════════════════════════════════════════════════════

const StoreComponent = {
    data: {
        items: [],
        user: null,
        loading: true
    },

    async loadData() {
        try {
            const [items, user] = await Promise.all([
                API.getStoreItems(),
                API.getMe()
            ]);
            this.data.items = items;
            this.data.user = user;
            this.data.loading = false;
        } catch (err) {
            console.error('Store load error:', err);
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
                <div class="store-header">
                    <div>
                        <h1 class="page-title">Tienda</h1>
                        <p class="page-subtitle">Gasta tus OrejaCoins en cosas cool</p>
                    </div>
                    <div class="store-balance">
                        <div class="label">Tu Saldo</div>
                        <div class="value">${Utils.formatNumber(u?.balance)} OC</div>
                    </div>
                </div>

                ${this.data.items.length === 0 ? `
                    <div class="card">
                        <div class="empty-state">
                            <span class="emoji">🏪</span>
                            <div class="text">La tienda está vacía por ahora<br>¡Vuelve pronto!</div>
                        </div>
                    </div>
                ` : `
                    <div class="store-grid">
                        ${this.data.items.map(item => {
                            const canBuy = u.balance >= item.price && !item.owned && item.available;
                            return `
                                <div class="store-item ${item.owned ? 'owned' : ''}">
                                    <span class="emoji">${item.emoji}</span>
                                    <div class="name">${item.name}</div>
                                    <div class="desc">${item.description}</div>
                                    ${item.stock !== -1 ? `<div class="stock">Stock: ${item.stock} restantes</div>` : ''}
                                    <div class="price-row">
                                        <div class="price">${item.price} <span class="unit">OC</span></div>
                                        ${item.owned ? `
                                            <span class="btn-owned">✓ Tuyo</span>
                                        ` : `
                                            <button class="btn-buy" ${!canBuy ? 'disabled' : ''} data-item-id="${item.id}">
                                                ${u.balance < item.price ? 'Sin fondos' : !item.available ? 'Agotado' : 'Comprar'}
                                            </button>
                                        `}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;
    },

    attachEvents() {
        document.querySelectorAll('.btn-buy:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.dataset.itemId);
                const item = this.data.items.find(i => i.id === itemId);
                if (!item) return;

                Utils.showModal({
                    title: 'Confirmar Compra',
                    message: `¿Comprar <strong style="color:var(--text)">${item.name}</strong> por <strong style="color:var(--gold)">${item.price} OC</strong>?`,
                    emoji: item.emoji,
                    confirmText: 'Comprar',
                    onConfirm: async () => {
                        try {
                            const result = await API.buyItem(itemId);
                            Utils.showToast(result.message);
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
    }
};
