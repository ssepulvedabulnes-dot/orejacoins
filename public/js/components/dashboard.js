// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Dashboard Component
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardComponent = {
    data: {
        user: null,
        transactions: [],
        weeklyStats: [],
        loading: true
    },

    async loadData() {
        try {
            const [user, history, weekly] = await Promise.all([
                API.getMe(),
                API.getHistory(10),
                API.getWeeklyStats()
            ]);
            this.data.user = user;
            this.data.transactions = history.transactions || [];
            this.data.weeklyStats = weekly || [];
            this.data.loading = false;
        } catch (err) {
            console.error('Dashboard load error:', err);
            this.data.loading = false;
        }
    },

    render() {
        const u = this.data.user;
        if (this.data.loading || !u) {
            return `<div class="page-content"><div class="loading-spinner"><div class="spinner"></div></div></div>`;
        }

        const stats = u.stats || {};
        const totalSpent = this.data.transactions
            .filter(t => t.from_id === u.id)
            .reduce((sum, t) => sum + t.amount, 0);
        const totalReceived = this.data.transactions
            .filter(t => t.to_id === u.id)
            .reduce((sum, t) => sum + t.amount, 0);

        return `
            <div class="page-content">
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Bienvenido de vuelta, ${u.display_name} 👋</p>

                <!-- STAT CARDS (like PNG reference) -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon-float gold">🪙</div>
                        <div class="stat-icon gold">💰</div>
                        <div class="stat-value">${Utils.formatNumber(u.balance)}</div>
                        <div class="stat-label">Saldo Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-float green">↗</div>
                        <div class="stat-icon green">💸</div>
                        <div class="stat-value">${stats.transfers_sent || 0}</div>
                        <div class="stat-label">Transferencias</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-float blue">🛒</div>
                        <div class="stat-icon blue">🛍️</div>
                        <div class="stat-value">${stats.purchases || 0}</div>
                        <div class="stat-label">Compras</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-float purple">★</div>
                        <div class="stat-icon purple">🎯</div>
                        <div class="stat-value">${stats.missions_completed || 0}</div>
                        <div class="stat-label">Misiones</div>
                    </div>
                </div>

                <!-- CHARTS ROW (like PNG reference) -->
                <div class="charts-grid">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Actividad Semanal</span>
                            <button class="card-action">Esta semana</button>
                        </div>
                        <div class="chart-container" id="weekly-chart-container">
                            <canvas id="weekly-chart"></canvas>
                        </div>
                        <div class="chart-legend">
                            <div class="chart-legend-item">
                                <span class="chart-legend-dot" style="background: #F5C518;"></span>
                                Transferencias
                            </div>
                            <div class="chart-legend-item">
                                <span class="chart-legend-dot" style="background: #A78BFA;"></span>
                                Compras
                            </div>
                            <div class="chart-legend-item">
                                <span class="chart-legend-dot" style="background: #4ADE80;"></span>
                                Misiones
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Distribución</span>
                        </div>
                        <div style="display: flex; justify-content: center;">
                            <canvas id="donut-chart"></canvas>
                        </div>
                        <div class="donut-center">
                            <div class="value">${Utils.formatNumber(u.balance)}</div>
                            <div class="label">OrejaCoins</div>
                        </div>
                        <div class="chart-legend" style="justify-content: center;">
                            <div class="chart-legend-item">
                                <span class="chart-legend-dot" style="background: #F5C518;"></span>
                                Transferencias
                                <span class="chart-legend-value">${stats.transfers_sent || 0}</span>
                            </div>
                            <div class="chart-legend-item">
                                <span class="chart-legend-dot" style="background: #A78BFA;"></span>
                                Compras
                                <span class="chart-legend-value">${stats.purchases || 0}</span>
                            </div>
                            <div class="chart-legend-item">
                                <span class="chart-legend-dot" style="background: #4ADE80;"></span>
                                Misiones
                                <span class="chart-legend-value">${stats.missions_completed || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TRANSACTIONS TABLE (like PNG reference) -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Últimas Transacciones</span>
                        <button class="card-action" id="btn-view-all-tx">Ver todas →</button>
                    </div>
                    ${this.renderTransactions()}
                </div>
            </div>
        `;
    },

    renderTransactions() {
        const txs = this.data.transactions;
        const userId = this.data.user?.id;

        if (!txs || txs.length === 0) {
            return `
                <div class="empty-state">
                    <span class="emoji">🌱</span>
                    <div class="text">Aún no hay transacciones<br>¡Haz tu primera transferencia!</div>
                </div>
            `;
        }

        return `
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${txs.slice(0, 8).map(tx => {
                            const isIncome = (tx.to_id === userId && tx.type !== 'purchase') || tx.type === 'mission_reward' || tx.type === 'admin_grant';
                            const icon = tx.type === 'transfer' ? '💸' : tx.type === 'purchase' ? '🛍️' : tx.type === 'mission_reward' ? '🎯' : '👑';

                            return `
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <span class="avatar">${icon}</span>
                                            <span>${tx.type === 'transfer' ? 'Transferencia' : tx.type === 'purchase' ? 'Compra' : tx.type === 'mission_reward' ? 'Misión' : 'Admin'}</span>
                                        </div>
                                    </td>
                                    <td>${tx.note || '-'}</td>
                                    <td style="color: var(--muted); font-size: 11px;">${Utils.formatDate(tx.created_at)}</td>
                                    <td>
                                        <span class="tx-amount ${isIncome ? 'pos' : 'neg'}">${isIncome ? '+' : '-'}${tx.amount} OC</span>
                                    </td>
                                    <td>
                                        <span class="status-badge success">✓ Completada</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    drawCharts() {
        // Bar chart
        const barCanvas = document.getElementById('weekly-chart');
        if (barCanvas && this.data.weeklyStats.length > 0) {
            const barData = this.data.weeklyStats.map(day => ({
                label: day.day,
                values: [
                    { value: day.transfers, color: '#F5C518' },
                    { value: day.purchases, color: '#A78BFA' },
                    { value: day.missions, color: '#4ADE80' }
                ]
            }));
            Charts.drawBarChart(barCanvas, barData);
        } else if (barCanvas) {
            // Draw empty chart with sample data
            const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const barData = days.map(day => ({
                label: day,
                values: [
                    { value: Math.random() * 50, color: '#F5C518' },
                    { value: Math.random() * 30, color: '#A78BFA' },
                    { value: Math.random() * 20, color: '#4ADE80' }
                ]
            }));
            Charts.drawBarChart(barCanvas, barData);
        }

        // Donut chart
        const donutCanvas = document.getElementById('donut-chart');
        if (donutCanvas) {
            const stats = this.data.user?.stats || {};
            Charts.drawDonutChart(donutCanvas, [
                { value: Math.max(stats.transfers_sent || 1, 1), color: '#F5C518', label: 'Transferencias' },
                { value: Math.max(stats.purchases || 1, 1), color: '#A78BFA', label: 'Compras' },
                { value: Math.max(stats.missions_completed || 1, 1), color: '#4ADE80', label: 'Misiones' }
            ], {
                centerText: Utils.formatNumber(this.data.user?.balance),
                centerLabel: 'OC'
            });
        }
    },

    attachEvents() {
        // Draw charts after DOM is ready
        requestAnimationFrame(() => {
            this.drawCharts();
        });

        document.getElementById('btn-view-all-tx')?.addEventListener('click', () => {
            // Could navigate to a full transaction history page
        });
    }
};
