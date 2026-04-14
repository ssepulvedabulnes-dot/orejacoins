// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Sidebar Component
// ═══════════════════════════════════════════════════════════════════════════════

const SidebarComponent = {
    isOpen: false,

    render(user, currentRoute, pendingMissions = 0) {
        const navItems = [
            { key: 'dashboard', label: 'Dashboard', icon: '📊' },
            { key: 'transfer',  label: 'Transferir', icon: '💸' },
            { key: 'store',     label: 'Tienda',     icon: '🛍️' },
            { key: 'missions',  label: 'Misiones',   icon: '🎯', badge: pendingMissions },
        ];

        const adminItems = user?.is_admin ? [
            { key: 'admin', label: 'Panel Admin', icon: '⚙️' }
        ] : [];

        return `
            <div class="sidebar-overlay ${this.isOpen ? 'show' : ''}" id="sidebar-overlay"></div>
            <aside class="sidebar ${this.isOpen ? 'open' : ''}" id="sidebar">
                <div class="sidebar-logo">
                    <span class="coin-icon">🪙</span>
                    <h1>OrejaCoins</h1>
                    <span class="version">v1.0</span>
                </div>

                <nav class="sidebar-nav">
                    <span class="sidebar-section-label">Menú Principal</span>
                    ${navItems.map(item => `
                        <button class="nav-item ${currentRoute === item.key ? 'active' : ''}" data-route="${item.key}">
                            <span class="icon">${item.icon}</span>
                            ${item.label}
                            ${item.badge ? `<span class="badge">${item.badge}</span>` : ''}
                        </button>
                    `).join('')}

                    ${adminItems.length > 0 ? `
                        <span class="sidebar-section-label">Administración</span>
                        ${adminItems.map(item => `
                            <button class="nav-item ${currentRoute === item.key ? 'active' : ''}" data-route="${item.key}">
                                <span class="icon">${item.icon}</span>
                                ${item.label}
                            </button>
                        `).join('')}
                    ` : ''}
                </nav>

                <div class="sidebar-footer">
                    <div class="sidebar-user-card">
                        <span class="avatar">${user?.avatar || '🦊'}</span>
                        <div class="info">
                            <div class="name">${user?.display_name || 'Usuario'}</div>
                            <div class="balance">${Utils.formatNumber(user?.balance)} OC</div>
                        </div>
                        <button class="btn-logout" id="btn-sidebar-logout" title="Cerrar sesión">⏻</button>
                    </div>
                </div>
            </aside>
        `;
    },

    attachEvents() {
        // Navigation
        document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
            btn.addEventListener('click', () => {
                const route = btn.dataset.route;
                window.location.hash = `#${route}`;
                this.isOpen = false;
                App.render();
            });
        });

        // Logout
        document.getElementById('btn-sidebar-logout')?.addEventListener('click', () => {
            Utils.showModal({
                title: 'Cerrar Sesión',
                message: '¿Estás seguro de que quieres salir?',
                emoji: '👋',
                confirmText: 'Salir',
                onConfirm: () => {
                    API.logout();
                    window.location.hash = '#login';
                    App.render();
                }
            });
        });

        // Overlay click closes sidebar on mobile
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
            this.isOpen = false;
            App.render();
        });
    },

    toggle() {
        this.isOpen = !this.isOpen;
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.toggle('open', this.isOpen);
        if (overlay) overlay.classList.toggle('show', this.isOpen);
    }
};
