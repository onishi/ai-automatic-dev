// game.jsに追加する統合コード - フェーズ2-2

// Gameクラスのコンストラクタに追加する変数
/*
// ステージシステム
this.stageManager = new StageManager();
this.currentBoss = null;
this.showBossWarning = false;
this.bossWarningTime = 0;

// 武器システム
this.weaponSystem = new WeaponSystem();
this.stageElement = document.getElementById('stage');
this.weaponElement = document.getElementById('weapon');
this.progressElement = document.getElementById('progress');
*/

// bindEventsメソッドに追加するキーハンドリング
/*
// 武器切り替え
if (e.code === 'Digit1') this.weaponSystem.switchWeapon('basic');
if (e.code === 'Digit2') this.weaponSystem.switchWeapon('laser');
if (e.code === 'Digit3') this.weaponSystem.switchWeapon('missile');
if (e.code === 'Digit4') this.weaponSystem.switchWeapon('spread');
*/

// updateメソッドの射撃部分を置き換え
/*
// 射撃（新しい武器システム使用）
if (this.keys['Space'] && this.player.canShoot()) {
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
*/

// updateメソッドに追加するボス関連処理
/*
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
        this.currentBoss = new Boss(this.canvas.width - 100, this.canvas.height / 2, bossType);
    }
}

// ボス更新
if (this.currentBoss) {
    this.currentBoss.update();

    // ボスの弾とプレイヤーの衝突判定
    this.currentBoss.bullets.forEach(bullet => {
        if (this.checkCollision(bullet, this.player)) {
            this.player.takeDamage(10);
            if (this.player.hp <= 0) {
                this.gameState = 'gameOver';
            }
        }
    });

    // プレイヤーの弾とボスの衝突判定
    this.bullets = this.bullets.filter(bullet => {
        if (this.checkCollision(bullet, this.currentBoss)) {
            if (this.currentBoss.takeDamage(bullet.damage || 20)) {
                this.score += 1000;
                this.stageManager.bossKilled();
                this.currentBoss = null;
                this.weaponSystem.addExperience(100);

                // パーティクル生成
                for (let i = 0; i < 20; i++) {
                    this.particles.push(new Particle(
                        this.currentBoss.x + this.currentBoss.width / 2,
                        this.currentBoss.y + this.currentBoss.height / 2,
                        'explosion'
                    ));
                }

                // ステージクリア処理
                setTimeout(() => {
                    this.stageManager.nextStage();
                    this.updateUI();
                }, 2000);
            }
            return false;
        }
        return true;
    });
}
*/

// updateメソッドの敵撃破処理に追加
/*
// 経験値追加
this.weaponSystem.addExperience(10);
this.stageManager.enemyKilled();
*/

// renderメソッドに追加する描画処理
/*
// ボス警告表示
if (this.showBossWarning) {
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('WARNING', this.canvas.width / 2, this.canvas.height / 2 - 50);
    this.ctx.fillText('BOSS APPROACHING', this.canvas.width / 2, this.canvas.height / 2 + 10);
}

// ボス描画
if (this.currentBoss) {
    this.currentBoss.render(this.ctx);
}

// ステージ背景色
const stageConfig = this.stageManager.getCurrentStageConfig();
this.ctx.fillStyle = stageConfig.backgroundColor;
*/

// UIの更新メソッド
/*
updateUI() {
    if (this.stageElement) {
        this.stageElement.textContent = `Stage ${this.stageManager.currentStage}-1`;
    }

    if (this.weaponElement) {
        const weaponData = this.weaponSystem.getCurrentWeaponData();
        this.weaponElement.textContent = `Weapon: ${weaponData.name} Lv.${this.weaponSystem.weaponLevel}`;
    }

    if (this.progressElement) {
        const progress = this.stageManager.getStageProgress() * 100;
        this.progressElement.style.width = `${progress}%`;
    }
}
*/