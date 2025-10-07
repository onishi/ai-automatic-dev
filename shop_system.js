class ShopSystem {
    constructor(itemSystem) {
        this.itemSystem = itemSystem;
        this.shopInventory = [];
        this.maxItems = 12;
        this.restockTimer = 0;
        this.restockInterval = 30000; // 30秒
        this.priceMultiplier = 1.5; // 購入価格は基本価格の1.5倍
        this.sellMultiplier = 0.4;  // 売却価格は基本価格の40%

        this.shopTypes = {
            'general': {
                name: '雑貨商',
                itemTypes: ['consumable', 'material'],
                levelRange: [1, 3],
                rarityWeights: { common: 70, uncommon: 25, rare: 5 }
            },
            'weapon': {
                name: '武器商',
                itemTypes: ['weapon'],
                levelRange: [1, 5],
                rarityWeights: { common: 50, uncommon: 30, rare: 15, epic: 5 }
            },
            'armor': {
                name: '防具商',
                itemTypes: ['armor'],
                levelRange: [1, 5],
                rarityWeights: { common: 50, uncommon: 30, rare: 15, epic: 5 }
            },
            'luxury': {
                name: 'プレミアム商店',
                itemTypes: ['accessory', 'weapon', 'armor'],
                levelRange: [3, 10],
                rarityWeights: { uncommon: 30, rare: 40, epic: 25, legendary: 5 }
            }
        };

        this.currentShopType = 'general';
        this.discountRate = 0;
        this.reputation = 0; // 商店での評判
    }

    generateShopInventory(shopType = 'general', playerLevel = 1) {
        const shop = this.shopTypes[shopType];
        if (!shop) return;

        this.currentShopType = shopType;
        this.shopInventory = [];

        const itemCount = this.maxItems;
        const [minLevel, maxLevel] = shop.levelRange;
        const adjustedMinLevel = Math.max(1, playerLevel - 2);
        const adjustedMaxLevel = Math.min(maxLevel, playerLevel + 3);

        for (let i = 0; i < itemCount; i++) {
            const itemType = shop.itemTypes[Math.floor(Math.random() * shop.itemTypes.length)];
            const level = adjustedMinLevel + Math.floor(Math.random() * (adjustedMaxLevel - adjustedMinLevel + 1));
            const rarity = this.determineShopRarity(shop.rarityWeights);

            let item = null;
            let attempts = 0;

            // 指定されたタイプのアイテムを生成するまで試行
            while (!item && attempts < 10) {
                const generatedItem = this.itemSystem.generateRandomItem(level, rarity);
                if (generatedItem && generatedItem.type === itemType) {
                    item = generatedItem;
                }
                attempts++;
            }

            if (item) {
                // ショップ価格を設定
                item.shopPrice = Math.floor(item.price * this.priceMultiplier * (1 - this.discountRate));
                item.sellPrice = Math.floor(item.price * this.sellMultiplier);
                this.shopInventory.push(item);
            }
        }

        // 特別商品を追加（低確率）
        if (Math.random() < 0.1) {
            this.addSpecialItem(playerLevel);
        }

        this.sortShopInventory();
    }

    determineShopRarity(rarityWeights) {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const [rarity, weight] of Object.entries(rarityWeights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return rarity;
            }
        }

        return 'common';
    }

    addSpecialItem(playerLevel) {
        const specialItems = [
            { templateKey: 'rare_ore', rarity: 'rare' },
            { templateKey: 'upgrade_crystal', rarity: 'uncommon' },
            { templateKey: 'exp_ring', rarity: 'rare' }
        ];

        const special = specialItems[Math.floor(Math.random() * specialItems.length)];
        const item = this.itemSystem.createItemFromTemplate(special.templateKey, special.rarity, playerLevel);

        if (item) {
            item.shopPrice = Math.floor(item.price * this.priceMultiplier * 2); // 特別商品は高価
            item.sellPrice = Math.floor(item.price * this.sellMultiplier);
            item.isSpecial = true;
            this.shopInventory.push(item);
        }
    }

    sortShopInventory() {
        this.shopInventory.sort((a, b) => {
            const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
            const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];

            if (rarityDiff !== 0) return rarityDiff;
            return a.shopPrice - b.shopPrice;
        });
    }

    buyItem(itemIndex, playerCredits, playerInventory) {
        if (itemIndex < 0 || itemIndex >= this.shopInventory.length) {
            return {
                success: false,
                message: 'アイテムが見つかりません'
            };
        }

        const item = this.shopInventory[itemIndex];
        if (playerCredits < item.shopPrice) {
            return {
                success: false,
                message: 'クレジットが不足しています',
                required: item.shopPrice,
                available: playerCredits
            };
        }

        // アイテムをプレイヤーのインベントリに追加
        const purchasedItem = { ...item };
        delete purchasedItem.shopPrice;
        delete purchasedItem.sellPrice;
        delete purchasedItem.isSpecial;

        // スタック可能アイテムの場合は既存アイテムとマージ
        let addedToStack = false;
        if (purchasedItem.stackable) {
            const existingItem = playerInventory.find(invItem =>
                invItem.templateKey === purchasedItem.templateKey &&
                invItem.rarity === purchasedItem.rarity
            );

            if (existingItem) {
                this.itemSystem.stackItems(existingItem, purchasedItem);
                addedToStack = true;
            }
        }

        if (!addedToStack) {
            playerInventory.push(purchasedItem);
        }

        // ショップからアイテムを削除
        this.shopInventory.splice(itemIndex, 1);

        // 評判を上げる
        this.reputation += Math.floor(item.shopPrice / 100);

        return {
            success: true,
            message: `${item.name}を購入しました`,
            item: purchasedItem,
            cost: item.shopPrice,
            reputationGained: Math.floor(item.shopPrice / 100)
        };
    }

    sellItem(item, playerInventory) {
        if (!item) {
            return {
                success: false,
                message: 'アイテムが見つかりません'
            };
        }

        const sellPrice = item.sellPrice || Math.floor(item.price * this.sellMultiplier);

        // スタックアイテムの場合は1つだけ売る
        if (item.stackable && item.quantity > 1) {
            item.quantity--;
        } else {
            const itemIndex = playerInventory.findIndex(invItem => invItem.id === item.id);
            if (itemIndex !== -1) {
                playerInventory.splice(itemIndex, 1);
            }
        }

        return {
            success: true,
            message: `${item.name}を売却しました`,
            earned: sellPrice
        };
    }

    getShopInfo() {
        const shopInfo = this.shopTypes[this.currentShopType];
        return {
            name: shopInfo.name,
            type: this.currentShopType,
            inventory: this.shopInventory,
            itemCount: this.shopInventory.length,
            discountRate: this.discountRate,
            reputation: this.reputation
        };
    }

    applyDiscount(rate) {
        this.discountRate = Math.min(0.5, Math.max(0, rate)); // 最大50%割引

        // 既存アイテムの価格を更新
        for (const item of this.shopInventory) {
            const basePrice = Math.floor(item.price * this.priceMultiplier);
            item.shopPrice = Math.floor(basePrice * (1 - this.discountRate));
        }
    }

    updateReputationDiscount() {
        // 評判に応じた割引率を設定
        const reputationTiers = [
            { threshold: 1000, discount: 0.05 },  // 5%割引
            { threshold: 2500, discount: 0.10 },  // 10%割引
            { threshold: 5000, discount: 0.15 },  // 15%割引
            { threshold: 10000, discount: 0.20 }  // 20%割引
        ];

        let newDiscount = 0;
        for (const tier of reputationTiers) {
            if (this.reputation >= tier.threshold) {
                newDiscount = tier.discount;
            }
        }

        if (newDiscount !== this.discountRate) {
            this.applyDiscount(newDiscount);
        }
    }

    restockShop(playerLevel) {
        this.generateShopInventory(this.currentShopType, playerLevel);
        return {
            success: true,
            message: 'ショップの商品が補充されました',
            newItemCount: this.shopInventory.length
        };
    }

    update(deltaTime, playerLevel) {
        this.restockTimer += deltaTime;

        if (this.restockTimer >= this.restockInterval) {
            this.restockTimer = 0;
            this.restockShop(playerLevel);
        }

        this.updateReputationDiscount();
    }

    getReputationTier() {
        if (this.reputation >= 10000) return 'Diamond';
        if (this.reputation >= 5000) return 'Gold';
        if (this.reputation >= 2500) return 'Silver';
        if (this.reputation >= 1000) return 'Bronze';
        return 'None';
    }

    getShopTypeItems(shopType) {
        return this.shopTypes[shopType] || null;
    }

    changeShopType(newType) {
        if (this.shopTypes[newType]) {
            this.currentShopType = newType;
            return true;
        }
        return false;
    }

    getAvailableShopTypes() {
        return Object.keys(this.shopTypes);
    }

    calculateBulkDiscount(itemCount) {
        // 大量購入割引
        if (itemCount >= 5) return 0.1;  // 10%割引
        if (itemCount >= 3) return 0.05; // 5%割引
        return 0;
    }

    buyMultipleItems(itemIndices, playerCredits, playerInventory) {
        const results = [];
        let totalCost = 0;
        let remainingCredits = playerCredits;

        // まず総コストを計算
        const items = itemIndices.map(index => this.shopInventory[index]).filter(item => item);
        const bulkDiscount = this.calculateBulkDiscount(items.length);

        for (const item of items) {
            const discountedPrice = Math.floor(item.shopPrice * (1 - bulkDiscount));
            totalCost += discountedPrice;
        }

        if (totalCost > playerCredits) {
            return {
                success: false,
                message: 'クレジットが不足しています',
                required: totalCost,
                available: playerCredits
            };
        }

        // アイテムを順番に購入
        itemIndices.sort((a, b) => b - a); // 逆順でソートして削除時のインデックスずれを防ぐ

        for (const index of itemIndices) {
            const result = this.buyItem(index, remainingCredits, playerInventory);
            if (result.success) {
                const discountedCost = Math.floor(result.cost * (1 - bulkDiscount));
                remainingCredits -= discountedCost;
                results.push({
                    item: result.item,
                    cost: discountedCost
                });
            }
        }

        return {
            success: true,
            message: `${results.length}個のアイテムを購入しました`,
            items: results,
            totalCost: totalCost,
            bulkDiscount: bulkDiscount
        };
    }
}