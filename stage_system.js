// ステージ管理システム - フェーズ2-2で追加

class StageManager {
    constructor() {
        this.currentStage = 1;
        this.currentSubStage = 1;
        this.enemiesKilled = 0;
        this.enemiesRequiredForBoss = 15;
        this.bossDefeated = false;
        this.stageStartTime = 0;

        this.stageConfigs = {
            1: {
                name: "宇宙空間の前哨戦",
                enemySpawnDelay: 1800,
                enemyTypes: ['normal', 'fast'],
                backgroundColor: '#000814'
            },
            2: {
                name: "小惑星地帯",
                enemySpawnDelay: 1500,
                enemyTypes: ['normal', 'fast', 'tank'],
                backgroundColor: '#001d3d'
            },
            3: {
                name: "敵要塞周辺",
                enemySpawnDelay: 1200,
                enemyTypes: ['normal', 'fast', 'tank'],
                backgroundColor: '#003566'
            }
        };
    }

    getCurrentStageConfig() {
        return this.stageConfigs[this.currentStage] || this.stageConfigs[1];
    }

    shouldSpawnBoss() {
        return this.enemiesKilled >= this.enemiesRequiredForBoss && !this.bossDefeated;
    }

    enemyKilled() {
        this.enemiesKilled++;
    }

    bossKilled() {
        this.bossDefeated = true;
    }

    nextStage() {
        this.currentStage++;
        this.enemiesKilled = 0;
        this.bossDefeated = false;
        this.stageStartTime = Date.now();
        this.enemiesRequiredForBoss = 15 + (this.currentStage - 1) * 5;
    }

    getStageProgress() {
        return Math.min(this.enemiesKilled / this.enemiesRequiredForBoss, 1.0);
    }
}

class Boss {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 80;
        this.height = 60;
        this.speed = 1;
        this.maxHP = 100;
        this.hp = this.maxHP;
        this.lastShot = 0;
        this.shootDelay = 1000;
        this.phase = 1;
        this.movePattern = 0;
        this.patternTimer = 0;
        this.bullets = [];

        // ボス種類に応じた設定
        if (type === 'asteroid') {
            this.width = 100;
            this.height = 80;
            this.maxHP = 150;
            this.hp = this.maxHP;
            this.shootDelay = 800;
        }
    }

    update() {
        this.patternTimer += 0.02;

        // 移動パターン
        if (this.movePattern === 0) {
            this.y += Math.sin(this.patternTimer) * 2;
        } else if (this.movePattern === 1) {
            this.y += Math.cos(this.patternTimer * 0.7) * 1.5;
            this.x += Math.sin(this.patternTimer * 0.5) * 0.5;
        }

        // 境界チェック
        if (this.y < 0) this.y = 0;
        if (this.y > 480 - this.height) this.y = 480 - this.height;
        if (this.x < 400) this.x = 400;
        if (this.x > 700) this.x = 700;

        // フェーズ変化
        if (this.hp < this.maxHP * 0.5 && this.phase === 1) {
            this.phase = 2;
            this.shootDelay *= 0.7;
            this.movePattern = 1;
        }

        // 弾丸更新
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.x > 0 && bullet.x < 800 && bullet.y > 0 && bullet.y < 480;
        });

        // 射撃
        if (Date.now() - this.lastShot > this.shootDelay) {
            this.shoot();
            this.lastShot = Date.now();
        }
    }

    shoot() {
        if (this.type === 'basic') {
            // 基本的な3方向射撃
            this.bullets.push(new EnemyBullet(this.x, this.y + this.height / 2, -4, 0));
            this.bullets.push(new EnemyBullet(this.x, this.y + this.height / 2, -3, -1));
            this.bullets.push(new EnemyBullet(this.x, this.y + this.height / 2, -3, 1));
        } else if (this.type === 'asteroid') {
            // 放射状射撃
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const vx = Math.cos(angle) * 3;
                const vy = Math.sin(angle) * 3;
                this.bullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, vx, vy));
            }
        }
    }

    takeDamage(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }

    render(ctx) {
        // HPバー描画
        const barWidth = 100;
        const barHeight = 8;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y - 20;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHP), barHeight);

        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // ボス本体描画
        ctx.save();

        if (this.type === 'basic') {
            // 基本ボス（三角形の宇宙船）
            ctx.fillStyle = '#ff4444';
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.closePath();
            ctx.fill();

            // エンジン描画
            ctx.fillStyle = '#00aaff';
            ctx.fillRect(this.x + this.width - 10, this.y + this.height / 2 - 5, 15, 10);

        } else if (this.type === 'asteroid') {
            // 小惑星ボス（六角形）
            ctx.fillStyle = '#888888';
            ctx.shadowColor = '#888888';
            ctx.shadowBlur = 8;

            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const radius = this.width / 2;

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
        ctx.shadowBlur = 0;

        // 弾丸描画
        this.bullets.forEach(bullet => bullet.render(ctx));
    }
}

class EnemyBullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 6;
        this.height = 6;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    render(ctx) {
        ctx.fillStyle = '#ff8800';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 4;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}