// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Missions Component
// ═══════════════════════════════════════════════════════════════════════════════

const MissionsComponent = {
    data: {
        missions: [],
        user: null,
        loading: true
    },

    async loadData() {
        try {
            const [missions, user] = await Promise.all([
                API.getMissions(),
                API.getMe()
            ]);
            this.data.missions = missions;
            this.data.user = user;
            this.data.loading = false;
        } catch (err) {
            console.error('Missions load error:', err);
            this.data.loading = false;
        }
    },

    render() {
        if (this.data.loading) {
            return `<div class="page-content"><div class="loading-spinner"><div class="spinner"></div></div></div>`;
        }

        const claimed = this.data.missions.filter(m => m.user_status === 'claimed');
        const completed = this.data.missions.filter(m => m.user_status === 'completed');
        const pending = this.data.missions.filter(m => m.user_status === 'pending');

        const totalReward = this.data.missions.reduce((sum, m) => sum + m.reward, 0);
        const earnedReward = claimed.reduce((sum, m) => sum + m.reward, 0);

        return `
            <div class="page-content">
                <h1 class="page-title">Misiones</h1>
                <p class="page-subtitle">Completa misiones para ganar OrejaCoins — ${earnedReward}/${totalReward} OC ganados</p>

                <!-- Progress bar -->
                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 700;">Progreso General</span>
                        <span style="font-size: 12px; color: var(--gold); font-family: var(--font-display); font-weight: 800;">${claimed.length}/${this.data.missions.length}</span>
                    </div>
                    <div style="background: var(--dark3); border-radius: 8px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--gold), var(--gold2)); height: 100%; border-radius: 8px; transition: width 0.5s ease; width: ${this.data.missions.length > 0 ? (claimed.length / this.data.missions.length * 100) : 0}%;"></div>
                    </div>
                </div>

                <!-- Ready to claim -->
                ${completed.length > 0 ? `
                    <div class="card" style="border-color: rgba(245,197,24,0.3);">
                        <div class="card-title" style="color: var(--gold);">⚡ Listas para reclamar</div>
                        <div class="missions-list">
                            ${completed.map(m => `
                                <div class="mission-card available" data-mission-id="${m.id}">
                                    <span class="mission-emoji">${m.emoji}</span>
                                    <div class="mission-info">
                                        <div class="mission-name">${m.name}</div>
                                        <div class="mission-desc">${m.description}</div>
                                        ${m.image_data ? `<img src="${m.image_data}" alt="" style="max-width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
                                    </div>
                                    <div class="mission-reward">+${m.reward} OC →</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- In progress -->
                ${pending.length > 0 ? `
                    <div class="card">
                        <div class="card-title">En progreso</div>
                        <div class="missions-list">
                            ${pending.map(m => `
                                <div class="mission-card">
                                    <span class="mission-emoji">${m.emoji}</span>
                                    <div class="mission-info">
                                        <div class="mission-name">${m.name}</div>
                                        <div class="mission-desc">${m.description}</div>
                                        ${m.image_data ? `<img src="${m.image_data}" alt="" style="max-width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
                                    </div>
                                    <div class="mission-reward">${m.reward} OC</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Completed -->
                ${claimed.length > 0 ? `
                    <div class="card">
                        <div class="card-title">Completadas ✓</div>
                        <div class="missions-list">
                            ${claimed.map(m => `
                                <div class="mission-card done">
                                    <span class="mission-emoji">${m.emoji}</span>
                                    <div class="mission-info">
                                        <div class="mission-name">${m.name}</div>
                                        <div class="mission-desc">${m.description}</div>
                                        ${m.image_data ? `<img src="${m.image_data}" alt="" style="max-width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-top: 8px; opacity: 0.5;">` : ''}
                                    </div>
                                    <span class="mission-done-badge">✓ +${m.reward} OC</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${this.data.missions.length === 0 ? `
                    <div class="card">
                        <div class="empty-state">
                            <span class="emoji">🎯</span>
                            <div class="text">No hay misiones disponibles<br>¡El admin creará algunas pronto!</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    attachEvents() {
        document.querySelectorAll('.mission-card.available').forEach(card => {
            card.addEventListener('click', async () => {
                const missionId = parseInt(card.dataset.missionId);
                try {
                    const result = await API.claimMission(missionId);
                    Utils.showToast(result.message);
                    this.data.loading = true;
                    await this.loadData();
                    App.renderPage();
                } catch (err) {
                    Utils.showToast(err.message, 'error');
                }
            });
        });
    }
};
