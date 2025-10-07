class EquipmentSystem {
    constructor(itemSystem) {
        this.itemSystem = itemSystem;
        this.equipmentSlots = {
            weapon: null,
            armor: null,
            shield: null,
            boots: null,
            accessory1: null,
            accessory2: null
        };

        this.slotTypes = {
            weapon: ['weapon'],
            armor: ['armor'],
            shield: ['armor'],
            boots: ['armor'],
            accessory1: ['accessory'],
            accessory2: ['accessory']
        };

        this.slotSubtypes = {
            weapon: ['melee', 'ranged', 'heavy'],
            armor: ['body'],
            shield: ['shield'],
            boots: ['boots'],
            accessory1: ['charm', 'ring'],
            accessory2: ['charm', 'ring']
        };
    }

    canEquipItem(item, slotName) {
        if (!item || !slotName) return false;

        const validTypes = this.slotTypes[slotName];
        const validSubtypes = this.slotSubtypes[slotName];

        const typeValid = validTypes.includes(item.type);
        const subtypeValid = validSubtypes.includes(item.subtype);

        return typeValid && subtypeValid;
    }

    equipItem(item, slotName, inventory) {
        if (!this.canEquipItem(item, slotName)) {
            return {
                success: false,
                message: 'このスロットには装備できません'
            };
        }

        // 既存の装備があれば外す
        const previousItem = this.equipmentSlots[slotName];
        if (previousItem) {
            this.unequipItem(slotName, inventory);
        }

        // アイテムをインベントリから削除
        const itemIndex = inventory.findIndex(invItem => invItem.id === item.id);
        if (itemIndex === -1) {
            return {
                success: false,
                message: 'アイテムが見つかりません'
            };
        }

        // スタックアイテムの場合は1つだけ装備
        let equipItem = item;
        if (item.stackable && item.quantity > 1) {
            equipItem = this.itemSystem.splitStack(item, 1);
        } else {
            inventory.splice(itemIndex, 1);
        }

        this.equipmentSlots[slotName] = equipItem;

        return {
            success: true,
            message: `${item.name}を装備しました`,
            equippedItem: equipItem,
            unequippedItem: previousItem
        };
    }

    unequipItem(slotName, inventory) {
        const item = this.equipmentSlots[slotName];
        if (!item) {
            return {
                success: false,
                message: 'そのスロットには何も装備されていません'
            };
        }

        this.equipmentSlots[slotName] = null;

        // インベントリに戻す
        if (item.stackable) {
            const existingItem = inventory.find(invItem =>
                invItem.templateKey === item.templateKey &&
                invItem.rarity === item.rarity
            );

            if (existingItem) {
                this.itemSystem.stackItems(existingItem, item);
            } else {
                inventory.push(item);
            }
        } else {
            inventory.push(item);
        }

        return {
            success: true,
            message: `${item.name}を外しました`,
            unequippedItem: item
        };
    }

    getTotalStats() {
        const totalStats = {
            attack: 0,
            defense: 0,
            health: 0,
            speed: 0,
            luck: 0,
            crit_rate: 0,
            life_steal: 0,
            damage_reflect: 0,
            damage_absorb: 0,
            absorb: 0,
            exp_bonus: 0,
            item_drop_rate: 0
        };

        // 装備中のアイテムから効果を合計
        for (const item of Object.values(this.equipmentSlots)) {
            if (item && item.effects) {
                for (const [stat, value] of Object.entries(item.effects)) {
                    if (totalStats.hasOwnProperty(stat)) {
                        totalStats[stat] += value;
                    }
                }

                // エンチャント効果も追加
                if (item.enchantments) {
                    for (const enchantment of item.enchantments) {
                        for (const [stat, value] of Object.entries(enchantment.effect)) {
                            if (totalStats.hasOwnProperty(stat)) {
                                totalStats[stat] += value;
                            }
                        }
                    }
                }
            }
        }

        return totalStats;
    }

    getEquippedItems() {
        return { ...this.equipmentSlots };
    }

    getItemInSlot(slotName) {
        return this.equipmentSlots[slotName];
    }

    getAvailableSlots(item) {
        const availableSlots = [];

        for (const [slotName, slotTypes] of Object.entries(this.slotTypes)) {
            if (this.canEquipItem(item, slotName)) {
                availableSlots.push(slotName);
            }
        }

        return availableSlots;
    }

    upgradeEquippedItem(slotName, upgradeLevel = 1) {
        const item = this.equipmentSlots[slotName];
        if (!item) {
            return {
                success: false,
                message: 'そのスロットには何も装備されていません'
            };
        }

        const success = this.itemSystem.upgradeItem(item, upgradeLevel);

        return {
            success: success,
            message: success ? `${item.name}をアップグレードしました` : 'アップグレードに失敗しました',
            upgradedItem: success ? item : null
        };
    }

    repairAllItems() {
        // 将来の拡張: 耐久度システム
        let repairedCount = 0;
        let totalCost = 0;

        for (const [slotName, item] of Object.entries(this.equipmentSlots)) {
            if (item && item.durability && item.durability < item.maxDurability) {
                const repairCost = Math.floor(item.price * 0.1 * (1 - item.durability / item.maxDurability));
                item.durability = item.maxDurability;
                totalCost += repairCost;
                repairedCount++;
            }
        }

        return {
            repairedCount: repairedCount,
            totalCost: totalCost
        };
    }

    getSetBonuses() {
        // セットボーナスシステム
        const equippedItems = Object.values(this.equipmentSlots).filter(item => item);
        const setBonuses = {};
        const setCounters = {};

        // アイテムのセット名をカウント
        for (const item of equippedItems) {
            if (item.setName) {
                setCounters[item.setName] = (setCounters[item.setName] || 0) + 1;
            }
        }

        // セットボーナスを計算
        for (const [setName, count] of Object.entries(setCounters)) {
            const bonuses = this.getSetBonusData(setName, count);
            if (bonuses) {
                setBonuses[setName] = bonuses;
            }
        }

        return setBonuses;
    }

    getSetBonusData(setName, pieceCount) {
        const setData = {
            'warrior_set': {
                2: { attack: 5, defense: 3 },
                4: { attack: 12, defense: 8, crit_rate: 0.1 },
                6: { attack: 25, defense: 20, crit_rate: 0.2, damage_reflect: 0.1 }
            },
            'guardian_set': {
                2: { defense: 8, health: 30 },
                4: { defense: 18, health: 70, absorb: 0.05 },
                6: { defense: 40, health: 150, absorb: 0.15, damage_absorb: 0.1 }
            },
            'explorer_set': {
                2: { speed: 3, luck: 2 },
                4: { speed: 8, luck: 5, item_drop_rate: 0.1 },
                6: { speed: 15, luck: 12, item_drop_rate: 0.25, exp_bonus: 0.2 }
            }
        };

        const set = setData[setName];
        if (!set) return null;

        let totalBonus = {};
        for (let i = 2; i <= pieceCount && i <= 6; i += 2) {
            if (set[i]) {
                for (const [stat, value] of Object.entries(set[i])) {
                    totalBonus[stat] = (totalBonus[stat] || 0) + value;
                }
            }
        }

        return Object.keys(totalBonus).length > 0 ? totalBonus : null;
    }

    getEquipmentSummary() {
        const equipped = this.getEquippedItems();
        const stats = this.getTotalStats();
        const setBonuses = this.getSetBonuses();

        return {
            equippedItems: equipped,
            totalStats: stats,
            setBonuses: setBonuses,
            equipmentCount: Object.values(equipped).filter(item => item).length
        };
    }

    autoEquipBestItems(inventory, playerStats) {
        const results = [];

        for (const [slotName, slotTypes] of Object.entries(this.slotTypes)) {
            const currentItem = this.equipmentSlots[slotName];
            let bestItem = null;
            let bestScore = currentItem ? this.calculateItemScore(currentItem, playerStats) : -1;

            // インベントリから最適なアイテムを探す
            for (const item of inventory) {
                if (this.canEquipItem(item, slotName)) {
                    const score = this.calculateItemScore(item, playerStats);
                    if (score > bestScore) {
                        bestItem = item;
                        bestScore = score;
                    }
                }
            }

            // より良いアイテムが見つかれば装備
            if (bestItem && bestItem !== currentItem) {
                const result = this.equipItem(bestItem, slotName, inventory);
                if (result.success) {
                    results.push({
                        slot: slotName,
                        item: bestItem.name,
                        improvement: bestScore
                    });
                }
            }
        }

        return results;
    }

    calculateItemScore(item, playerStats) {
        if (!item || !item.effects) return 0;

        let score = 0;
        const effects = item.effects;

        // 基本ステータスの重み付け
        score += (effects.attack || 0) * 1.0;
        score += (effects.defense || 0) * 0.8;
        score += (effects.health || 0) * 0.3;
        score += (effects.speed || 0) * 0.6;
        score += (effects.luck || 0) * 0.5;

        // 特殊効果の重み付け
        score += (effects.crit_rate || 0) * 50;
        score += (effects.life_steal || 0) * 40;
        score += (effects.damage_reflect || 0) * 30;
        score += (effects.exp_bonus || 0) * 25;

        return score;
    }
}