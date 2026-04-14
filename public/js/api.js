// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — API Client
// ═══════════════════════════════════════════════════════════════════════════════

const API = {
    BASE_URL: '/api',

    /**
     * Get stored JWT token
     */
    getToken() {
        return localStorage.getItem('oc_token');
    },

    /**
     * Set JWT token
     */
    setToken(token) {
        localStorage.setItem('oc_token', token);
    },

    /**
     * Clear stored auth data
     */
    clearAuth() {
        localStorage.removeItem('oc_token');
        localStorage.removeItem('oc_user');
    },

    /**
     * Get cached user data
     */
    getCachedUser() {
        try {
            return JSON.parse(localStorage.getItem('oc_user'));
        } catch { return null; }
    },

    /**
     * Cache user data locally
     */
    cacheUser(user) {
        localStorage.setItem('oc_user', JSON.stringify(user));
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Make an authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la solicitud');
            }

            return data;
        } catch (err) {
            if (err.message === 'Token inválido o expirado.' || err.message === 'No autorizado. Token no proporcionado.') {
                this.clearAuth();
                window.location.hash = '#login';
                App.render();
            }
            throw err;
        }
    },

    // ── AUTH ─────────────────────────────────────────────────────────────────
    async register(username, password, display_name, avatar) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, display_name, avatar })
        });
        this.setToken(data.token);
        this.cacheUser(data.user);
        return data;
    },

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        this.setToken(data.token);
        this.cacheUser(data.user);
        return data;
    },

    logout() {
        this.clearAuth();
    },

    // ── USERS ────────────────────────────────────────────────────────────────
    async getMe() {
        const data = await this.request('/users/me');
        this.cacheUser(data);
        return data;
    },

    async getUsers() {
        return this.request('/users');
    },

    async getAllUsers() {
        return this.request('/users/all');
    },

    async grantCoins(userId, amount, note) {
        return this.request(`/users/${userId}/grant`, {
            method: 'POST',
            body: JSON.stringify({ amount, note })
        });
    },

    // ── TRANSFERS ────────────────────────────────────────────────────────────
    async transfer(to_user_id, amount, note) {
        return this.request('/transfers', {
            method: 'POST',
            body: JSON.stringify({ to_user_id, amount, note })
        });
    },

    async getHistory(limit = 50, offset = 0) {
        return this.request(`/transfers/history?limit=${limit}&offset=${offset}`);
    },

    async getWeeklyStats() {
        return this.request('/transfers/weekly');
    },

    // ── STORE ────────────────────────────────────────────────────────────────
    async getStoreItems() {
        return this.request('/store');
    },

    async buyItem(itemId) {
        return this.request(`/store/buy/${itemId}`, { method: 'POST' });
    },

    async createStoreItem(item) {
        return this.request('/store/items', {
            method: 'POST',
            body: JSON.stringify(item)
        });
    },

    async updateStoreItem(id, item) {
        return this.request(`/store/items/${id}`, {
            method: 'PUT',
            body: JSON.stringify(item)
        });
    },

    async deleteStoreItem(id) {
        return this.request(`/store/items/${id}`, { method: 'DELETE' });
    },

    // ── MISSIONS ─────────────────────────────────────────────────────────────
    async getMissions() {
        return this.request('/missions');
    },

    async claimMission(missionId) {
        return this.request(`/missions/${missionId}/claim`, { method: 'POST' });
    },

    async createMission(mission) {
        return this.request('/missions', {
            method: 'POST',
            body: JSON.stringify(mission)
        });
    },

    async updateMission(id, mission) {
        return this.request(`/missions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(mission)
        });
    },

    async completeMission(missionId, userId) {
        return this.request(`/missions/${missionId}/complete/${userId}`, { method: 'POST' });
    },

    async deleteMission(id) {
        return this.request(`/missions/${id}`, { method: 'DELETE' });
    }
};
