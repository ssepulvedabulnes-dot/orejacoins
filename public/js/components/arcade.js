// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Arcade Component (Minigame Hub)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('🎮 ArcadeComponent Loaded');

const ArcadeComponent = {
    data: {
        loading: false,
        activeGame: null,
        lastReward: null,
    },

    games: [
        {
            id: 'oreja_jump',
            name: 'Oreja Jump',
            icon: '🚀',
            description: 'Salta de plataforma en plataforma lo más alto posible',
            color: 'blue',
            reward: '1 OC cada 100m',
        },
        {
            id: 'oreja_drop',
            name: 'Oreja Drop',
            icon: '🍔',
            description: 'Atrapa la comida que cae del cielo con tu oreja',
            color: 'green',
            reward: '1 OC cada 5 items',
        },
        {
            id: 'flappy_oreja',
            name: 'Flappy Oreja',
            icon: '🐦',
            description: 'Vuela entre los tubos sin chocar',
            color: 'gold',
            reward: '1.5 OC por tubo',
        },
        {
            id: 'whack_oreja',
            name: 'Whack-a-Oreja',
            icon: '🔨',
            description: 'Golpea las orejas que aparecen antes de que desaparezcan',
            color: 'purple',
            reward: '1 OC cada 3 hits',
        },
        {
            id: 'oreja_runner',
            name: 'Oreja Runner',
            icon: '🏃',
            description: 'Corre y esquiva obstáculos el mayor tiempo posible',
            color: 'orange',
            reward: '1 OC cada 50m',
        },
    ],

    render() {
        if (this.data.activeGame) {
            return this.renderGameScreen();
        }
        return this.renderMenu();
    },

    renderMenu() {
        return `
            <div class="page-content">
                <h1 class="page-title">🎮 Arcade</h1>
                <p class="page-subtitle">Juega minijuegos y gana OrejaCoins como recompensa</p>

                ${this.data.lastReward ? `
                    <div class="arcade-reward-banner" id="arcade-reward-banner">
                        <span class="emoji">🎉</span>
                        <div class="reward-info">
                            <strong>${this.data.lastReward.message}</strong>
                            <span class="score-detail">Puntaje: ${this.data.lastReward.score}</span>
                        </div>
                        <button class="reward-dismiss" id="btn-dismiss-reward">✕</button>
                    </div>
                ` : ''}

                <div class="arcade-grid">
                    ${this.games.map(game => `
                        <div class="arcade-card" data-game="${game.id}">
                            <div class="arcade-card-glow ${game.color}"></div>
                            <div class="arcade-card-icon ${game.color}">
                                <span>${game.icon}</span>
                            </div>
                            <h3 class="arcade-card-title">${game.name}</h3>
                            <p class="arcade-card-desc">${game.description}</p>
                            <div class="arcade-card-reward">
                                <span class="coin-mini">🪙</span> ${game.reward}
                            </div>
                            <button class="arcade-play-btn" data-game="${game.id}">
                                <span>▶</span> Jugar
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderGameScreen() {
        const game = this.games.find(g => g.id === this.data.activeGame);
        return `
            <div class="arcade-game-screen">
                <div class="arcade-game-header">
                    <button class="arcade-back-btn" id="btn-arcade-back">
                        ← Volver al Arcade
                    </button>
                    <div class="arcade-game-info">
                        <span class="game-name">${game.icon} ${game.name}</span>
                        <span class="game-score" id="game-score-display">Puntaje: 0</span>
                    </div>
                </div>
                <div class="arcade-canvas-wrapper" id="arcade-canvas-wrapper">
                    <canvas id="game-canvas" width="400" height="600"></canvas>
                    <div class="game-overlay" id="game-overlay">
                        <div class="game-overlay-content">
                            <img src="/images/oreja.png" class="game-overlay-oreja" alt="Oreja">
                            <h2>${game.name}</h2>
                            <p>${game.description}</p>
                            <button class="arcade-start-btn" id="btn-start-game">
                                ▶ Iniciar Juego
                            </button>
                            <p class="game-controls-hint" id="game-controls-hint"></p>
                        </div>
                    </div>
                    <div class="game-over-overlay" id="game-over-overlay" style="display:none;">
                        <div class="game-over-content">
                            <h2>¡Juego Terminado!</h2>
                            <div class="game-over-score" id="game-over-score">0</div>
                            <div class="game-over-reward" id="game-over-reward"></div>
                            <div class="game-over-buttons">
                                <button class="arcade-start-btn" id="btn-retry-game">🔄 Reintentar</button>
                                <button class="arcade-back-btn2" id="btn-back-menu">← Menú</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        if (this.data.activeGame) {
            this.attachGameEvents();
            return;
        }

        // Game card clicks
        document.querySelectorAll('.arcade-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.launchGame(btn.dataset.game);
            });
        });

        document.querySelectorAll('.arcade-card').forEach(card => {
            card.addEventListener('click', () => {
                this.launchGame(card.dataset.game);
            });
        });

        // Dismiss reward banner
        document.getElementById('btn-dismiss-reward')?.addEventListener('click', () => {
            this.data.lastReward = null;
            document.getElementById('arcade-reward-banner')?.remove();
        });
    },

    attachGameEvents() {
        // Back button
        document.getElementById('btn-arcade-back')?.addEventListener('click', () => {
            this.exitGame();
        });

        // Start game
        document.getElementById('btn-start-game')?.addEventListener('click', () => {
            this.startActiveGame();
        });

        // Retry
        document.getElementById('btn-retry-game')?.addEventListener('click', () => {
            document.getElementById('game-over-overlay').style.display = 'none';
            this.startActiveGame();
        });

        // Back to menu from game over
        document.getElementById('btn-back-menu')?.addEventListener('click', () => {
            this.exitGame();
        });

        // Set control hints
        const hint = document.getElementById('game-controls-hint');
        if (hint) {
            const isMobile = 'ontouchstart' in window;
            switch (this.data.activeGame) {
                case 'oreja_jump':
                    hint.textContent = isMobile ? 'Toca izquierda/derecha para moverte' : 'Usa ← → para moverte';
                    break;
                case 'oreja_drop':
                    hint.textContent = isMobile ? 'Toca izquierda/derecha para moverte' : 'Usa ← → para mover la oreja';
                    break;
                case 'flappy_oreja':
                    hint.textContent = isMobile ? 'Toca la pantalla para volar' : 'Presiona ESPACIO para volar';
                    break;
                case 'whack_oreja':
                    hint.textContent = isMobile ? 'Toca las orejas que aparezcan' : 'Haz clic en las orejas que aparezcan';
                    break;
                case 'oreja_runner':
                    hint.textContent = isMobile ? 'Toca para saltar' : 'Presiona ESPACIO para saltar';
                    break;
            }
        }
    },

    launchGame(gameId) {
        this.data.activeGame = gameId;
        const container = document.getElementById('page-container');
        if (container) {
            container.innerHTML = this.renderGameScreen();
            this.attachGameEvents();
        }
    },

    exitGame() {
        // Clean up any running game
        if (this._gameCleanup) {
            this._gameCleanup();
            this._gameCleanup = null;
        }
        this.data.activeGame = null;
        const container = document.getElementById('page-container');
        if (container) {
            container.innerHTML = this.renderMenu();
            this.attachEvents();
        }
    },

    startActiveGame() {
        const overlay = document.getElementById('game-overlay');
        if (overlay) overlay.style.display = 'none';

        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        // Clean up previous game
        if (this._gameCleanup) {
            this._gameCleanup();
            this._gameCleanup = null;
        }

        switch (this.data.activeGame) {
            case 'oreja_jump':
                this._gameCleanup = ArcadeGames.orejaJump(canvas, (score) => this.onGameOver(score));
                break;
            case 'oreja_drop':
                this._gameCleanup = ArcadeGames.orejaDrop(canvas, (score) => this.onGameOver(score));
                break;
            case 'flappy_oreja':
                this._gameCleanup = ArcadeGames.flappyOreja(canvas, (score) => this.onGameOver(score));
                break;
            case 'whack_oreja':
                this._gameCleanup = ArcadeGames.whackOreja(canvas, (score) => this.onGameOver(score));
                break;
            case 'oreja_runner':
                this._gameCleanup = ArcadeGames.orejaRunner(canvas, (score) => this.onGameOver(score));
                break;
        }
    },

    async onGameOver(score) {
        // Show game over screen
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const scoreEl = document.getElementById('game-over-score');
        const rewardEl = document.getElementById('game-over-reward');

        if (scoreEl) scoreEl.textContent = score;
        if (gameOverOverlay) gameOverOverlay.style.display = 'flex';

        // Submit score to server
        try {
            const result = await API.submitArcadeScore(this.data.activeGame, score);
            if (rewardEl) {
                rewardEl.innerHTML = result.coinsEarned > 0
                    ? `<span class="reward-coins">🪙 +${result.coinsEarned} OC</span>`
                    : `<span class="reward-none">Sigue jugando para ganar OC</span>`;
            }
            this.data.lastReward = { message: result.message, score };

            // Refresh user data
            App.currentUser = await API.getMe();
        } catch (err) {
            if (rewardEl) {
                rewardEl.innerHTML = `<span class="reward-none">Error al guardar puntuación</span>`;
            }
        }
    },

    _gameCleanup: null,
};
