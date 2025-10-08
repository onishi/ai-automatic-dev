class InventorySystem {
    constructor(itemSystem, equipmentSystem) {
        this.itemSystem = itemSystem;
        this.equipmentSystem = equipmentSystem;
        this.inventory = [];
        this.maxSlots = 40;
        this.sortMode = 'type'; // 'type', 'rarity', 'name', 'price'
        this.filterType = 'all'; // 'all', 'weapon', 'armor', 'consumable', 'material', 'accessory'
        this.selectedItems = [];
        this.currentPage = 0;
        this.itemsPerPage = 20;
    }

    addItem(item) {
        if (!item) return { success: false, message: 'アイテムが無効です' };

        // スタック可能アイテムの場合は既存アイテムとマージ
        if (item.stackable) {
            const existingItem = this.inventory.find(invItem =>
                invItem.templateKey === item.templateKey &&
                invItem.rarity === item.rarity &&
                invItem.upgradeLevel === item.upgradeLevel
            );

            if (existingItem) {
                if (this.itemSystem.stackItems(existingItem, item)) {
                    return {
                        success: true,
                        message: `${item.name}を${item.quantity}個追加しました`,
                        stacked: true
                    };
                }
            }
        }

        // インベントリが満杯かチェック
        if (this.getItemCount() >= this.maxSlots) {
            return {
                success: false,
                message: 'インベントリが満杯です',
                requiresSpace: true
            };
        }

        this.inventory.push(item);
        return {
            success: true,
            message: `${item.name}を追加しました`,
            stacked: false
        };
    }

    removeItem(itemId, quantity = 1) {
        const itemIndex = this.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return { success: false, message: 'アイテムが見つかりません' };
        }

        const item = this.inventory[itemIndex];

        if (item.stackable && item.quantity > quantity) {
            item.quantity -= quantity;
            return {
                success: true,
                message: `${item.name}を${quantity}個削除しました`,
                remainingQuantity: item.quantity
            };
        } else {
            const removedItem = this.inventory.splice(itemIndex, 1)[0];
            return {
                success: true,
                message: `${removedItem.name}を削除しました`,
                removedItem: removedItem
            };
        }
    }

    useItem(itemId) {
        const item = this.inventory.find(invItem => invItem.id === itemId);
        if (!item) {
            return { success: false, message: 'アイテムが見つかりません' };
        }

        if (item.type !== 'consumable') {
            return { success: false, message: 'このアイテムは使用できません' };
        }

        const useResult = this.applyItemEffect(item);

        // アイテムを消費
        if (useResult.success) {
            this.removeItem(itemId, 1);
        }

        return useResult;
    }

    applyItemEffect(item) {
        if (!item || !item.effects) {
            return { success: false, message: 'アイテムの効果が無効です' };
        }

        const effects = {};
        const messages = [];

        for (const [effectType, value] of Object.entries(item.effects)) {
            switch (effectType) {
                case 'heal':
                    effects.heal = value;
                    messages.push(`HPが${value}回復`);
                    break;
                case 'mana':
                    effects.mana = value;
                    messages.push(`マナが${value}回復`);
                    break;
                case 'attack_boost':
                    effects.attack_boost = {
                        value: value,
                        duration: item.effects.duration || 300
                    };
                    messages.push(`攻撃力が${value}上昇`);
                    break;
                case 'speed_boost':
                    effects.speed_boost = {
                        value: value,
                        duration: item.effects.duration || 300
                    };
                    messages.push(`速度が${value}上昇`);
                    break;
                default:
                    effects[effectType] = value;
            }
        }

        return {
            success: true,
            message: messages.join(', '),
            effects: effects
        };
    }

    getFilteredItems() {
        let filteredItems = this.inventory;

        // タイプフィルタリング
        if (this.filterType !== 'all') {
            filteredItems = filteredItems.filter(item => item.type === this.filterType);
        }

        return filteredItems;
    }

    getSortedItems() {
        const filtered = this.getFilteredItems();

        return filtered.sort((a, b) => {
            switch (this.sortMode) {
                case 'type':
                    if (a.type !== b.type) return a.type.localeCompare(b.type);
                    return a.name.localeCompare(b.name);

                case 'rarity':
                    const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
                    const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity]; // 降順
                    if (rarityDiff !== 0) return rarityDiff;
                    return a.name.localeCompare(b.name);

                case 'name':
                    return a.name.localeCompare(b.name);

                case 'price':
                    return b.price - a.price; // 降順

                default:
                    return 0;
            }
        });
    }

    getPageItems() {
        const sortedItems = this.getSortedItems();
        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;

        return {
            items: sortedItems.slice(startIndex, endIndex),
            currentPage: this.currentPage,
            totalPages: Math.ceil(sortedItems.length / this.itemsPerPage),
            totalItems: sortedItems.length
        };
    }

    nextPage() {
        const totalPages = Math.ceil(this.getSortedItems().length / this.itemsPerPage);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            return true;
        }
        return false;
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            return true;
        }
        return false;
    }

    setSortMode(mode) {
        const validModes = ['type', 'rarity', 'name', 'price'];
        if (validModes.includes(mode)) {
            this.sortMode = mode;
            this.currentPage = 0; // ページをリセット
            return true;
        }
        return false;
    }

    setFilterType(type) {
        const validTypes = ['all', 'weapon', 'armor', 'consumable', 'material', 'accessory'];
        if (validTypes.includes(type)) {
            this.filterType = type;
            this.currentPage = 0; // ページをリセット
            return true;
        }
        return false;
    }

    toggleItemSelection(itemId) {
        const index = this.selectedItems.indexOf(itemId);
        if (index === -1) {
            this.selectedItems.push(itemId);
        } else {
            this.selectedItems.splice(index, 1);
        }
    }

    clearSelection() {
        this.selectedItems = [];
    }

    getSelectedItems() {
        return this.selectedItems.map(id =>
            this.inventory.find(item => item.id === id)
        ).filter(item => item);
    }

    sellSelectedItems() {
        const selectedItems = this.getSelectedItems();
        let totalValue = 0;
        const results = [];

        for (const item of selectedItems) {
            const sellPrice = Math.floor(item.price * 0.4); // 40%の価値で売却
            totalValue += sellPrice;

            const removeResult = this.removeItem(item.id);
            if (removeResult.success) {
                results.push({
                    item: item.name,
                    price: sellPrice
                });
            }
        }

        this.clearSelection();

        return {
            success: true,
            soldItems: results,
            totalValue: totalValue,
            itemCount: results.length
        };
    }

    getItemCount() {
        return this.inventory.length;
    }

    getInventoryValue() {
        return this.inventory.reduce((total, item) => total + item.price, 0);
    }

    getItemsByType(type) {
        return this.inventory.filter(item => item.type === type);
    }

    getItemsByRarity(rarity) {
        return this.inventory.filter(item => item.rarity === rarity);
    }

    searchItems(query) {
        if (!query) return this.inventory;

        const lowerQuery = query.toLowerCase();
        return this.inventory.filter(item =>
            item.name.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery) ||
            item.type.toLowerCase().includes(lowerQuery)
        );
    }

    upgradeItem(itemId, materials) {
        const item = this.inventory.find(invItem => invItem.id === itemId);
        if (!item) {
            return { success: false, message: 'アイテムが見つかりません' };
        }

        if (item.type === 'consumable') {
            return { success: false, message: '消耗品はアップグレードできません' };
        }

        // アップグレード素材をチェック
        const requiredMaterials = this.getUpgradeRequirements(item);
        const availableMaterials = materials.filter(mat =>
            this.inventory.find(invItem => invItem.id === mat.id)
        );

        if (!this.hasRequiredMaterials(requiredMaterials, availableMaterials)) {
            return {
                success: false,
                message: '必要な素材が不足しています',
                required: requiredMaterials,
                available: availableMaterials
            };
        }

        // 素材を消費
        for (const material of requiredMaterials) {
            for (let i = 0; i < material.quantity; i++) {
                const matItem = this.inventory.find(invItem =>
                    invItem.templateKey === material.templateKey
                );
                if (matItem) {
                    this.removeItem(matItem.id, 1);
                }
            }
        }

        // アイテムをアップグレード
        const success = this.itemSystem.upgradeItem(item, 1);

        return {
            success: success,
            message: success ? `${item.name}をアップグレードしました` : 'アップグレードに失敗しました',
            item: item
        };
    }

    getUpgradeRequirements(item) {
        const baseRequirement = {
            'upgrade_crystal': 1 + item.upgradeLevel,
            'rare_ore': Math.floor(item.upgradeLevel / 2)
        };

        return Object.entries(baseRequirement)
            .filter(([, quantity]) => quantity > 0)
            .map(([templateKey, quantity]) => ({
                templateKey: templateKey,
                quantity: quantity
            }));
    }

    hasRequiredMaterials(required, available) {
        for (const req of required) {
            const availableCount = available
                .filter(mat => mat.templateKey === req.templateKey)
                .reduce((sum, mat) => sum + (mat.quantity || 1), 0);

            if (availableCount < req.quantity) {
                return false;
            }
        }
        return true;
    }

    getInventorySummary() {
        const summary = {
            totalItems: this.getItemCount(),
            maxSlots: this.maxSlots,
            freeSlots: this.maxSlots - this.getItemCount(),
            totalValue: this.getInventoryValue(),
            itemsByType: {},
            itemsByRarity: {},
            selectedCount: this.selectedItems.length
        };

        // タイプ別カウント
        for (const item of this.inventory) {
            summary.itemsByType[item.type] = (summary.itemsByType[item.type] || 0) + 1;
            summary.itemsByRarity[item.rarity] = (summary.itemsByRarity[item.rarity] || 0) + 1;
        }

        return summary;
    }

    autoSortInventory() {
        // 自動整理:同じアイテムをスタック、レアリティ順にソート
        const stacked = [];
        const nonStackable = [];

        // スタック可能アイテムをグループ化
        for (const item of this.inventory) {
            if (item.stackable) {
                const existing = stacked.find(stackItem =>
                    stackItem.templateKey === item.templateKey &&
                    stackItem.rarity === item.rarity
                );

                if (existing) {
                    existing.quantity += item.quantity;
                } else {
                    stacked.push({ ...item });
                }
            } else {
                nonStackable.push(item);
            }
        }

        // ソート
        stacked.sort((a, b) => this.compareItems(a, b));
        nonStackable.sort((a, b) => this.compareItems(a, b));

        this.inventory = [...stacked, ...nonStackable];

        return {
            success: true,
            message: 'インベントリを整理しました',
            itemsOrganized: this.inventory.length
        };
    }

    compareItems(a, b) {
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];

        if (rarityDiff !== 0) return rarityDiff;
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
    }

    exportInventory() {
        return {
            items: this.inventory,
            settings: {
                sortMode: this.sortMode,
                filterType: this.filterType,
                maxSlots: this.maxSlots
            },
            timestamp: Date.now()
        };
    }

    importInventory(data) {
        if (!data || !Array.isArray(data.items)) {
            return { success: false, message: '無効なデータです' };
        }

        this.inventory = data.items;
        if (data.settings) {
            this.sortMode = data.settings.sortMode || 'type';
            this.filterType = data.settings.filterType || 'all';
            this.maxSlots = data.settings.maxSlots || 40;
        }

        this.clearSelection();
        this.currentPage = 0;

        return {
            success: true,
            message: 'インベントリをインポートしました',
            itemCount: this.inventory.length
        };
    }
}
