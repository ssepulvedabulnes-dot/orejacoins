// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

const Utils = {
    /**
     * Format a date string for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format number with locale separators
     */
    formatNumber(num) {
        return (num || 0).toLocaleString('es-ES');
    },

    /**
     * Safely create HTML elements from string
     */
    createElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    },

    /**
     * Show toast notification
     */
    showToast(msg, type = 'success') {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = Utils.createElement(`
            <div class="toast ${type}">${msg}</div>
        `);
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Show confirmation modal
     */
    showModal({ title, message, emoji, confirmText, cancelText, onConfirm }) {
        const existing = document.querySelector('.modal-backdrop');
        if (existing) existing.remove();

        const backdrop = Utils.createElement(`
            <div class="modal-backdrop">
                <div class="modal">
                    ${emoji ? `<div style="font-size: 48px; margin-bottom: 12px;">${emoji}</div>` : ''}
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <div class="modal-btns">
                        <button class="btn-cancel" id="modal-cancel">${cancelText || 'Cancelar'}</button>
                        <button class="btn-confirm" id="modal-confirm">${confirmText || 'Confirmar'}</button>
                    </div>
                </div>
            </div>
        `);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) backdrop.remove();
        });

        backdrop.querySelector('#modal-cancel').addEventListener('click', () => backdrop.remove());
        backdrop.querySelector('#modal-confirm').addEventListener('click', () => {
            backdrop.remove();
            if (onConfirm) onConfirm();
        });

        // Prevent clicks on the modal from closing it
        backdrop.querySelector('.modal').addEventListener('click', (e) => e.stopPropagation());

        document.body.appendChild(backdrop);
    },

    /**
     * Debounce a function
     */
    debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }
};
