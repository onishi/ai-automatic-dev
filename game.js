class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');

        this.score = 0;
        this.gameRunning = true;

        this.player = new Player(100, this.canvas.height / 2);
        this.bullets = [];
        this.enemies = [];

        this.keys = {};
        this.lastEnemySpawn = 0;
        this.enemySpawnDelay = 2000; // 2秒

        this.bindEvents();
        this.gameLoop();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    update(deltaTime) {
        if (!this.gameRunning) return;

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
            this.enemies.push(new Enemy(this.canvas.width, Math.random() * (this.canvas.height - 40)));
            this.lastEnemySpawn = Date.now();
        }

        // 敵更新
        this.enemies = this.enemies.filter(enemy => {
            enemy.update();
            return enemy.x > -enemy.width;
        });

        // 衝突判定
        this.checkCollisions();
    }

    checkCollisions() {
        // 弾丸と敵の衝突
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.isColliding(this.bullets[i], this.enemies[j])) {
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    this.score += 10;
                    this.scoreElement.textContent = this.score;
                    break;
                }
            }
        }

        // プレイヤーと敵の衝突
        for (let enemy of this.enemies) {
            if (this.isColliding(this.player, enemy)) {
                this.gameRunning = false;
                alert(`Game Over! Score: ${this.score}`);
                location.reload();
            }
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

        // ゲームオブジェクト描画
        this.player.render(this.ctx);
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
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
    }

    canShoot() {
        return Date.now() - this.lastShot > this.shootDelay;
    }

    render(ctx) {
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
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 光の効果
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 5;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 25;
        this.speed = 2;
    }

    update() {
        this.x -= this.speed;
    }

    render(ctx) {
        // 敵宇宙船の描画
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x, this.y + 8, this.width, 9);

        // 敵の先端
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x + 10, this.y + 5);
        ctx.lineTo(this.x + 10, this.y + this.height - 5);
        ctx.closePath();
        ctx.fill();

        // 敵のエンジン
        ctx.fillStyle = '#ff8888';
        ctx.fillRect(this.x + this.width, this.y + 10, 6, 5);
    }
}

// ゲーム開始
window.addEventListener('load', () => {
    new Game();
});