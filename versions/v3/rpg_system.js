class RPGSystem {
    constructor() {
        this.player = {
            level: 1,
            experience: 0,
            experienceToNext: 100,
            credits: 50,
            health: 100,
            maxHealth: 100,

            // ベースステータス
            baseStats: {
                attack: 10,
                defense: 5,
                speed: 5,
                luck: 5
            },

            // 装備ボーナス
            equipmentStats: {
                attack: 0,
                defense: 0,
                speed: 0,
                luck: 0
            },

            // 使用可能なステータスポイント
            availableStatPoints: 0,

            // 装備アイテム
            equipment: {
                weapon: null,
                shield: null,
                accessory: null
            },

            // インベントリ
            inventory: []
        };

        this.maxLevel = 50;
        this.statPointsPerLevel = 3;
    }

    // 総合ステータスを計算
    getTotalStats() {
        const base = this.player.baseStats;
        const equipment = this.player.equipmentStats;

        return {
            attack: base.attack + equipment.attack,
            defense: base.defense + equipment.defense,
            speed: base.speed + equipment.speed,
            luck: base.luck + equipment.luck
        };
    }

    // 経験値を追加
    addExperience(amount) {
        this.player.experience += amount;

        // レベルアップチェック
        let leveledUp = false;
        while (this.player.experience >= this.player.experienceToNext &&
               this.player.level < this.maxLevel) {

            this.player.experience -= this.player.experienceToNext;
            this.player.level++;
            this.player.availableStatPoints += this.statPointsPerLevel;

            // 次のレベルまでの経験値を計算（調整済み）
            this.player.experienceToNext = Math.floor(80 * Math.pow(1.15, this.player.level - 1));

            // レベルアップ時のヘルス回復
            this.player.maxHealth += 10;
            this.player.health = Math.min(this.player.health + 30, this.player.maxHealth);

            leveledUp = true;
        }

        return leveledUp;
    }

    // ステータスポイントを振る
    allocateStatPoint(statName) {
        if (this.player.availableStatPoints <= 0) return false;
        if (!this.player.baseStats.hasOwnProperty(statName)) return false;

        this.player.baseStats[statName]++;
        this.player.availableStatPoints--;

        // ステータスによる追加効果
        if (statName === 'attack') {
            // 攻撃力アップ時、少しヘルスも増える
            this.player.maxHealth += 2;
        } else if (statName === 'defense') {
            // 防御力アップ時、ヘルス大幅増加
            this.player.maxHealth += 5;
            this.player.health += 5;
        }

        return true;
    }

    // ダメージ計算
    calculateDamage(baseDamage, isPlayer = true) {
        const stats = this.getTotalStats();

        if (isPlayer) {
            // プレイヤーの攻撃ダメージ
            let damage = baseDamage + (stats.attack * 0.5);

            // クリティカル計算
            const criticalChance = Math.min(stats.luck * 0.02, 0.5); // 最大50%
            if (Math.random() < criticalChance) {
                damage *= 1.5 + (stats.luck * 0.01);
                return { damage: Math.floor(damage), critical: true };
            }

            return { damage: Math.floor(damage), critical: false };
        } else {
            // 敵からの被ダメージ
            const defense = stats.defense;
            const damageReduction = Math.min(defense * 0.02, 0.8); // 最大80%軽減
            const finalDamage = Math.max(1, Math.floor(baseDamage * (1 - damageReduction)));

            return { damage: finalDamage, critical: false };
        }
    }

    // ダメージを受ける
    takeDamage(damage) {
        const damageResult = this.calculateDamage(damage, false);
        this.player.health = Math.max(0, this.player.health - damageResult.damage);
        return damageResult;
    }

    // 回復
    heal(amount) {
        const oldHealth = this.player.health;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
        return this.player.health - oldHealth;
    }

    // クレジットを追加
    addCredits(amount) {
        const bonusMultiplier = 1 + (this.getTotalStats().luck * 0.01);
        const finalAmount = Math.floor(amount * bonusMultiplier);
        this.player.credits += finalAmount;
        return finalAmount;
    }

    // クレジットを消費
    spendCredits(amount) {
        if (this.player.credits >= amount) {
            this.player.credits -= amount;
            return true;
        }
        return false;
    }

    // アイテムを追加
    addItem(item) {
        this.player.inventory.push(item);
    }

    // アイテムを使用
    useItem(itemIndex) {
        if (itemIndex < 0 || itemIndex >= this.player.inventory.length) return false;

        const item = this.player.inventory[itemIndex];
        let used = false;

        switch (item.type) {
            case 'health_potion':
                const healed = this.heal(item.amount || 50);
                used = healed > 0;
                break;

            case 'weapon_upgrade':
                this.player.equipmentStats.attack += item.bonus || 5;
                used = true;
                break;

            case 'shield_upgrade':
                this.player.equipmentStats.defense += item.bonus || 3;
                used = true;
                break;

            case 'speed_boost':
                this.player.equipmentStats.speed += item.bonus || 2;
                used = true;
                break;
        }

        if (used) {
            this.player.inventory.splice(itemIndex, 1);
        }

        return used;
    }

    // プレイヤーが生きているか
    isAlive() {
        return this.player.health > 0;
    }

    // 死亡時の処理
    onDeath() {
        // クレジットの一部を保持
        const retainedCredits = Math.floor(this.player.credits * 0.5);

        // ステータスリセット（レベルは保持）
        const oldLevel = this.player.level;
        const oldMaxHealth = this.player.maxHealth;

        this.player.health = oldMaxHealth;
        this.player.credits = retainedCredits;
        this.player.inventory = [];
        this.player.equipmentStats = {
            attack: 0,
            defense: 0,
            speed: 0,
            luck: 0
        };

        return {
            retainedCredits: retainedCredits,
            level: oldLevel
        };
    }

    // ステータス画面用のデータを取得
    getStatusData() {
        const totalStats = this.getTotalStats();

        return {
            level: this.player.level,
            experience: this.player.experience,
            experienceToNext: this.player.experienceToNext,
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            credits: this.player.credits,
            availableStatPoints: this.player.availableStatPoints,
            baseStats: { ...this.player.baseStats },
            equipmentStats: { ...this.player.equipmentStats },
            totalStats: totalStats,
            inventory: [...this.player.inventory]
        };
    }

    // アイテムドロップの計算
    calculateItemDrop(baseDropRate = 0.3) {
        const luckBonus = this.getTotalStats().luck * 0.01;
        return Math.random() < (baseDropRate + luckBonus);
    }

    // セーブデータを取得
    getSaveData() {
        return {
            player: { ...this.player }
        };
    }

    // セーブデータを読み込み
    loadSaveData(data) {
        if (data && data.player) {
            this.player = { ...this.player, ...data.player };
        }
    }
}