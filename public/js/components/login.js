// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Login Component
// ═══════════════════════════════════════════════════════════════════════════════

const LoginComponent = {
    state: {
        mode: 'login', // 'login' or 'register'
        username: '',
        password: '',
        displayName: '',
        avatar: '🦊',
        error: ''
    },

    avatarOptions: ['🦊', '🐻', '🐯', '🦋', '🐺', '🦁', '🐸', '🐼', '🦄', '🐲', '🦅', '🐙'],

    render() {
        const s = this.state;
        return `
            <div class="login-screen">
                <div class="login-box">
                    <div class="login-logo">
                        <span class="coin">🪙</span>
                        <h1>OrejaCoins</h1>
                        <p>Tu banco de monedas digitales</p>
                    </div>

                    <div class="login-tabs">
                        <button class="login-tab ${s.mode === 'login' ? 'active' : ''}" id="tab-login">Ingresar</button>
                        <button class="login-tab ${s.mode === 'register' ? 'active' : ''}" id="tab-register">Registro</button>
                    </div>

                    ${s.mode === 'login' ? this.renderLogin() : this.renderRegister()}

                    ${s.error ? `<p class="error-msg">${s.error}</p>` : ''}
                </div>
            </div>
        `;
    },

    renderLogin() {
        return `
            <div class="login-field">
                <label>Usuario</label>
                <input type="text" id="login-username" placeholder="Tu nombre de usuario" value="${this.state.username}" autocomplete="username">
            </div>
            <div class="login-field">
                <label>Contraseña</label>
                <input type="password" id="login-password" placeholder="••••••" value="" autocomplete="current-password">
            </div>
            <button class="btn-primary" id="btn-login">Ingresar →</button>
        `;
    },

    renderRegister() {
        return `
            <div class="login-field">
                <label>Nombre de usuario</label>
                <input type="text" id="reg-username" placeholder="ej: carlos123" value="${this.state.username}">
            </div>
            <div class="login-field">
                <label>Nombre para mostrar</label>
                <input type="text" id="reg-displayname" placeholder="ej: Carlos" value="${this.state.displayName}">
            </div>
            <div class="login-field">
                <label>Contraseña</label>
                <input type="password" id="reg-password" placeholder="Mínimo 4 caracteres" value="">
            </div>
            <div class="login-field">
                <label>Avatar</label>
                <div class="avatar-picker">
                    ${this.avatarOptions.map(a => `
                        <span class="avatar-option ${this.state.avatar === a ? 'selected' : ''}" data-avatar="${a}">${a}</span>
                    `).join('')}
                </div>
            </div>
            <button class="btn-primary" id="btn-register">Crear Cuenta →</button>
        `;
    },

    attachEvents() {
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');

        if (tabLogin) {
            tabLogin.addEventListener('click', () => {
                this.state.mode = 'login';
                this.state.error = '';
                App.render();
            });
        }

        if (tabRegister) {
            tabRegister.addEventListener('click', () => {
                this.state.mode = 'register';
                this.state.error = '';
                App.render();
            });
        }

        // Avatar picker
        document.querySelectorAll('.avatar-option').forEach(el => {
            el.addEventListener('click', () => {
                this.state.avatar = el.dataset.avatar;
                App.render();
            });
        });

        // Login
        const btnLogin = document.getElementById('btn-login');
        if (btnLogin) {
            btnLogin.addEventListener('click', () => this.handleLogin());
            document.getElementById('login-password')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        // Register
        const btnRegister = document.getElementById('btn-register');
        if (btnRegister) {
            btnRegister.addEventListener('click', () => this.handleRegister());
            document.getElementById('reg-password')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleRegister();
            });
        }
    },

    async handleLogin() {
        const username = document.getElementById('login-username')?.value.trim();
        const password = document.getElementById('login-password')?.value;

        if (!username || !password) {
            this.state.error = 'Completa todos los campos';
            App.render();
            return;
        }

        try {
            await API.login(username, password);
            this.state.error = '';
            window.location.hash = '#dashboard';
            App.render();
        } catch (err) {
            this.state.error = err.message;
            App.render();
        }
    },

    async handleRegister() {
        const username = document.getElementById('reg-username')?.value.trim();
        const displayName = document.getElementById('reg-displayname')?.value.trim();
        const password = document.getElementById('reg-password')?.value;

        if (!username || !displayName || !password) {
            this.state.error = 'Completa todos los campos';
            App.render();
            return;
        }

        try {
            await API.register(username, password, displayName, this.state.avatar);
            this.state.error = '';
            window.location.hash = '#dashboard';
            App.render();
        } catch (err) {
            this.state.error = err.message;
            App.render();
        }
    }
};
