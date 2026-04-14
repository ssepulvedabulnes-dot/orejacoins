// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Charts Component (Canvas API)
// ═══════════════════════════════════════════════════════════════════════════════

const Charts = {
    /**
     * Draw a bar chart on a canvas element
     * @param {HTMLCanvasElement} canvas
     * @param {Array} data - [{label, values: [{value, color}]}]
     */
    drawBarChart(canvas, data, options = {}) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.parentElement.getBoundingClientRect();
        const width = rect.width;
        const height = options.height || 220;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        const padding = { top: 20, right: 20, bottom: 40, left: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find max value
        let maxVal = 0;
        data.forEach(d => {
            d.values.forEach(v => { if (v.value > maxVal) maxVal = v.value; });
        });
        if (maxVal === 0) maxVal = 100;

        // Draw grid lines
        const gridLines = 5;
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#777';
        ctx.font = '10px "Space Mono"';
        ctx.textAlign = 'right';

        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            const value = Math.round(maxVal - (maxVal / gridLines) * i);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillText(value, padding.left - 8, y + 4);
        }

        // Draw bars
        const groupWidth = chartWidth / data.length;
        const numBars = data[0]?.values.length || 1;
        const barWidth = Math.min(groupWidth / (numBars + 1) * 0.8, 16);
        const barGap = 3;

        data.forEach((group, gi) => {
            const groupX = padding.left + gi * groupWidth + groupWidth / 2;

            group.values.forEach((v, vi) => {
                const barH = (v.value / maxVal) * chartHeight;
                const x = groupX - (numBars * (barWidth + barGap)) / 2 + vi * (barWidth + barGap);
                const y = padding.top + chartHeight - barH;

                // Bar with rounded top
                const radius = Math.min(barWidth / 2, 4);
                ctx.fillStyle = v.color;
                ctx.beginPath();
                ctx.moveTo(x, y + radius);
                ctx.arcTo(x, y, x + barWidth, y, radius);
                ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
                ctx.lineTo(x + barWidth, padding.top + chartHeight);
                ctx.lineTo(x, padding.top + chartHeight);
                ctx.closePath();
                ctx.fill();
            });

            // Label
            ctx.fillStyle = '#777';
            ctx.font = '10px "Space Mono"';
            ctx.textAlign = 'center';
            ctx.fillText(group.label, groupX, height - 10);
        });
    },

    /**
     * Draw a donut chart
     * @param {HTMLCanvasElement} canvas
     * @param {Array} segments - [{value, color, label}]
     */
    drawDonutChart(canvas, segments, options = {}) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const size = options.size || 180;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = size / 2 - 8;
        const innerRadius = outerRadius * 0.65;

        const total = segments.reduce((sum, s) => sum + s.value, 0);
        if (total === 0) {
            // Draw empty donut
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fill();
            return;
        }

        let startAngle = -Math.PI / 2;

        segments.forEach(segment => {
            const sliceAngle = (segment.value / total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = segment.color;
            ctx.fill();

            // Add a small gap between segments
            ctx.strokeStyle = '#1E1E1E';
            ctx.lineWidth = 2;
            ctx.stroke();

            startAngle = endAngle;
        });

        // Center text
        if (options.centerText) {
            ctx.fillStyle = '#F5C518';
            ctx.font = '800 24px "Syne"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(options.centerText, centerX, centerY - 6);

            ctx.fillStyle = '#777';
            ctx.font = '10px "Space Mono"';
            ctx.fillText(options.centerLabel || '', centerX, centerY + 14);
        }
    }
};
