// 基地建設システム
class BaseSystem {
    constructor() {
        // 建築可能な構造物
        this.buildingTypes = {
            workbench: {
                name: 'ワークベンチ',
                description: 'クラフト成功率+10%',
                cost: { wood: 10, stone: 5 },
                bonus: { craftBonus: 0.1 }
            },
            furnace: {
                name: '溶鉱炉',
                description: '金属リソース採取量+20%',
                cost: { wood: 15, stone: 20 },
                bonus: { metalGatherBonus: 0.2 }
            },
            storage: {
                name: '倉庫',
                description: 'リソース保管上限+50',
                cost: { wood: 20, stone: 10 },
                bonus: { storageCapacity: 50 }
            },
            garden: {
                name: '薬草園',
                description: '薬草リソース採取量+20%',
                cost: { wood: 10, herb: 15 },
                bonus: { herbGatherBonus: 0.2 }
            },
            kitchen: {
                name: 'キッチン',
                description: '料理の回復量+30%',
                cost: { wood: 15, stone: 10 },
                bonus: { foodEfficiency: 0.3 }
            },
            training_dummy: {
                name: '訓練用ダミー',
                description: '経験値獲得+15%',
                cost: { wood: 15, stone: 15 },
                bonus: { expBonus: 0.15 }
            },
            bed: {
                name: 'ベッド',
                description: 'スタミナ回復速度+50%',
                cost: { wood: 20, herb: 5 },
                bonus: { staminaRegenBonus: 0.5 }
            },
            wall: {
                name: '防壁',
                description: '敵の出現率-10%',
                cost: { wood: 5, stone: 10 },
                bonus: { enemySpawnReduction: 0.1 }
            },
            campfire: {
                name: 'キャンプファイヤー',
                description: '夜間のスタミナ消費-20%',
                cost: { wood: 10 },
                bonus: { nightStaminaCostReduction: 0.2 }
            },
            well: {
                name: '井戸',
                description: '空腹増加速度-30%',
                cost: { stone: 30 },
                bonus: { hungerReduction: 0.3 }
            }
        };

        // 建設済みの建物
        this.buildings = [];

        // 基地レベル
        this.baseLevel = 1;
        this.baseExp = 0;
        this.baseExpToNextLevel = 100;

        // 基地の位置（ダンジョン内の特定位置）
        this.baseLocation = null;
        this.baseRadius = 100; // 基地の範囲
    }

    // 基地を設置
    setBaseLocation(x, y) {
        this.baseLocation = { x, y };
    }

    // 基地範囲内かチェック
    isInBaseArea(x, y) {
        if (!this.baseLocation) return false;
        const dx = x - this.baseLocation.x;
        const dy = y - this.baseLocation.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.baseRadius;
    }

    // 建物を建設可能かチェック
    canBuild(buildingType, resources) {
        const building = this.buildingTypes[buildingType];
        if (!building) return false;

        // コストチェック
        for (const [resource, amount] of Object.entries(building.cost)) {
            if (!resources[resource] || resources[resource] < amount) {
                return false;
            }
        }

        return true;
    }

    // 建物を建設
    build(buildingType, x, y, resources) {
        const building = this.buildingTypes[buildingType];
        if (!building) return { success: false, message: '不明な建物です' };

        if (!this.canBuild(buildingType, resources)) {
            return { success: false, message: 'リソースが不足しています' };
        }

        // リソースを消費
        for (const [resource, amount] of Object.entries(building.cost)) {
            resources[resource] -= amount;
        }

        // 建物を追加
        this.buildings.push({
            type: buildingType,
            x, y,
            name: building.name,
            bonus: building.bonus,
            level: 1,
            health: 100
        });

        // 基地経験値を獲得
        this.gainBaseExp(20);

        return {
            success: true,
            message: `${building.name}を建設しました！`,
            building: this.buildings[this.buildings.length - 1]
        };
    }

    // 建物をアップグレード
    upgradeBuilding(buildingIndex, resources) {
        if (buildingIndex < 0 || buildingIndex >= this.buildings.length) {
            return { success: false, message: '建物が見つかりません' };
        }

        const building = this.buildings[buildingIndex];
        const baseType = this.buildingTypes[building.type];

        // アップグレードコスト（レベル * 基本コスト * 1.5）
        const upgradeCost = {};
        for (const [resource, amount] of Object.entries(baseType.cost)) {
            upgradeCost[resource] = Math.floor(amount * building.level * 1.5);
        }

        // コストチェック
        for (const [resource, amount] of Object.entries(upgradeCost)) {
            if (!resources[resource] || resources[resource] < amount) {
                return { success: false, message: 'リソースが不足しています' };
            }
        }

        // リソースを消費
        for (const [resource, amount] of Object.entries(upgradeCost)) {
            resources[resource] -= amount;
        }

        // レベルアップとボーナス増加
        building.level++;
        for (const [bonusType, value] of Object.entries(building.bonus)) {
            building.bonus[bonusType] = value * 1.2; // 20%増加
        }

        this.gainBaseExp(30);

        return {
            success: true,
            message: `${building.name}をLv.${building.level}にアップグレードしました！`
        };
    }

    // 建物を修理
    repairBuilding(buildingIndex, resources) {
        if (buildingIndex < 0 || buildingIndex >= this.buildings.length) {
            return { success: false, message: '建物が見つかりません' };
        }

        const building = this.buildings[buildingIndex];
        if (building.health >= 100) {
            return { success: false, message: '修理の必要はありません' };
        }

        const repairCost = { wood: 5, stone: 5 };

        // コストチェック
        for (const [resource, amount] of Object.entries(repairCost)) {
            if (!resources[resource] || resources[resource] < amount) {
                return { success: false, message: 'リソースが不足しています' };
            }
        }

        // リソースを消費
        for (const [resource, amount] of Object.entries(repairCost)) {
            resources[resource] -= amount;
        }

        building.health = 100;

        return { success: true, message: `${building.name}を修理しました` };
    }

    // 全建物からのボーナスを計算
    getTotalBonuses() {
        const bonuses = {
            craftBonus: 0,
            metalGatherBonus: 0,
            herbGatherBonus: 0,
            storageCapacity: 0,
            foodEfficiency: 0,
            expBonus: 0,
            staminaRegenBonus: 0,
            enemySpawnReduction: 0,
            nightStaminaCostReduction: 0,
            hungerReduction: 0
        };

        for (const building of this.buildings) {
            for (const [bonusType, value] of Object.entries(building.bonus)) {
                bonuses[bonusType] = (bonuses[bonusType] || 0) + value;
            }
        }

        return bonuses;
    }

    // 基地経験値獲得
    gainBaseExp(amount) {
        this.baseExp += amount;

        while (this.baseExp >= this.baseExpToNextLevel) {
            this.baseExp -= this.baseExpToNextLevel;
            this.baseLevel++;
            this.baseExpToNextLevel = Math.floor(this.baseExpToNextLevel * 1.5);
            this.baseRadius += 10; // 基地範囲拡大

            return {
                levelUp: true,
                newLevel: this.baseLevel,
                message: `基地がレベル${this.baseLevel}になりました！基地範囲が拡大しました`
            };
        }

        return { levelUp: false };
    }

    // 建物の一覧を取得
    getBuildingsList() {
        return Object.entries(this.buildingTypes).map(([id, building]) => ({
            id,
            ...building
        }));
    }

    // 建設済み建物の情報
    getBuiltBuildings() {
        return this.buildings.map((building, index) => ({
            index,
            ...building
        }));
    }
}
