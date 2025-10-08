class ItemSystem {
    constructor() {
        this.itemTemplates = this.initializeItemTemplates();
        this.rarityWeights = {
            'common': 60,
            'uncommon': 25,
            'rare': 12,
            'epic': 2,
            'legendary': 1
        };
    }

    initializeItemTemplates() {
        return {
            // 消耗品
            'health_potion': {
                name: '体力ポーション',
                type: 'consumable',
                subtype: 'healing',
                baseEffect: { heal: 50 },
                description: 'HPを回復する',
                basePrice: 20,
                stackable: true
            },
            'mana_potion': {
                name: 'マナポーション',
                type: 'consumable',
                subtype: 'mana',
                baseEffect: { mana: 30 },
                description: '特殊攻撃の回数を回復する',
                basePrice: 25,
                stackable: true
            },
            'strength_potion': {
                name: '力のポーション',
                type: 'consumable',
                subtype: 'buff',
                baseEffect: { attack_boost: 5, duration: 300 },
                description: '一定時間攻撃力を上げる',
                basePrice: 40,
                stackable: true
            },

            // 武器
            'basic_sword': {
                name: '鉄の剣',
                type: 'weapon',
                subtype: 'melee',
                baseEffect: { attack: 8 },
                description: '標準的な剣',
                basePrice: 100,
                stackable: false
            },
            'laser_rifle': {
                name: 'レーザーライフル',
                type: 'weapon',
                subtype: 'ranged',
                baseEffect: { attack: 12, special_damage: 5 },
                description: '高威力の光線武器',
                basePrice: 200,
                stackable: false
            },
            'plasma_cannon': {
                name: 'プラズマキャノン',
                type: 'weapon',
                subtype: 'heavy',
                baseEffect: { attack: 20, crit_rate: 0.1 },
                description: '重装備の大型武器',
                basePrice: 500,
                stackable: false
            },

            // 防具
            'basic_armor': {
                name: 'プロテクトスーツ',
                type: 'armor',
                subtype: 'body',
                baseEffect: { defense: 5, health: 20 },
                description: '基本的な防護服',
                basePrice: 80,
                stackable: false
            },
            'energy_shield': {
                name: 'エネルギーシールド',
                type: 'armor',
                subtype: 'shield',
                baseEffect: { defense: 8, absorb: 0.1 },
                description: 'ダメージを吸収するシールド',
                basePrice: 150,
                stackable: false
            },
            'power_boots': {
                name: 'パワーブーツ',
                type: 'armor',
                subtype: 'boots',
                baseEffect: { speed: 3, luck: 1 },
                description: '移動速度を上げるブーツ',
                basePrice: 120,
                stackable: false
            },

            // アクセサリー
            'luck_charm': {
                name: 'ラッキーチャーム',
                type: 'accessory',
                subtype: 'charm',
                baseEffect: { luck: 5, item_drop_rate: 0.15 },
                description: '運を上げるお守り',
                basePrice: 200,
                stackable: false
            },
            'exp_ring': {
                name: '経験の指輪',
                type: 'accessory',
                subtype: 'ring',
                baseEffect: { exp_bonus: 0.2 },
                description: '経験値を多く得られる',
                basePrice: 300,
                stackable: false
            },

            // 強化素材
            'upgrade_crystal': {
                name: '強化クリスタル',
                type: 'material',
                subtype: 'upgrade',
                baseEffect: { upgrade_power: 1 },
                description: '装備を強化する',
                basePrice: 50,
                stackable: true
            },
            'rare_ore': {
                name: 'レアオア',
                type: 'material',
                subtype: 'crafting',
                baseEffect: { craft_bonus: 0.3 },
                description: 'アイテム作成の素材',
                basePrice: 75,
                stackable: true
            }
        };
    }

    generateRandomItem(playerLevel = 1, forceRarity = null) {
        const rarity = forceRarity || this.determineRarity();
        const itemKeys = Object.keys(this.itemTemplates);
        const templateKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];

        return this.createItemFromTemplate(templateKey, rarity, playerLevel);
    }

    createItemFromTemplate(templateKey, rarity = 'common', playerLevel = 1) {
        const template = this.itemTemplates[templateKey];
        if (!template) {
            console.error(`Item template not found: ${templateKey}`);
            // フォールバック:基本的なアイテムテンプレートを返す
            const fallbackTemplate = this.itemTemplates['health_potion'] || Object.values(this.itemTemplates)[0];
            if (!fallbackTemplate) return null;
            console.warn(`Using fallback template: ${Object.keys(this.itemTemplates)[0]}`);
            return this.createItemFromTemplate(Object.keys(this.itemTemplates)[0], rarity, playerLevel);
        }

        const rarityMultiplier = this.getRarityMultiplier(rarity);
        const levelScaling = 1 + (playerLevel - 1) * 0.1;

        const item = {
            id: this.generateItemId(),
            templateKey: templateKey,
            name: this.applyRarityToName(template.name, rarity),
            type: template.type,
            subtype: template.subtype,
            rarity: rarity,
            level: playerLevel,
            description: template.description,
            price: Math.floor(template.basePrice * rarityMultiplier * levelScaling),
            stackable: template.stackable,
            quantity: template.stackable ? 1 : undefined,
            effects: this.calculateItemEffects(template.baseEffect, rarityMultiplier, levelScaling),
            enchantments: [],
            upgradeLevel: 0
        };

        // レアリティに応じた特殊効果
        this.applyRarityBonuses(item, rarity);

        return item;
    }

    determineRarity() {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const [rarity, weight] of Object.entries(this.rarityWeights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return rarity;
            }
        }

        return 'common';
    }

    getRarityMultiplier(rarity) {
        const multipliers = {
            'common': 1,
            'uncommon': 1.3,
            'rare': 1.7,
            'epic': 2.5,
            'legendary': 4
        };
        return multipliers[rarity] || 1;
    }

    applyRarityToName(baseName, rarity) {
        const rarityPrefixes = {
            'common': '',
            'uncommon': '上質な',
            'rare': 'レアな',
            'epic': 'エピックな',
            'legendary': '伝説の'
        };

        const prefix = rarityPrefixes[rarity] || '';
        return prefix + baseName;
    }

    calculateItemEffects(baseEffect, rarityMultiplier, levelScaling) {
        const effects = {};

        for (const [stat, value] of Object.entries(baseEffect)) {
            if (typeof value === 'number') {
                effects[stat] = Math.floor(value * rarityMultiplier * levelScaling);
            } else {
                effects[stat] = value;
            }
        }

        return effects;
    }

    applyRarityBonuses(item, rarity) {
        // レアリティに応じた追加効果
        switch (rarity) {
            case 'uncommon':
                if (Math.random() < 0.3) {
                    item.enchantments.push(this.getRandomEnchantment('minor'));
                }
                break;
            case 'rare':
                item.enchantments.push(this.getRandomEnchantment('minor'));
                if (Math.random() < 0.5) {
                    item.enchantments.push(this.getRandomEnchantment('moderate'));
                }
                break;
            case 'epic':
                item.enchantments.push(this.getRandomEnchantment('moderate'));
                item.enchantments.push(this.getRandomEnchantment('major'));
                break;
            case 'legendary':
                item.enchantments.push(this.getRandomEnchantment('major'));
                item.enchantments.push(this.getRandomEnchantment('legendary'));
                break;
        }
    }

    getRandomEnchantment(tier) {
        const enchantments = {
            'minor': [
                { name: '軽微な攻撃力強化', effect: { attack: 2 } },
                { name: '軽微な防御力強化', effect: { defense: 1 } },
                { name: '軽微な速度強化', effect: { speed: 1 } }
            ],
            'moderate': [
                { name: '攻撃力強化', effect: { attack: 5 } },
                { name: '防御力強化', effect: { defense: 3 } },
                { name: 'クリティカル率強化', effect: { crit_rate: 0.05 } }
            ],
            'major': [
                { name: '大攻撃力強化', effect: { attack: 10 } },
                { name: '大防御力強化', effect: { defense: 7 } },
                { name: 'ライフスティール', effect: { life_steal: 0.1 } }
            ],
            'legendary': [
                { name: '全ステータス強化', effect: { attack: 8, defense: 5, speed: 3, luck: 2 } },
                { name: 'ダメージ反射', effect: { damage_reflect: 0.2 } },
                { name: 'ダメージ吸収', effect: { damage_absorb: 0.15 } }
            ]
        };

        const tierEnchantments = enchantments[tier] || enchantments['minor'];
        return tierEnchantments[Math.floor(Math.random() * tierEnchantments.length)];
    }

    upgradeItem(item, upgradeLevel = 1) {
        if (!item || item.upgradeLevel >= 10) return false;

        item.upgradeLevel = Math.min(item.upgradeLevel + upgradeLevel, 10);

        // アップグレードによる効果増加
        const upgradeMultiplier = 1 + (item.upgradeLevel * 0.1);
        const originalEffects = this.itemTemplates[item.templateKey].baseEffect;
        const rarityMultiplier = this.getRarityMultiplier(item.rarity);
        const levelScaling = 1 + (item.level - 1) * 0.1;

        item.effects = this.calculateItemEffects(originalEffects, rarityMultiplier * upgradeMultiplier, levelScaling);
        item.name = item.name.replace(/\+\d+/, '') + (item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '');

        return true;
    }

    generateItemId() {
        return 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }

    getItemsByType(items, type, subtype = null) {
        return items.filter(item => {
            const typeMatch = item.type === type;
            const subtypeMatch = subtype ? item.subtype === subtype : true;
            return typeMatch && subtypeMatch;
        });
    }

    stackItems(existingItem, newItem) {
        if (!existingItem.stackable || !newItem.stackable) return false;
        if (existingItem.templateKey !== newItem.templateKey) return false;
        if (existingItem.rarity !== newItem.rarity) return false;

        existingItem.quantity += newItem.quantity;
        return true;
    }

    splitStack(item, amount) {
        if (!item.stackable || item.quantity <= amount) return null;

        const newItem = { ...item };
        newItem.id = this.generateItemId();
        newItem.quantity = amount;

        item.quantity -= amount;

        return newItem;
    }

    getItemDisplayInfo(item) {
        const rarityColors = {
            'common': '#ffffff',
            'uncommon': '#1eff00',
            'rare': '#0070dd',
            'epic': '#a335ee',
            'legendary': '#ff8000'
        };

        return {
            displayName: item.name + (item.quantity > 1 ? ` (x${item.quantity})` : ''),
            color: rarityColors[item.rarity] || '#ffffff',
            effects: item.effects,
            enchantments: item.enchantments,
            description: item.description,
            price: item.price
        };
    }
}
