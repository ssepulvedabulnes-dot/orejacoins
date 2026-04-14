// ═══════════════════════════════════════════════════════════════════════════════
// OREJACOINS — Arcade Minigames Engine
// Each game returns a cleanup function and calls onGameOver(score) when done
// ═══════════════════════════════════════════════════════════════════════════════
console.log('🎲 ArcadeGames Engine Loaded');

const ArcadeGames = {

    // Preload the ear image once
    _orejaImg: null,
    _imgLoaded: false,

    getOrejaImg() {
        if (!this._orejaImg) {
            this._orejaImg = new Image();
            this._orejaImg.src = '/images/oreja.png';
            this._orejaImg.onload = () => { this._imgLoaded = true; };
        }
        return this._orejaImg;
    },

    drawOreja(ctx, x, y, w, h) {
        const img = this.getOrejaImg();
        if (this._imgLoaded) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback circle while loading
            ctx.fillStyle = '#F5C0A0';
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#5A3420';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    },

    updateScoreDisplay(score) {
        const el = document.getElementById('game-score-display');
        if (el) el.textContent = `Puntaje: ${score}`;
    },

    // ═════════════════════════════════════════════════════════════════════════════
    // GAME 1: OREJA JUMP — Doodle Jump style
    // ═════════════════════════════════════════════════════════════════════════════
    orejaJump(canvas, onGameOver) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        let running = true;
        let score = 0;
        let animId = null;

        // Player
        const player = {
            x: W / 2 - 20,
            y: H - 100,
            w: 40,
            h: 44,
            vx: 0,
            vy: 0,
            jumpForce: -10,
            gravity: 0.35,
        };

        // Platforms
        const platforms = [];
        const platformW = 70;
        const platformH = 12;

        // Generate initial platforms
        for (let i = 0; i < 8; i++) {
            platforms.push({
                x: Math.random() * (W - platformW),
                y: H - 80 - i * 75,
                w: platformW,
                h: platformH,
                type: Math.random() < 0.15 ? 'moving' : 'static',
                vx: (Math.random() < 0.5 ? 1 : -1) * 1.5,
            });
        }

        // Make sure there's a starting platform
        platforms[0].x = player.x - 15;
        platforms[0].y = H - 60;
        platforms[0].type = 'static';

        player.vy = player.jumpForce;

        // Camera offset
        let cameraY = 0;
        let maxHeight = 0;

        // Stars background
        const stars = [];
        for (let i = 0; i < 60; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H * 3,
                r: Math.random() * 1.5 + 0.5,
                a: Math.random(),
            });
        }

        // Input
        const keys = { left: false, right: false };

        function onKeyDown(e) {
            if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
        }
        function onKeyUp(e) {
            if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Touch controls
        function onTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const tx = touch.clientX - rect.left;
            if (tx < W / 2) keys.left = true;
            else keys.right = true;
        }
        function onTouchEnd(e) {
            keys.left = false;
            keys.right = false;
        }
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);

        function update() {
            // Movement
            if (keys.left) player.vx = -5;
            else if (keys.right) player.vx = 5;
            else player.vx *= 0.85;

            player.x += player.vx;
            player.vy += player.gravity;
            player.y += player.vy;

            // Wrap around screen
            if (player.x + player.w < 0) player.x = W;
            if (player.x > W) player.x = -player.w;

            // Camera scrolling
            const playerScreenY = player.y - cameraY;
            if (playerScreenY < H * 0.35) {
                const diff = (H * 0.35) - playerScreenY;
                cameraY -= diff;

                // Move platforms down visually
                platforms.forEach(p => p.y += diff);

                // Score based on height
                maxHeight += diff;
                score = Math.floor(maxHeight);
                ArcadeGames.updateScoreDisplay(score);
            }

            // Platform collision (only when falling)
            if (player.vy > 0) {
                for (const p of platforms) {
                    if (
                        player.x + player.w > p.x &&
                        player.x < p.x + p.w &&
                        player.y + player.h >= p.y &&
                        player.y + player.h <= p.y + p.h + player.vy + 2
                    ) {
                        player.vy = player.jumpForce;
                        player.y = p.y - player.h;
                    }
                }
            }

            // Moving platforms
            platforms.forEach(p => {
                if (p.type === 'moving') {
                    p.x += p.vx;
                    if (p.x <= 0 || p.x + p.w >= W) p.vx *= -1;
                }
            });

            // Remove old platforms and spawn new above
            for (let i = platforms.length - 1; i >= 0; i--) {
                if (platforms[i].y > H + 50) {
                    platforms.splice(i, 1);
                    // Add new platform at top
                    const newY = Math.min(...platforms.map(p => p.y)) - (60 + Math.random() * 40);
                    platforms.push({
                        x: Math.random() * (W - platformW),
                        y: newY,
                        w: platformW,
                        h: platformH,
                        type: Math.random() < 0.2 ? 'moving' : 'static',
                        vx: (Math.random() < 0.5 ? 1 : -1) * 1.5,
                    });
                }
            }

            // Game over - fell off screen
            if (player.y > H + 50) {
                running = false;
            }
        }

        function draw() {
            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#0a0a2e');
            grad.addColorStop(1, '#1a1a3e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Stars
            stars.forEach(s => {
                const sy = ((s.y + cameraY * 0.3) % (H * 3)) - H;
                ctx.fillStyle = `rgba(255,255,255,${s.a * 0.6})`;
                ctx.beginPath();
                ctx.arc(s.x, sy % H, s.r, 0, Math.PI * 2);
                ctx.fill();
            });

            // Platforms
            platforms.forEach(p => {
                const grad2 = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
                if (p.type === 'moving') {
                    grad2.addColorStop(0, '#A78BFA');
                    grad2.addColorStop(1, '#7C3AED');
                } else {
                    grad2.addColorStop(0, '#4ADE80');
                    grad2.addColorStop(1, '#22C55E');
                }
                ctx.fillStyle = grad2;
                ctx.beginPath();
                ctx.roundRect(p.x, p.y, p.w, p.h, 6);
                ctx.fill();

                // Platform glow
                ctx.shadowColor = p.type === 'moving' ? '#A78BFA' : '#4ADE80';
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Player (oreja)
            ArcadeGames.drawOreja(ctx, player.x, player.y, player.w, player.h);

            // Score on canvas
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = 'bold 16px "Syne", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${score}m`, 12, 28);
        }

        function loop() {
            if (!running) {
                cancelAnimationFrame(animId);
                onGameOver(score);
                return;
            }
            update();
            draw();
            animId = requestAnimationFrame(loop);
        }

        this.getOrejaImg(); // preload
        loop();

        return function cleanup() {
            running = false;
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    },

    // ═════════════════════════════════════════════════════════════════════════════
    // GAME 2: OREJA DROP — Catch falling food
    // ═════════════════════════════════════════════════════════════════════════════
    orejaDrop(canvas, onGameOver) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        let running = true;
        let score = 0;
        let lives = 3;
        let animId = null;
        let spawnTimer = 0;
        let difficulty = 1;

        const player = {
            x: W / 2 - 30,
            y: H - 70,
            w: 60,
            h: 55,
        };

        const foods = ['🍔', '🍕', '🍩', '🌮', '🍟', '🍦', '🍫', '🧁', '🥤', '🍪'];
        const bads = ['💣', '🧨', '☠️'];
        const items = [];

        // Input
        const keys = { left: false, right: false };
        let touchX = null;

        function onKeyDown(e) {
            if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
        }
        function onKeyUp(e) {
            if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        function onTouchMove(e) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            touchX = e.touches[0].clientX - rect.left;
        }
        function onTouchEnd2() { touchX = null; }

        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchstart', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd2);

        // Particles for catching
        const particles = [];

        function spawnItem() {
            const isBad = Math.random() < 0.15;
            items.push({
                x: Math.random() * (W - 30),
                y: -30,
                size: 28,
                speed: 2 + Math.random() * difficulty,
                emoji: isBad ? bads[Math.floor(Math.random() * bads.length)] : foods[Math.floor(Math.random() * foods.length)],
                isBad: isBad,
                rotation: 0,
                rotSpeed: (Math.random() - 0.5) * 0.1,
            });
        }

        function spawnParticles(x, y, color) {
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6 - 2,
                    life: 1,
                    color,
                    size: Math.random() * 4 + 2,
                });
            }
        }

        function update() {
            // Player movement
            if (touchX !== null) {
                player.x += (touchX - player.x - player.w / 2) * 0.15;
            } else {
                if (keys.left) player.x -= 6;
                if (keys.right) player.x += 6;
            }
            player.x = Math.max(0, Math.min(W - player.w, player.x));

            // Spawn items
            spawnTimer++;
            if (spawnTimer >= Math.max(15, 40 - difficulty * 3)) {
                spawnItem();
                spawnTimer = 0;
            }

            // Update items
            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i];
                item.y += item.speed;
                item.rotation += item.rotSpeed;

                // Collision with player
                if (
                    item.x + item.size > player.x &&
                    item.x < player.x + player.w &&
                    item.y + item.size > player.y &&
                    item.y < player.y + player.h
                ) {
                    if (item.isBad) {
                        lives--;
                        spawnParticles(item.x, item.y, '#F87171');
                        if (lives <= 0) running = false;
                    } else {
                        score++;
                        spawnParticles(item.x, item.y, '#F5C518');
                        ArcadeGames.updateScoreDisplay(score);
                    }
                    items.splice(i, 1);
                    continue;
                }

                // Missed food (fell off screen)
                if (item.y > H + 40) {
                    if (!item.isBad) {
                        lives--;
                        if (lives <= 0) running = false;
                    }
                    items.splice(i, 1);
                }
            }

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.life -= 0.03;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Increase difficulty over time
            difficulty = 1 + score / 15;
        }

        function draw() {
            // Background
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#1a2a1a');
            grad.addColorStop(1, '#0a1a0a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Grid lines
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.05)';
            ctx.lineWidth = 1;
            for (let y = 0; y < H; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }

            // Items
            items.forEach(item => {
                ctx.save();
                ctx.translate(item.x + item.size / 2, item.y + item.size / 2);
                ctx.rotate(item.rotation);
                ctx.font = `${item.size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.emoji, 0, 0);
                ctx.restore();
            });

            // Particles
            particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            // Player (oreja)
            ArcadeGames.drawOreja(ctx, player.x, player.y, player.w, player.h);

            // Lives
            ctx.font = '18px serif';
            ctx.textAlign = 'left';
            for (let i = 0; i < lives; i++) {
                ctx.fillText('❤️', 10 + i * 26, 28);
            }

            // Score
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px "Syne", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${score}`, W - 12, 28);
        }

        function loop() {
            if (!running) {
                cancelAnimationFrame(animId);
                onGameOver(score);
                return;
            }
            update();
            draw();
            animId = requestAnimationFrame(loop);
        }

        this.getOrejaImg();
        loop();

        return function cleanup() {
            running = false;
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchstart', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd2);
        };
    },

    // ═════════════════════════════════════════════════════════════════════════════
    // GAME 3: FLAPPY OREJA — Flappy Bird style
    // ═════════════════════════════════════════════════════════════════════════════
    flappyOreja(canvas, onGameOver) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        let running = true;
        let score = 0;
        let animId = null;

        const bird = {
            x: 80,
            y: H / 2,
            w: 40,
            h: 36,
            vy: 0,
            gravity: 0.45,
            flapForce: -7.5,
            rotation: 0,
        };

        const pipes = [];
        const pipeW = 55;
        const gapH = 155;
        let pipeTimer = 0;
        let pipeSpeed = 2.5;

        // Floating coins in gaps
        const coins = [];

        function spawnPipe() {
            const gapY = 80 + Math.random() * (H - gapH - 160);
            pipes.push({
                x: W + 10,
                gapY: gapY,
                scored: false,
            });
            // Add a coin in the gap
            coins.push({
                x: W + 10 + pipeW / 2,
                y: gapY + gapH / 2,
                collected: false,
                size: 20,
                angle: 0,
            });
        }

        // Input
        function flap() {
            bird.vy = bird.flapForce;
        }

        function onKey(e) {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                flap();
            }
        }
        function onTouch(e) {
            e.preventDefault();
            flap();
        }

        document.addEventListener('keydown', onKey);
        canvas.addEventListener('touchstart', onTouch, { passive: false });
        canvas.addEventListener('click', flap);

        // Cloud decorations
        const clouds = [];
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * W,
                y: Math.random() * H * 0.6,
                w: 50 + Math.random() * 60,
                speed: 0.3 + Math.random() * 0.5,
            });
        }

        function update() {
            // Bird physics
            bird.vy += bird.gravity;
            bird.y += bird.vy;
            bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.vy * 0.06));

            // Pipe spawn
            pipeTimer++;
            if (pipeTimer >= 90) {
                spawnPipe();
                pipeTimer = 0;
            }

            // Update pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                const p = pipes[i];
                p.x -= pipeSpeed;

                // Score
                if (!p.scored && p.x + pipeW < bird.x) {
                    score++;
                    p.scored = true;
                    ArcadeGames.updateScoreDisplay(score);
                    // Slowly increase speed
                    pipeSpeed = Math.min(4, 2.5 + score * 0.05);
                }

                // Collision
                if (
                    bird.x + bird.w * 0.7 > p.x &&
                    bird.x + bird.w * 0.3 < p.x + pipeW
                ) {
                    if (bird.y + 5 < p.gapY || bird.y + bird.h - 5 > p.gapY + gapH) {
                        running = false;
                    }
                }

                // Remove off-screen
                if (p.x + pipeW < -10) {
                    pipes.splice(i, 1);
                }
            }

            // Update coins
            for (let i = coins.length - 1; i >= 0; i--) {
                const c = coins[i];
                c.x -= pipeSpeed;
                c.angle += 0.08;

                if (!c.collected &&
                    Math.abs(bird.x + bird.w/2 - c.x) < 25 &&
                    Math.abs(bird.y + bird.h/2 - c.y) < 25
                ) {
                    c.collected = true;
                }

                if (c.x < -30) coins.splice(i, 1);
            }

            // Floor/ceiling collision
            if (bird.y + bird.h > H || bird.y < 0) {
                running = false;
            }

            // Clouds
            clouds.forEach(c => {
                c.x -= c.speed;
                if (c.x + c.w < 0) {
                    c.x = W + 10;
                    c.y = Math.random() * H * 0.6;
                }
            });
        }

        function draw() {
            // Sky gradient
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(0.6, '#1e293b');
            grad.addColorStop(1, '#334155');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Clouds
            clouds.forEach(c => {
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                ctx.beginPath();
                ctx.ellipse(c.x + c.w/2, c.y, c.w/2, c.w/4, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            // Pipes
            pipes.forEach(p => {
                // Top pipe
                const topGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeW, 0);
                topGrad.addColorStop(0, '#F5C518');
                topGrad.addColorStop(0.5, '#F5D060');
                topGrad.addColorStop(1, '#E8A800');
                ctx.fillStyle = topGrad;
                ctx.beginPath();
                ctx.roundRect(p.x, 0, pipeW, p.gapY, [0, 0, 8, 8]);
                ctx.fill();

                // Pipe cap top
                ctx.fillStyle = '#E8A800';
                ctx.fillRect(p.x - 4, p.gapY - 20, pipeW + 8, 20);

                // Bottom pipe
                ctx.fillStyle = topGrad;
                ctx.beginPath();
                ctx.roundRect(p.x, p.gapY + gapH, pipeW, H - p.gapY - gapH, [8, 8, 0, 0]);
                ctx.fill();

                // Pipe cap bottom
                ctx.fillStyle = '#E8A800';
                ctx.fillRect(p.x - 4, p.gapY + gapH, pipeW + 8, 20);
            });

            // Coins
            coins.forEach(c => {
                if (!c.collected) {
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.scale(Math.cos(c.angle), 1);
                    ctx.font = `${c.size}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🪙', 0, 0);
                    ctx.restore();
                }
            });

            // Bird (oreja)
            ctx.save();
            ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
            ctx.rotate(bird.rotation);
            ArcadeGames.drawOreja(ctx, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
            ctx.restore();

            // Score
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px "Syne", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(score, W / 2, 50);
            ctx.shadowBlur = 0;
        }

        function loop() {
            if (!running) {
                cancelAnimationFrame(animId);
                onGameOver(score);
                return;
            }
            update();
            draw();
            animId = requestAnimationFrame(loop);
        }

        this.getOrejaImg();
        loop();

        return function cleanup() {
            running = false;
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKey);
            canvas.removeEventListener('touchstart', onTouch);
            canvas.removeEventListener('click', flap);
        };
    },

    // ═════════════════════════════════════════════════════════════════════════════
    // GAME 4: WHACK-A-OREJA — Whack-a-Mole style
    // ═════════════════════════════════════════════════════════════════════════════
    whackOreja(canvas, onGameOver) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        let running = true;
        let score = 0;
        let animId = null;
        let timeLeft = 30; // 30 seconds
        let lastTime = Date.now();
        let misses = 0;

        // Grid of holes (3x3)
        const cols = 3, rows = 3;
        const holeW = 90, holeH = 80;
        const padX = (W - cols * holeW) / (cols + 1);
        const padY = 80;
        const startY = 100;

        const holes = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                holes.push({
                    x: padX + c * (holeW + padX),
                    y: startY + r * (holeH + padY),
                    w: holeW,
                    h: holeH,
                    active: false,
                    timer: 0,
                    showDuration: 1200,
                    hitAnim: 0,
                    isBad: false,
                });
            }
        }

        let spawnInterval = 800;
        let lastSpawn = Date.now();

        function spawnMole() {
            const available = holes.filter(h => !h.active);
            if (available.length === 0) return;
            const h = available[Math.floor(Math.random() * available.length)];
            h.active = true;
            h.timer = Date.now();
            h.showDuration = Math.max(500, 1200 - score * 20);
            h.hitAnim = 0;
            h.isBad = Math.random() < 0.15;
        }

        // Click/Touch handling
        function onClick(e) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            let cx, cy;
            if (e.touches) {
                cx = e.touches[0].clientX - rect.left;
                cy = e.touches[0].clientY - rect.top;
            } else {
                cx = e.clientX - rect.left;
                cy = e.clientY - rect.top;
            }

            // Scale for CSS sizing
            const scaleX = W / rect.width;
            const scaleY = H / rect.height;
            cx *= scaleX;
            cy *= scaleY;

            let hit = false;
            holes.forEach(h => {
                if (h.active && h.hitAnim === 0 &&
                    cx > h.x && cx < h.x + h.w &&
                    cy > h.y && cy < h.y + h.h
                ) {
                    if (h.isBad) {
                        timeLeft -= 3;
                        h.hitAnim = 2; // red flash
                    } else {
                        score++;
                        h.hitAnim = 1; // gold flash
                        ArcadeGames.updateScoreDisplay(score);
                    }
                    h.active = false;
                    hit = true;
                }
            });
        }

        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchstart', onClick, { passive: false });

        function update() {
            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            timeLeft -= dt;

            if (timeLeft <= 0) {
                running = false;
                return;
            }

            // Spawn orejas
            if (now - lastSpawn > spawnInterval) {
                spawnMole();
                lastSpawn = now;
                spawnInterval = Math.max(300, 800 - score * 15);
            }

            // Update holes
            holes.forEach(h => {
                if (h.active && Date.now() - h.timer > h.showDuration) {
                    h.active = false;
                    if (!h.isBad) misses++;
                }
                if (h.hitAnim > 0) {
                    h.hitAnim -= 0.05;
                    if (h.hitAnim <= 0) h.hitAnim = 0;
                }
            });
        }

        function draw() {
            // Background
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#2d1a0e');
            grad.addColorStop(1, '#1a100a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Title
            ctx.fillStyle = '#F5C518';
            ctx.font = 'bold 20px "Syne", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('¡Golpea las Orejas!', W / 2, 35);

            // Timer bar
            const barW = W - 40;
            const barH = 12;
            const barX = 20;
            const barY = 55;
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 6);
            ctx.fill();

            const timeRatio = Math.max(0, timeLeft / 30);
            const timerGrad = ctx.createLinearGradient(barX, 0, barX + barW * timeRatio, 0);
            timerGrad.addColorStop(0, '#4ADE80');
            timerGrad.addColorStop(1, timeRatio < 0.3 ? '#F87171' : '#F5C518');
            ctx.fillStyle = timerGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * timeRatio, barH, 6);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = '11px "Space Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.ceil(timeLeft)}s`, W - 20, barY - 4);

            // Holes
            holes.forEach(h => {
                // Hole shadow
                ctx.fillStyle = '#0a0705';
                ctx.beginPath();
                ctx.ellipse(h.x + h.w / 2, h.y + h.h + 5, h.w / 2 + 5, 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // Hole background
                const holeGrad = ctx.createRadialGradient(h.x + h.w/2, h.y + h.h/2, 5, h.x + h.w/2, h.y + h.h/2, h.w/2);
                holeGrad.addColorStop(0, '#1a100a');
                holeGrad.addColorStop(1, '#3d2615');
                ctx.fillStyle = holeGrad;
                ctx.beginPath();
                ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Active oreja popping up
                if (h.active) {
                    const elapsed = Date.now() - h.timer;
                    const popProgress = Math.min(1, elapsed / 200);
                    const orejaH = 50 * popProgress;
                    const orejaW = 45;
                    const oy = h.y + h.h / 2 - orejaH / 2;

                    ctx.save();
                    // Clip to hole area
                    ctx.beginPath();
                    ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 2, 0, 0, Math.PI * 2);
                    ctx.clip();

                    if (h.isBad) {
                        // Draw a red-tinted oreja for bad ones
                        ctx.filter = 'hue-rotate(300deg) saturate(2)';
                    }

                    ArcadeGames.drawOreja(ctx, h.x + h.w / 2 - orejaW / 2, oy, orejaW, orejaH);
                    ctx.filter = 'none';
                    ctx.restore();
                }

                // Hit animation flash
                if (h.hitAnim > 0) {
                    ctx.fillStyle = h.hitAnim > 1
                        ? `rgba(248, 113, 113, ${Math.min(1, h.hitAnim - 1)})`
                        : `rgba(245, 197, 24, ${h.hitAnim})`;
                    ctx.beginPath();
                    ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Score display
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px "Syne", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`🎯 ${score}`, 12, 28);
        }

        function loop() {
            if (!running) {
                cancelAnimationFrame(animId);
                onGameOver(score);
                return;
            }
            update();
            draw();
            animId = requestAnimationFrame(loop);
        }

        this.getOrejaImg();
        loop();

        return function cleanup() {
            running = false;
            cancelAnimationFrame(animId);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchstart', onClick);
        };
    },

    // ═════════════════════════════════════════════════════════════════════════════
    // GAME 5: OREJA RUNNER — Endless runner style
    // ═════════════════════════════════════════════════════════════════════════════
    orejaRunner(canvas, onGameOver) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        let running = true;
        let score = 0;
        let animId = null;

        const groundY = H - 80;
        const player = {
            x: 60,
            y: groundY - 50,
            w: 45,
            h: 50,
            vy: 0,
            jumping: false,
            gravity: 0.6,
            jumpForce: -12,
            grounded: true,
            doubleJump: false,
        };

        let speed = 4;
        let obstacleTimer = 0;
        const obstacles = [];
        const groundTiles = [];
        const bgElements = [];

        // Generate ground tiles
        for (let x = 0; x < W + 60; x += 30) {
            groundTiles.push({ x, h: 5 + Math.random() * 3 });
        }

        // Generate background elements (mountains, etc.)
        for (let i = 0; i < 8; i++) {
            bgElements.push({
                x: Math.random() * W * 2,
                h: 30 + Math.random() * 80,
                w: 40 + Math.random() * 60,
                layer: Math.random() < 0.5 ? 0 : 1,
            });
        }

        // Coins to collect
        const coins = [];
        let coinTimer = 0;

        // Obstacle types
        const obstacleTypes = [
            { w: 25, h: 40, emoji: '🌵' },
            { w: 30, h: 35, emoji: '📦' },
            { w: 28, h: 45, emoji: '🪨' },
            { w: 35, h: 30, emoji: '🔥' },
        ];

        // Particles
        const dustParticles = [];

        // Input
        function jump() {
            if (player.grounded) {
                player.vy = player.jumpForce;
                player.grounded = false;
                player.doubleJump = false;
                // Dust particles
                for (let i = 0; i < 5; i++) {
                    dustParticles.push({
                        x: player.x + player.w / 2,
                        y: groundY,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -Math.random() * 2,
                        life: 1,
                        size: 2 + Math.random() * 3,
                    });
                }
            } else if (!player.doubleJump) {
                player.vy = player.jumpForce * 0.8;
                player.doubleJump = true;
            }
        }

        function onKey(e) {
            if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                e.preventDefault();
                jump();
            }
        }
        function onTouch(e) {
            e.preventDefault();
            jump();
        }

        document.addEventListener('keydown', onKey);
        canvas.addEventListener('touchstart', onTouch, { passive: false });
        canvas.addEventListener('click', jump);

        function update() {
            // Player physics
            player.vy += player.gravity;
            player.y += player.vy;

            if (player.y + player.h >= groundY) {
                player.y = groundY - player.h;
                player.vy = 0;
                player.grounded = true;
                player.doubleJump = false;
            }

            // Score increases with distance
            score = Math.floor(score + speed / 10);
            ArcadeGames.updateScoreDisplay(score);

            // Increase speed gradually
            speed = Math.min(10, 4 + score / 200);

            // Spawn obstacles
            obstacleTimer++;
            const spawnRate = Math.max(40, 80 - score / 20);
            if (obstacleTimer >= spawnRate) {
                const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
                obstacles.push({
                    x: W + 10,
                    y: groundY - type.h,
                    w: type.w,
                    h: type.h,
                    emoji: type.emoji,
                });
                obstacleTimer = 0;
            }

            // Spawn coins
            coinTimer++;
            if (coinTimer >= 60) {
                const coinY = groundY - 60 - Math.random() * 80;
                for (let i = 0; i < 3; i++) {
                    coins.push({
                        x: W + 10 + i * 30,
                        y: coinY,
                        collected: false,
                        size: 18,
                        angle: 0,
                    });
                }
                coinTimer = 0;
            }

            // Update obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= speed;
                if (obstacles[i].x + obstacles[i].w < 0) {
                    obstacles.splice(i, 1);
                    continue;
                }

                // Collision
                const o = obstacles[i];
                if (
                    player.x + player.w * 0.7 > o.x + 5 &&
                    player.x + player.w * 0.3 < o.x + o.w - 5 &&
                    player.y + player.h > o.y + 5 &&
                    player.y + 5 < o.y + o.h
                ) {
                    running = false;
                }
            }

            // Update coins
            for (let i = coins.length - 1; i >= 0; i--) {
                const c = coins[i];
                c.x -= speed;
                c.angle += 0.1;

                if (!c.collected &&
                    Math.abs(player.x + player.w/2 - c.x) < 20 &&
                    Math.abs(player.y + player.h/2 - c.y) < 20
                ) {
                    c.collected = true;
                    score += 5;
                }

                if (c.x < -20) coins.splice(i, 1);
            }

            // Ground scroll
            groundTiles.forEach(t => {
                t.x -= speed;
                if (t.x + 30 < 0) t.x += (Math.floor(W / 30) + 2) * 30;
            });

            // Background scroll
            bgElements.forEach(bg => {
                bg.x -= speed * (bg.layer === 0 ? 0.3 : 0.6);
                if (bg.x + bg.w < -10) bg.x = W + Math.random() * 100;
            });

            // Update dust particles
            for (let i = dustParticles.length - 1; i >= 0; i--) {
                const p = dustParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05;
                p.life -= 0.03;
                if (p.life <= 0) dustParticles.splice(i, 1);
            }

            // Running dust
            if (player.grounded && Math.random() < 0.3) {
                dustParticles.push({
                    x: player.x,
                    y: groundY,
                    vx: -speed * 0.3 + (Math.random() - 0.5),
                    vy: -Math.random() * 1.5,
                    life: 0.6,
                    size: 1 + Math.random() * 2,
                });
            }
        }

        function draw() {
            // Sky gradient
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#1a0a2e');
            grad.addColorStop(0.6, '#2d1a3e');
            grad.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Background mountains
            bgElements.forEach(bg => {
                ctx.fillStyle = bg.layer === 0 ? 'rgba(100,60,140,0.15)' : 'rgba(80,50,120,0.25)';
                ctx.beginPath();
                ctx.moveTo(bg.x, groundY);
                ctx.lineTo(bg.x + bg.w / 2, groundY - bg.h);
                ctx.lineTo(bg.x + bg.w, groundY);
                ctx.closePath();
                ctx.fill();
            });

            // Ground
            ctx.fillStyle = '#2a1a2e';
            ctx.fillRect(0, groundY, W, H - groundY);

            // Ground tiles
            groundTiles.forEach(t => {
                ctx.fillStyle = '#3d2845';
                ctx.fillRect(t.x, groundY, 28, 3);
            });

            // Ground line
            ctx.strokeStyle = '#F5C518';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(W, groundY);
            ctx.stroke();

            // Obstacles
            obstacles.forEach(o => {
                ctx.font = `${o.h}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(o.emoji, o.x + o.w / 2, o.y + o.h);
            });

            // Coins
            coins.forEach(c => {
                if (!c.collected) {
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.scale(Math.cos(c.angle), 1);
                    ctx.font = `${c.size}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🪙', 0, 0);
                    ctx.restore();
                }
            });

            // Dust particles
            dustParticles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = '#a89070';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            // Player (oreja) with bounce animation
            const bounce = player.grounded ? Math.sin(Date.now() * 0.01) * 2 : 0;
            ArcadeGames.drawOreja(ctx, player.x, player.y + bounce, player.w, player.h);

            // Score
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px "Syne", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${score}m`, W - 12, 28);

            // Speed indicator
            ctx.fillStyle = 'rgba(245,197,24,0.6)';
            ctx.font = '10px "Space Mono", monospace';
            ctx.fillText(`x${speed.toFixed(1)}`, W - 12, 44);
        }

        function loop() {
            if (!running) {
                cancelAnimationFrame(animId);
                onGameOver(score);
                return;
            }
            update();
            draw();
            animId = requestAnimationFrame(loop);
        }

        this.getOrejaImg();
        loop();

        return function cleanup() {
            running = false;
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKey);
            canvas.removeEventListener('touchstart', onTouch);
            canvas.removeEventListener('click', jump);
        };
    },
};
