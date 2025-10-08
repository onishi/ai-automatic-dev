// クラフトシステム

class Recipe {
    constructor(id, name, type, requirements, output, unlocked = true) {
        this.id = id;
        this.name = name;
        this.type = type; // weapon, armor, consumable, special
        this.requirements = requirements; // { wood: { common: 5 }, ore: { rare: 2 } }
        this.output = output; // { itemType: 'weapon', itemId: 'sword', quality: 'normal' }
        this.unlocked = unlocked;
        this.craftLevel = 1;
    }

    canCraft(resourceManager) {
        for (let resourceType in this.requirements) {
            for (let rarity in this.requirements[resourceType]) {
                const required = this.requirements[resourceType][rarity];
                if (!resourceManager.hasResource(resourceType, rarity, required)) {
                    return false;
                }
            }
        }
        return true;
    }

    getMissingResources(resourceManager) {
        const missing = {};
        for (let resourceType in this.requirements) {
            for (let rarity in this.requirements[resourceType]) {
                const required = this.requirements[resourceType][rarity];
                const current = resourceManager.resources[resourceType][rarity];
                if (current < required) {
                    if (!missing[resourceType]) missing[resourceType] = {};
                    missing[resourceType][rarity] = required - current;
                }
            }
        }
        return missing;
    }
}

class CraftSystem {
    constructor() {
        this.recipes = [];
        this.craftingLevel = 1;
        this.craftingExp = 0;
        this.initializeRecipes();
    }

    initializeRecipes() {
        // 武器レシピ
        this.recipes.push(new Recipe(
            'wooden_sword',
            'Wooden Sword',
            'weapon',
            { wood: { common: 10 } },
            { itemType: 'weapon', subType: 'sword', baseDamage: 15, name: 'Wooden Sword' }
        ));

        this.recipes.push(new Recipe(
            'iron_sword',
            'Iron Sword',
            'weapon',
            { wood: { common: 5 }, ore: { common: 15 } },
            { itemType: 'weapon', subType: 'sword', baseDamage: 25, name: 'Iron Sword' }
        ));

        this.recipes.push(new Recipe(
            'steel_sword',
            'Steel Sword',
            'weapon',
            { wood: { rare: 5 }, ore: { rare: 20 } },
            { itemType: 'weapon', subType: 'sword', baseDamage: 40, name: 'Steel Sword' }
        ));

        this.recipes.push(new Recipe(
            'crystal_staff',
            'Crystal Staff',
            'weapon',
            { wood: { rare: 10 }, crystal: { rare: 15 } },
            { itemType: 'weapon', subType: 'staff', baseDamage: 35, magicBonus: 20, name: 'Crystal Staff' }
        ));

        // 防具レシピ
        this.recipes.push(new Recipe(
            'leather_armor',
            'Leather Armor',
            'armor',
            { wood: { common: 20 } },
            { itemType: 'armor', slot: 'body', defense: 10, name: 'Leather Armor' }
        ));

        this.recipes.push(new Recipe(
            'iron_armor',
            'Iron Armor',
            'armor',
            { ore: { common: 30 } },
            { itemType: 'armor', slot: 'body', defense: 25, name: 'Iron Armor' }
        ));

        this.recipes.push(new Recipe(
            'steel_armor',
            'Steel Armor',
            'armor',
            { ore: { rare: 25 } },
            { itemType: 'armor', slot: 'body', defense: 45, name: 'Steel Armor' }
        ));

        // 消費アイテムレシピ
        this.recipes.push(new Recipe(
            'health_potion',
            'Health Potion',
            'consumable',
            { herb: { common: 3 } },
            { itemType: 'consumable', effect: 'heal', power: 50, name: 'Health Potion' }
        ));

        this.recipes.push(new Recipe(
            'greater_health_potion',
            'Greater Health Potion',
            'consumable',
            { herb: { rare: 5 } },
            { itemType: 'consumable', effect: 'heal', power: 150, name: 'Greater Health Potion' }
        ));

        this.recipes.push(new Recipe(
            'mana_potion',
            'Mana Potion',
            'consumable',
            { crystal: { common: 3 } },
            { itemType: 'consumable', effect: 'mana', power: 30, name: 'Mana Potion' }
        ));

        this.recipes.push(new Recipe(
            'strength_potion',
            'Strength Potion',
            'consumable',
            { herb: { common: 2 }, ore: { common: 2 } },
            { itemType: 'consumable', effect: 'buff_strength', duration: 300, power: 10, name: 'Strength Potion' }
        ));

        this.recipes.push(new Recipe(
            'defense_potion',
            'Defense Potion',
            'consumable',
            { herb: { common: 2 }, crystal: { common: 2 } },
            { itemType: 'consumable', effect: 'buff_defense', duration: 300, power: 10, name: 'Defense Potion' }
        ));

        // 料理レシピ
        this.recipes.push(new Recipe(
            'simple_meal',
            'Simple Meal',
            'food',
            { food: { common: 5 } },
            { itemType: 'food', hunger: 30, stamina: 20, name: 'Simple Meal' }
        ));

        this.recipes.push(new Recipe(
            'hearty_meal',
            'Hearty Meal',
            'food',
            { food: { rare: 3 }, herb: { common: 2 } },
            { itemType: 'food', hunger: 50, stamina: 40, hp: 30, name: 'Hearty Meal' }
        ));

        this.recipes.push(new Recipe(
            'warriors_feast',
            'Warriors Feast',
            'food',
            { food: { rare: 5 }, herb: { rare: 2 }, ore: { common: 1 } },
            { itemType: 'food', hunger: 70, stamina: 60, buffStrength: 5, duration: 600, name: 'Warriors Feast' }
        ));
    }

    craft(recipeId, resourceManager, quality = 'normal') {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe || !recipe.unlocked) {
            return { success: false, message: 'Recipe not found or locked' };
        }

        if (!recipe.canCraft(resourceManager)) {
            return { success: false, message: 'Insufficient resources', missing: recipe.getMissingResources(resourceManager) };
        }

        // リソースを消費
        for (let resourceType in recipe.requirements) {
            for (let rarity in recipe.requirements[resourceType]) {
                const required = recipe.requirements[resourceType][rarity];
                resourceManager.removeResource(resourceType, rarity, required);
            }
        }

        // 品質を決定
        const finalQuality = this.determineQuality(quality);
        const qualityMultiplier = this.getQualityMultiplier(finalQuality);

        // アイテムを作成
        const item = this.createItem(recipe, finalQuality, qualityMultiplier);

        // 経験値獲得
        const exp = this.calculateCraftExp(recipe);
        this.addExp(exp);

        return {
            success: true,
            item: item,
            quality: finalQuality,
            exp: exp
        };
    }

    determineQuality(baseQuality) {
        const rand = Math.random();
        const levelBonus = this.craftingLevel * 0.01;

        if (rand < 0.4 + levelBonus) return 'fine';
        if (rand < 0.1 + levelBonus * 2) return 'superior';
        if (rand < 0.02 + levelBonus * 3) return 'masterwork';
        return 'normal';
    }

    getQualityMultiplier(quality) {
        const multipliers = {
            normal: 1.0,
            fine: 1.2,
            superior: 1.5,
            masterwork: 2.0
        };
        return multipliers[quality] || 1.0;
    }

    createItem(recipe, quality, multiplier) {
        const output = recipe.output;
        const item = {
            id: recipe.id + '_' + Date.now(),
            name: `${quality !== 'normal' ? quality + ' ' : ''}${output.name}`,
            type: output.itemType,
            quality: quality,
            rarity: this.qualityToRarity(quality)
        };

        // タイプ別のプロパティ設定
        if (output.itemType === 'weapon') {
            item.subType = output.subType;
            item.damage = Math.floor(output.baseDamage * multiplier);
            if (output.magicBonus) {
                item.magicBonus = Math.floor(output.magicBonus * multiplier);
            }
        } else if (output.itemType === 'armor') {
            item.slot = output.slot;
            item.defense = Math.floor(output.defense * multiplier);
        } else if (output.itemType === 'consumable') {
            item.effect = output.effect;
            item.power = Math.floor(output.power * multiplier);
            if (output.duration) item.duration = output.duration;
        } else if (output.itemType === 'food') {
            item.hunger = output.hunger;
            item.stamina = output.stamina;
            if (output.hp) item.hp = output.hp;
            if (output.buffStrength) {
                item.buffStrength = output.buffStrength;
                item.duration = output.duration;
            }
        }

        return item;
    }

    qualityToRarity(quality) {
        const mapping = {
            normal: 'common',
            fine: 'uncommon',
            superior: 'rare',
            masterwork: 'epic'
        };
        return mapping[quality] || 'common';
    }

    calculateCraftExp(recipe) {
        const baseExp = {
            weapon: 50,
            armor: 40,
            consumable: 20,
            food: 15
        };
        return baseExp[recipe.type] || 10;
    }

    addExp(exp) {
        this.craftingExp += exp;
        const requiredExp = this.craftingLevel * 100;
        if (this.craftingExp >= requiredExp) {
            this.craftingExp -= requiredExp;
            this.craftingLevel++;
            return true; // レベルアップした
        }
        return false;
    }

    getRecipesByType(type) {
        return this.recipes.filter(r => r.type === type && r.unlocked);
    }

    getAllRecipes() {
        return this.recipes.filter(r => r.unlocked);
    }

    unlockRecipe(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (recipe) {
            recipe.unlocked = true;
            return true;
        }
        return false;
    }

    save() {
        return {
            craftingLevel: this.craftingLevel,
            craftingExp: this.craftingExp,
            unlockedRecipes: this.recipes.filter(r => r.unlocked).map(r => r.id)
        };
    }

    load(data) {
        if (data) {
            this.craftingLevel = data.craftingLevel || 1;
            this.craftingExp = data.craftingExp || 0;
            if (data.unlockedRecipes) {
                this.recipes.forEach(r => {
                    r.unlocked = data.unlockedRecipes.includes(r.id);
                });
            }
        }
    }
}
