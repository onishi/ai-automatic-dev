class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');

        this.score = 0;
        this.gameRunning = true;
        this.gameState = 'menu'; // menu, playing, gameOver

        this.player = new Player(100, this.canvas.height / 2);
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];

        this.keys = {};
        this.lastEnemySpawn = 0;
        this.enemySpawnDelay = 2000;
        this.lastPowerUpSpawn = 0;
        this.powerUpSpawnDelay = 15000;
        this.difficulty = 1;
        this.gameTime = 0;

        this.bindEvents();
        this.gameLoop();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (this.gameState === 'menu' && e.code === 'Space') {
                this.startGame();
            }
            if (this.gameState === 'gameOver' && e.code === 'Space') {
                this.restartGame();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.gameTime = Date.now();
    }

    restartGame() {
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.player = new Player(100, this.canvas.height / 2);
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        this.difficulty = 1;
        this.gameState = 'playing';
        this.gameTime = Date.now();
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;

        // 難易度調整
        this.difficulty = 1 + Math.floor((Date.now() - this.gameTime) / 20000);
        this.enemySpawnDelay = Math.max(800, 2000 - (this.difficulty - 1) * 200);

        // プレイヤー更新
        this.player.update(this.keys, this.canvas);

        // 射撃
        if (this.keys['Space'] && this.player.canShoot()) {
            this.bullets.push(new Bullet(this.player.x + this.player.width, this.player.y + this.player.height / 2));
            this.player.lastShot = Date.now();
        }

        // 弾丸更新
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.x < this.canvas.width;
        });

        // 敵のスポーン
        if (Date.now() - this.lastEnemySpawn > this.enemySpawnDelay) {
            const enemyType = Math.random() < 0.7 ? 'normal' : 'fast';
            this.enemies.push(new Enemy(this.canvas.width, Math.random() * (this.canvas.height - 40), enemyType));
            this.lastEnemySpawn = Date.now();
        }

        // 敵更新
        this.enemies = this.enemies.filter(enemy => {
            enemy.update();
            return enemy.x > -enemy.width;
        });

        // パワーアップのスポーン
        if (Date.now() - this.lastPowerUpSpawn > this.powerUpSpawnDelay) {
            this.powerUps.push(new PowerUp(this.canvas.width, Math.random() * (this.canvas.height - 40)));
            this.lastPowerUpSpawn = Date.now();
        }

        // パワーアップ更新
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update();
            return powerUp.x > -powerUp.width;
        });

        // パーティクル更新
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });

        // 衝突判定
        this.checkCollisions();
    }

    checkCollisions() {
        // 弾丸と敵の衝突
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.isColliding(this.bullets[i], this.enemies[j])) {
                    const enemy = this.enemies[j];
                    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    this.score += enemy.type === 'fast' ? 20 : 10;
                    this.scoreElement.textContent = this.score;
                    break;
                }
            }
        }

        // プレイヤーと敵の衝突
        for (let enemy of this.enemies) {
            if (this.isColliding(this.player, enemy)) {
                this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                this.gameState = 'gameOver';
            }
        }

        // プレイヤーとパワーアップの衝突
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            if (this.isColliding(this.player, this.powerUps[i])) {
                this.player.applyPowerUp(this.powerUps[i].type);
                this.createPowerUpEffect(this.powerUps[i].x, this.powerUps[i].y);
                this.powerUps.splice(i, 1);
                break;
            }
        }
    }

    createExplosion(x, y) {
        for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(x, y, 'explosion'));
        }
    }

    createPowerUpEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y, 'powerup'));
        }
    }

    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    render() {
        // 画面クリア
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 星の背景
        this.drawStars();

        if (this.gameState === 'menu') {
            this.drawMenu();
        } else if (this.gameState === 'playing') {
            this.drawGame();
        } else if (this.gameState === 'gameOver') {
            this.drawGameOver();
        }
    }

    drawMenu() {
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPACE GUARDIAN', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '24px Courier New';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Press SPACE to Start', this.canvas.width / 2, this.canvas.height / 2 + 20);

        this.ctx.font = '16px Courier New';
        this.ctx.fillText('WASD: Move | Space: Shoot', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    drawGame() {
        // ゲームオブジェクト描画
        this.player.render(this.ctx);
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));

        // 難易度表示
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Courier New';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Level: ${this.difficulty}`, 10, 30);

        // プレイヤーのパワーアップ状態表示
        if (this.player.powerUpEndTime > Date.now()) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText('POWER UP!', 10, 50);
        }
    }

    drawGameOver() {
        this.drawGame();

        // ゲームオーバー画面
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Courier New';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Press SPACE to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    drawStars() {
        this.ctx.fillStyle = 'white';
        for (let i = 0; i < 50; i++) {
            const x = (Date.now() * 0.01 + i * 16) % this.canvas.width;
            const y = (i * 37) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }

    gameLoop() {
        const deltaTime = 16;
        this.update(deltaTime);
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.speed = 5;
        this.lastShot = 0;
        this.shootDelay = 150;
        this.powerUpEndTime = 0;
        this.powerUpType = null;
    }

    update(keys, canvas) {
        if (keys['KeyW'] || keys['ArrowUp']) {
            this.y = Math.max(0, this.y - this.speed);
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
            this.y = Math.min(canvas.height - this.height, this.y + this.speed);
        }
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.x = Math.max(0, this.x - this.speed);
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            this.x = Math.min(canvas.width - this.width, this.x + this.speed);
        }

        // パワーアップ効果終了チェック
        if (this.powerUpEndTime < Date.now()) {
            this.powerUpType = null;
            this.shootDelay = 150;
        }
    }

    canShoot() {
        return Date.now() - this.lastShot > this.shootDelay;
    }

    applyPowerUp(type) {
        this.powerUpType = type;
        this.powerUpEndTime = Date.now() + 8000; // 8秒間

        if (type === 'rapidFire') {
            this.shootDelay = 50;
        }
    }

    render(ctx) {
        // パワーアップ中の光る効果
        if (this.powerUpEndTime > Date.now()) {
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
        }

        // 宇宙船の描画
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x, this.y + 10, this.width, 10);

        // 宇宙船の先端
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width - 10, this.y + 5);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height - 5);
        ctx.closePath();
        ctx.fill();

        // エンジンの光
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x - 8, this.y + 12, 8, 6);

        ctx.shadowBlur = 0;
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 4;
        this.speed = 8;
    }

    update() {
        this.x += this.speed;
    }

    render(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 5;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'fast' ? 25 : 30;
        this.height = type === 'fast' ? 20 : 25;
        this.speed = type === 'fast' ? 4 : 2;
    }

    update() {
        this.x -= this.speed;
    }

    render(ctx) {
        // 敵の種類に応じた色
        ctx.fillStyle = this.type === 'fast' ? '#ff8800' : '#ff4444';
        ctx.fillRect(this.x, this.y + 8, this.width, 9);

        // 敵の先端
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x + 10, this.y + 5);
        ctx.lineTo(this.x + 10, this.y + this.height - 5);
        ctx.closePath();
        ctx.fill();

        // 敵のエンジン
        ctx.fillStyle = this.type === 'fast' ? '#ffaa44' : '#ff8888';
        ctx.fillRect(this.x + this.width, this.y + 10, 6, 5);
    }
}

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 1;
        this.type = 'rapidFire';
        this.oscillation = 0;
    }

    update() {
        this.x -= this.speed;
        this.oscillation += 0.1;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + Math.sin(this.oscillation) * 3);
        ctx.rotate(Date.now() * 0.005);

        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.restore();
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;

        if (type === 'explosion') {
            this.vx = (Math.random() - 0.5) * 8;
            this.vy = (Math.random() - 0.5) * 8;
            this.color = Math.random() < 0.5 ? '#ff4444' : '#ffaa00';
        } else if (type === 'powerup') {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.color = '#00ff00';
        }

        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
    }

    render(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// ゲーム開始
window.addEventListener('load', () => {
    new Game();
});