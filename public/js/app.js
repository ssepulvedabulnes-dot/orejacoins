// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Main App (SPA Router & State Manager)
// ═══════════════════════════════════════════════════════════════════════════════

const App = {
    currentUser: null,
    currentRoute: 'dashboard',
    pendingMissions: 0,

    /**
     * Initialize the application
     */
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.render());

        // Initial render
        this.render();
    },

    /**
     * Get current route from URL hash
     */
    getRoute() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        return hash;
    },

    /**
     * Full render — sidebar + header + page
     */
    async render() {
        const app = document.getElementById('app');
        const route = this.getRoute();
        this.currentRoute = route;

        // If not authenticated, show login
        if (!API.isAuthenticated() || route === 'login') {
            if (route !== 'login') {
                window.location.hash = '#login';
            }
            app.innerHTML = LoginComponent.render();
            LoginComponent.attachEvents();
            return;
        }

        // Load user data
        try {
            this.currentUser = await API.getMe();
        } catch (err) {
            // Token invalid
            API.clearAuth();
            window.location.hash = '#login';
            app.innerHTML = LoginComponent.render();
            LoginComponent.attachEvents();
            return;
        }

        // Calculate pending missions
        try {
            const missions = await API.getMissions();
            this.pendingMissions = missions.filter(m => m.user_status === 'completed').length;
        } catch { this.pendingMissions = 0; }

        // Render layout
        app.innerHTML = `
            <div class="app-layout">
                ${SidebarComponent.render(this.currentUser, this.currentRoute, this.pendingMissions)}
                <div class="main-content">
                    ${HeaderComponent.render(this.currentUser)}
                    <div id="page-container"></div>
                </div>
            </div>
        `;

        // Attach layout events
        SidebarComponent.attachEvents();
        HeaderComponent.attachEvents();

        // Render page content
        await this.renderPage();
    },

    /**
     * Render just the page content (without full layout re-render)
     */
    async renderPage() {
        const container = document.getElementById('page-container');
        if (!container) return;

        const route = this.currentRoute;

        switch (route) {
            case 'dashboard':
                DashboardComponent.data.loading = true;
                container.innerHTML = DashboardComponent.render();
                await DashboardComponent.loadData();
                container.innerHTML = DashboardComponent.render();
                DashboardComponent.attachEvents();
                break;

            case 'transfer':
                TransferComponent.data.loading = true;
                container.innerHTML = TransferComponent.render();
                await TransferComponent.loadData();
                container.innerHTML = TransferComponent.render();
                TransferComponent.attachEvents();
                break;

            case 'store':
                StoreComponent.data.loading = true;
                container.innerHTML = StoreComponent.render();
                await StoreComponent.loadData();
                container.innerHTML = StoreComponent.render();
                StoreComponent.attachEvents();
                break;

            case 'missions':
                MissionsComponent.data.loading = true;
                container.innerHTML = MissionsComponent.render();
                await MissionsComponent.loadData();
                container.innerHTML = MissionsComponent.render();
                MissionsComponent.attachEvents();
                break;

            case 'arcade':
                container.innerHTML = ArcadeComponent.render();
                ArcadeComponent.attachEvents();
                break;

            case 'admin':
                if (this.currentUser?.is_admin) {
                    AdminComponent.data.loading = true;
                    container.innerHTML = AdminComponent.render();
                    await AdminComponent.loadData();
                    container.innerHTML = AdminComponent.render();
                    AdminComponent.attachEvents();
                } else {
                    container.innerHTML = `
                        <div class="page-content">
                            <div class="card">
                                <div class="empty-state">
                                    <span class="emoji">🔒</span>
                                    <div class="text">Acceso denegado<br>Se requieren privilegios de admin</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                break;

            default:
                window.location.hash = '#dashboard';
                break;
        }
    }
};

// ── Start the app when DOM is ready ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
