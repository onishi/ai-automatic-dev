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

        // ステージシステム
        this.stageManager = new StageManager();
        this.currentBoss = null;
        this.showBossWarning = false;
        this.bossWarningTime = 0;

        // 武器システム
        this.weaponSystem = new WeaponSystem();

        // エフェクトシステム
        this.stars = this.initStars();
        this.showLevelUpEffect = false;
        this.levelUpEffectTime = 0;
        this.showStageClearEffect = false;
        this.stageClearEffectTime = 0;
        this.stageClearDelay = 3000;

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

    initStars() {
        const stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 1.5 + 0.5
            });
        }
        return stars;
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

            // 武器切り替え
            if (e.code === 'Digit1') this.weaponSystem.switchWeapon('basic');
            if (e.code === 'Digit2') this.weaponSystem.switchWeapon('laser');
            if (e.code === 'Digit3') this.weaponSystem.switchWeapon('missile');
            if (e.code === 'Digit4') this.weaponSystem.switchWeapon('spread');
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

        // システムをリセット
        this.stageManager = new StageManager();
        this.weaponSystem = new WeaponSystem();
        this.currentBoss = null;
        this.showBossWarning = false;
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;

        // 難易度調整
        this.difficulty = 1 + Math.floor((Date.now() - this.gameTime) / 20000);
        this.enemySpawnDelay = Math.max(800, 2000 - (this.difficulty - 1) * 200);

        // 星の更新
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        });

        // プレイヤー更新
        this.player.update(this.keys, this.canvas);

        // 射撃（新しい武器システム使用）
        if (this.keys['Space']) {
            const weaponData = this.weaponSystem.getCurrentWeaponData();
            if (Date.now() - this.player.lastShot > weaponData.fireRate) {
                const newBullets = this.weaponSystem.createBullet(
                    this.player.x + this.player.width,
                    this.player.y + this.player.height / 2,
                    this.player
                );
                this.bullets.push(...newBullets);
                this.player.lastShot = Date.now();
            }
        }

        // 弾丸更新（ホーミングミサイルのため敵リストを渡す）
        this.bullets = this.bullets.filter(bullet => {
            if (bullet.update) {
                bullet.update(this.enemies);
            }
            return bullet.x < this.canvas.width && bullet.x > -50 && bullet.y > -50 && bullet.y < this.canvas.height + 50;
        });

        // ボス出現チェック
        if (this.stageManager.shouldSpawnBoss() && !this.currentBoss && !this.showBossWarning) {
            this.showBossWarning = true;
            this.bossWarningTime = Date.now();
            this.enemies = []; // 通常敵をクリア
        }

        // ボス警告表示
        if (this.showBossWarning) {
            if (Date.now() - this.bossWarningTime > 2000) {
                this.showBossWarning = false;
                const bossType = this.stageManager.currentStage === 2 ? 'asteroid' : 'basic';
                this.currentBoss = new Boss(this.canvas.width - 100, this.canvas.height / 2 - 30, bossType);
            }
        }

        // 敵のスポーン（ボス戦中は通常敵をスポーンしない）
        if (!this.currentBoss && !this.showBossWarning && Date.now() - this.lastEnemySpawn > this.enemySpawnDelay) {
            const stageConfig = this.stageManager.getCurrentStageConfig();
            const enemyTypes = stageConfig.enemyTypes;
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.push(new Enemy(this.canvas.width, Math.random() * (this.canvas.height - 40), enemyType));
            this.lastEnemySpawn = Date.now();
            this.enemySpawnDelay = stageConfig.enemySpawnDelay;
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

        // ボス更新
        if (this.currentBoss) {
            this.currentBoss.update();
        }

        // ステージクリア処理
        if (this.showStageClearEffect && Date.now() - this.stageClearEffectTime > this.stageClearDelay) {
            this.stageManager.nextStage();
            this.showStageClearEffect = false;
        }

        // 衝突判定
        this.checkCollisions();
    }

    checkCollisions() {
        // プレイヤーの弾とボスの衝突判定
        if (this.currentBoss) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                if (this.isColliding(this.bullets[i], this.currentBoss)) {
                    const damage = this.bullets[i].damage || 20;
                    if (this.currentBoss.takeDamage(damage)) {
                        this.score += 1000;
                        this.scoreElement.textContent = this.score;
                        this.stageManager.bossKilled();
                        this.weaponSystem.addExperience(100);

                        // 大爆発エフェクト
                        for (let j = 0; j < 30; j++) {
                            this.particles.push(new Particle(
                                this.currentBoss.x + this.currentBoss.width / 2,
                                this.currentBoss.y + this.currentBoss.height / 2,
                                'explosion'
                            ));
                        }

                        this.currentBoss = null;

                        // ステージクリア演出
                        this.showStageClearEffect = true;
                        this.stageClearEffectTime = Date.now();
                    }
                    this.bullets.splice(i, 1);
                }
            }

            // ボスの弾とプレイヤーの衝突判定
            if (this.currentBoss) {
                for (let i = this.currentBoss.bullets.length - 1; i >= 0; i--) {
                    if (this.isColliding(this.currentBoss.bullets[i], this.player)) {
                        this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                        this.gameState = 'gameOver';
                        this.currentBoss.bullets.splice(i, 1);
                    }
                }
            }
        }

        // 弾丸と敵の衝突
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.isColliding(this.bullets[i], this.enemies[j])) {
                    const enemy = this.enemies[j];
                    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);

                    // スコアと経験値
                    let points = 10;
                    if (enemy.type === 'fast') points = 20;
                    else if (enemy.type === 'tank') points = 30;
                    this.score += points;
                    this.scoreElement.textContent = this.score;

                    const prevLevel = this.weaponSystem.weaponLevel;
                    this.weaponSystem.addExperience(10);
                    if (this.weaponSystem.weaponLevel > prevLevel) {
                        this.showLevelUpEffect = true;
                        this.levelUpEffectTime = Date.now();
                    }

                    this.stageManager.enemyKilled();
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
        // 背景グラデーション
        const stageConfig = this.stageManager.getCurrentStageConfig();
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, stageConfig.backgroundColor);
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
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

        // ボス描画
        if (this.currentBoss) {
            this.currentBoss.render(this.ctx);
        }

        // ボス警告表示
        if (this.showBossWarning) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, ' + (Math.sin(Date.now() * 0.01) * 0.3 + 0.5) + ')';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('WARNING', this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.ctx.fillText('BOSS APPROACHING', this.canvas.width / 2, this.canvas.height / 2 + 10);
        }

        // UI描画
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Courier New';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Stage: ${this.stageManager.currentStage}`, 10, 30);

        // 武器情報
        const weaponData = this.weaponSystem.getCurrentWeaponData();
        this.ctx.fillText(`Weapon: ${weaponData.name} Lv.${this.weaponSystem.weaponLevel}`, 10, 50);

        // ステージ進捗バー
        if (!this.currentBoss && !this.stageManager.bossDefeated) {
            const progress = this.stageManager.getStageProgress();
            const barWidth = 200;
            const barHeight = 12;
            const barX = 10;
            const barY = 60;

            this.ctx.fillStyle = '#333333';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Courier New';
            this.ctx.fillText('Boss Progress', barX, barY - 2);
        }

        // 武器切り替えヘルプ
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('1:Plasma 2:Laser 3:Missile 4:Spread', this.canvas.width - 10, this.canvas.height - 10);

        // プレイヤーのパワーアップ状態表示
        if (this.player.powerUpEndTime > Date.now()) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('RAPID FIRE!', 10, 90);
        }

        // レベルアップエフェクト
        if (this.showLevelUpEffect && Date.now() - this.levelUpEffectTime < 2000) {
            const alpha = 1 - (Date.now() - this.levelUpEffectTime) / 2000;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '36px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LEVEL UP!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.globalAlpha = 1.0;
        } else if (Date.now() - this.levelUpEffectTime >= 2000) {
            this.showLevelUpEffect = false;
        }

        // ステージクリアエフェクト
        if (this.showStageClearEffect) {
            const elapsed = Date.now() - this.stageClearEffectTime;
            const alpha = Math.min(1, elapsed / 500) * (1 - Math.max(0, elapsed - 2000) / 1000);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = '48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 20;
            this.ctx.fillText('STAGE CLEAR!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1.0;
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
        this.stars.forEach(star => {
            this.ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.5 + star.size / 5) + ')';
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
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

        if (type === 'tank') {
            this.width = 45;
            this.height = 35;
            this.speed = 1;
        } else if (type === 'fast') {
            this.width = 25;
            this.height = 20;
            this.speed = 4;
        } else {
            this.width = 30;
            this.height = 25;
            this.speed = 2;
        }
    }

    update() {
        this.x -= this.speed;
    }

    render(ctx) {
        if (this.type === 'tank') {
            // タンク型敵（大型で頑丈）
            ctx.fillStyle = '#8844ff';
            ctx.shadowColor = '#8844ff';
            ctx.shadowBlur = 5;
            ctx.fillRect(this.x, this.y + 10, this.width, 15);

            // 先端
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height / 2);
            ctx.lineTo(this.x + 12, this.y + 5);
            ctx.lineTo(this.x + 12, this.y + this.height - 5);
            ctx.closePath();
            ctx.fill();

            // エンジン
            ctx.fillStyle = '#aa66ff';
            ctx.fillRect(this.x + this.width, this.y + 12, 8, 11);
            ctx.shadowBlur = 0;
        } else {
            // 通常・高速型敵
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
            const colorVariant = Math.random();
            if (colorVariant < 0.33) this.color = '#ff4444';
            else if (colorVariant < 0.66) this.color = '#ffaa00';
            else this.color = '#ffff44';
        } else if (type === 'powerup') {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.color = '#00ff00';
        }

        this.size = Math.random() * 4 + 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // グロー効果
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 2;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        ctx.restore();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
}

// ゲーム開始
window.addEventListener('load', () => {
    new Game();
});
