// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Header Component
// ═══════════════════════════════════════════════════════════════════════════════

const HeaderComponent = {
    render(user) {
        return `
            <header class="header">
                <div class="header-left">
                    <button class="btn-mobile-menu" id="btn-mobile-menu">☰</button>
                    <div class="header-search">
                        <span class="icon">🔍</span>
                        <input type="text" placeholder="Buscar usuarios, transacciones..." id="header-search-input">
                    </div>
                </div>
                <div class="header-right">
                    <div class="header-balance">
                        <span class="coin">🪙</span>
                        <span class="amount">${Utils.formatNumber(user?.balance)}</span>
                        <span class="unit">OC</span>
                    </div>
                    <div class="header-user" id="header-user-profile">
                        <span class="avatar">${user?.avatar || '🦊'}</span>
                        <div class="info">
                            <div class="name">${user?.display_name || 'Usuario'}</div>
                            <div class="role">${user?.is_admin ? '⭐ Admin' : 'Usuario'}</div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    },

    attachEvents() {
        document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
            SidebarComponent.toggle();
        });
    }
};
