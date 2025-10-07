// 武器システム - フェーズ2-2で追加

class WeaponSystem {
    constructor() {
        this.currentWeapon = 'basic';
        this.weaponLevel = 1;
        this.maxLevel = 5;
        this.experience = 0;
        this.experienceToNext = 100;

        this.weapons = {
            basic: {
                name: "プラズマキャノン",
                damage: 20,
                fireRate: 250,
                bulletSpeed: 8,
                bulletType: 'plasma'
            },
            laser: {
                name: "レーザービーム",
                damage: 15,
                fireRate: 150,
                bulletSpeed: 12,
                bulletType: 'laser'
            },
            missile: {
                name: "ホーミングミサイル",
                damage: 40,
                fireRate: 500,
                bulletSpeed: 6,
                bulletType: 'missile'
            },
            spread: {
                name: "スプレッドショット",
                damage: 12,
                fireRate: 200,
                bulletSpeed: 7,
                bulletType: 'spread'
            }
        };
    }

    getCurrentWeaponData() {
        const weapon = this.weapons[this.currentWeapon];
        const levelMultiplier = 1 + (this.weaponLevel - 1) * 0.2;

        return {
            ...weapon,
            damage: Math.floor(weapon.damage * levelMultiplier),
            fireRate: Math.max(50, weapon.fireRate - (this.weaponLevel - 1) * 20)
        };
    }

    addExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.experienceToNext && this.weaponLevel < this.maxLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.weaponLevel++;
        this.experience = 0;
        this.experienceToNext = 100 * this.weaponLevel;
        return true;
    }

    switchWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            this.currentWeapon = weaponType;
        }
    }

    createBullet(x, y, player) {
        const weaponData = this.getCurrentWeaponData();
        const bullets = [];

        switch (weaponData.bulletType) {
            case 'plasma':
                bullets.push(new WeaponBullet(x, y, weaponData.bulletSpeed, 0, 'plasma', weaponData.damage));
                break;

            case 'laser':
                bullets.push(new WeaponBullet(x, y, weaponData.bulletSpeed, 0, 'laser', weaponData.damage));
                break;

            case 'missile':
                bullets.push(new WeaponBullet(x, y, weaponData.bulletSpeed, 0, 'missile', weaponData.damage, player));
                break;

            case 'spread':
                // 3方向に射撃
                bullets.push(new WeaponBullet(x, y, weaponData.bulletSpeed, -1, 'spread', weaponData.damage));
                bullets.push(new WeaponBullet(x, y, weaponData.bulletSpeed, 0, 'spread', weaponData.damage));
                bullets.push(new WeaponBullet(x, y, weaponData.bulletSpeed, 1, 'spread', weaponData.damage));
                break;
        }

        return bullets;
    }
}

class WeaponBullet {
    constructor(x, y, vx, vy, type, damage, player = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.damage = damage;
        this.width = 8;
        this.height = 4;
        this.target = null;
        this.player = player;

        // タイプ別の設定
        if (type === 'laser') {
            this.width = 12;
            this.height = 3;
        } else if (type === 'missile') {
            this.width = 10;
            this.height = 6;
            this.homingRange = 150;
        } else if (type === 'spread') {
            this.width = 6;
            this.height = 6;
        }
    }

    update(enemies) {
        if (this.type === 'missile' && this.player) {
            // ホーミング機能
            let closestEnemy = null;
            let closestDistance = this.homingRange;

            enemies.forEach(enemy => {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
                );
                if (distance < closestDistance) {
                    closestEnemy = enemy;
                    closestDistance = distance;
                }
            });

            if (closestEnemy) {
                const angle = Math.atan2(closestEnemy.y - this.y, closestEnemy.x - this.x);
                this.vx += Math.cos(angle) * 0.3;
                this.vy += Math.sin(angle) * 0.3;

                // 最大速度制限
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 8) {
                    this.vx = (this.vx / speed) * 8;
                    this.vy = (this.vy / speed) * 8;
                }
            }
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    render(ctx) {
        ctx.save();

        switch (this.type) {
            case 'plasma':
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 6;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                break;

            case 'laser':
                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 8;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                break;

            case 'missile':
                ctx.fillStyle = '#ffff00';
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 5;

                // ミサイル形状
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width, this.y);
                ctx.lineTo(this.x + this.width - 3, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.closePath();
                ctx.fill();
                break;

            case 'spread':
                ctx.fillStyle = '#00ff00';
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 4;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                break;
        }

        ctx.restore();
        ctx.shadowBlur = 0;
    }
}