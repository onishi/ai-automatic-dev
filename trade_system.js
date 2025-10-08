// トレード・マーケットシステム
class TradeSystem {
    constructor() {
        // プレイヤー間トレード
        this.tradeOffers = [];
        this.activeTrade = null;

        // マーケット（オークションハウス）
        this.marketListings = [];
        this.playerListings = [];
        this.purchaseHistory = [];
        this.salesHistory = [];

        // マーケット手数料
        this.marketFeeRate = 0.05; // 5%

        // トレードリクエスト
        this.pendingTradeRequest = null;

        // NPCトレーダー
        this.npcTraders = [
            {
                id: 'resource_trader',
                name: 'リソース商人',
                type: 'resource',
                trades: [
                    { give: { wood: 10 }, receive: { gold: 20 } },
                    { give: { stone: 10 }, receive: { gold: 25 } },
                    { give: { herb: 10 }, receive: { gold: 30 } },
                    { give: { crystal: 5 }, receive: { gold: 100 } },
                    { give: { gold: 50 }, receive: { wood: 20, stone: 10 } }
                ]
            },
            {
                id: 'rare_trader',
                name: 'レア商人',
                type: 'rare',
                trades: [
                    { give: { crystal: 10, gold: 100 }, receive: { rare_sword: 1 } },
                    { give: { crystal: 15, gold: 150 }, receive: { rare_armor: 1 } },
                    { give: { wood: 50, stone: 50 }, receive: { crystal: 5 } }
                ]
            },
            {
                id: 'wandering_merchant',
                name: '行商人',
                type: 'special',
                trades: [
                    { give: { gold: 200 }, receive: { teleport_scroll: 1 } },
                    { give: { gold: 150, crystal: 5 }, receive: { revival_token: 1 } },
                    { give: { crystal: 20 }, receive: { legendary_material: 1 } }
                ],
                spawnChance: 0.1 // 10%の確率で出現
            }
        ];

        // 現在利用可能なNPCトレーダー
        this.availableTraders = ['resource_trader', 'rare_trader'];
    }

    // プレイヤー間トレードリクエストを送る
    sendTradeRequest(targetPlayerId, playerName) {
        return {
            success: true,
            message: `${playerName}にトレードリクエストを送信しました`,
            request: {
                targetPlayerId,
                playerName,
                timestamp: Date.now()
            }
        };
    }

    // トレードリクエストを受け入れる
    acceptTradeRequest(requestId) {
        this.activeTrade = {
            id: requestId,
            playerOffer: { items: [], resources: {}, gold: 0 },
            partnerOffer: { items: [], resources: {}, gold: 0 },
            playerReady: false,
            partnerReady: false,
            startTime: Date.now()
        };

        return {
            success: true,
            message: 'トレードを開始しました',
            trade: this.activeTrade
        };
    }

    // トレードにアイテムを追加
    addToTrade(item, isPlayer = true) {
        if (!this.activeTrade) {
            return { success: false, message: 'アクティブなトレードがありません' };
        }

        const offer = isPlayer ? this.activeTrade.playerOffer : this.activeTrade.partnerOffer;

        if (item.type === 'item') {
            offer.items.push(item);
        } else if (item.type === 'resource') {
            offer.resources[item.resourceType] = (offer.resources[item.resourceType] || 0) + item.amount;
        } else if (item.type === 'gold') {
            offer.gold += item.amount;
        }

        // 準備状態をリセット
        this.activeTrade.playerReady = false;
        this.activeTrade.partnerReady = false;

        return { success: true, offer };
    }

    // トレード準備完了
    setTradeReady(isPlayer = true) {
        if (!this.activeTrade) {
            return { success: false, message: 'アクティブなトレードがありません' };
        }

        if (isPlayer) {
            this.activeTrade.playerReady = true;
        } else {
            this.activeTrade.partnerReady = true;
        }

        // 両方が準備完了ならトレード成立
        if (this.activeTrade.playerReady && this.activeTrade.partnerReady) {
            return this.completeTrade();
        }

        return { success: true, message: '準備完了' };
    }

    // トレード成立
    completeTrade() {
        const trade = this.activeTrade;

        // トレード履歴に記録
        this.tradeOffers.push({
            ...trade,
            completedAt: Date.now()
        });

        this.activeTrade = null;

        return {
            success: true,
            message: 'トレードが成立しました',
            playerReceived: trade.partnerOffer,
            playerGave: trade.playerOffer
        };
    }

    // トレードをキャンセル
    cancelTrade() {
        if (!this.activeTrade) {
            return { success: false, message: 'アクティブなトレードがありません' };
        }

        this.activeTrade = null;
        return { success: true, message: 'トレードをキャンセルしました' };
    }

    // マーケットに出品
    listOnMarket(item, price, quantity = 1) {
        const listing = {
            id: Date.now() + Math.random(),
            item,
            price,
            quantity,
            seller: 'player',
            listedAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7日後
        };

        this.marketListings.push(listing);
        this.playerListings.push(listing);

        return {
            success: true,
            message: `${item.name} x${quantity}を${price}ゴールドで出品しました`,
            listing
        };
    }

    // マーケットから購入
    buyFromMarket(listingId, buyerGold) {
        const listingIndex = this.marketListings.findIndex(l => l.id === listingId);
        if (listingIndex === -1) {
            return { success: false, message: '出品が見つかりません' };
        }

        const listing = this.marketListings[listingIndex];

        // 価格チェック
        if (buyerGold < listing.price) {
            return { success: false, message: 'ゴールドが不足しています' };
        }

        // 手数料計算
        const fee = Math.floor(listing.price * this.marketFeeRate);
        const sellerProfit = listing.price - fee;

        // 購入履歴に記録
        this.purchaseHistory.push({
            ...listing,
            purchasedAt: Date.now(),
            fee
        });

        // マーケットから削除
        this.marketListings.splice(listingIndex, 1);

        // プレイヤーの出品リストからも削除
        const playerListingIndex = this.playerListings.findIndex(l => l.id === listingId);
        if (playerListingIndex !== -1) {
            this.playerListings.splice(playerListingIndex, 1);
        }

        return {
            success: true,
            message: `${listing.item.name}を購入しました`,
            item: listing.item,
            quantity: listing.quantity,
            totalCost: listing.price,
            fee
        };
    }

    // 出品をキャンセル
    cancelListing(listingId) {
        const listingIndex = this.marketListings.findIndex(l => l.id === listingId && l.seller === 'player');
        if (listingIndex === -1) {
            return { success: false, message: '出品が見つかりません' };
        }

        const listing = this.marketListings.splice(listingIndex, 1)[0];

        // プレイヤーの出品リストからも削除
        const playerListingIndex = this.playerListings.findIndex(l => l.id === listingId);
        if (playerListingIndex !== -1) {
            this.playerListings.splice(playerListingIndex, 1);
        }

        return {
            success: true,
            message: '出品をキャンセルしました',
            item: listing.item,
            quantity: listing.quantity
        };
    }

    // マーケット検索
    searchMarket(filters = {}) {
        let results = [...this.marketListings];

        // フィルタリング
        if (filters.itemType) {
            results = results.filter(l => l.item.type === filters.itemType);
        }

        if (filters.rarity) {
            results = results.filter(l => l.item.rarity === filters.rarity);
        }

        if (filters.maxPrice) {
            results = results.filter(l => l.price <= filters.maxPrice);
        }

        if (filters.minPrice) {
            results = results.filter(l => l.price >= filters.minPrice);
        }

        if (filters.searchText) {
            const text = filters.searchText.toLowerCase();
            results = results.filter(l =>
                l.item.name.toLowerCase().includes(text) ||
                (l.item.description && l.item.description.toLowerCase().includes(text))
            );
        }

        // ソート
        if (filters.sortBy === 'price_asc') {
            results.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === 'price_desc') {
            results.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === 'newest') {
            results.sort((a, b) => b.listedAt - a.listedAt);
        }

        return results;
    }

    // NPCトレーダーと取引
    tradeWithNPC(traderId, tradeIndex, playerResources) {
        const trader = this.npcTraders.find(t => t.id === traderId);
        if (!trader) {
            return { success: false, message: 'トレーダーが見つかりません' };
        }

        if (!this.availableTraders.includes(traderId)) {
            return { success: false, message: 'このトレーダーは現在利用できません' };
        }

        if (tradeIndex < 0 || tradeIndex >= trader.trades.length) {
            return { success: false, message: '無効な取引です' };
        }

        const trade = trader.trades[tradeIndex];

        // リソース/アイテムチェック
        for (const [resource, amount] of Object.entries(trade.give)) {
            if (!playerResources[resource] || playerResources[resource] < amount) {
                return { success: false, message: `${resource}が不足しています` };
            }
        }

        // リソースを消費
        for (const [resource, amount] of Object.entries(trade.give)) {
            playerResources[resource] -= amount;
        }

        return {
            success: true,
            message: `${trader.name}と取引しました`,
            received: trade.receive,
            gave: trade.give
        };
    }

    // 行商人の出現チェック
    checkWanderingMerchant() {
        const wanderingMerchant = this.npcTraders.find(t => t.id === 'wandering_merchant');
        if (!wanderingMerchant) return false;

        if (Math.random() < wanderingMerchant.spawnChance) {
            if (!this.availableTraders.includes('wandering_merchant')) {
                this.availableTraders.push('wandering_merchant');
                return {
                    appeared: true,
                    message: '行商人が現れました！'
                };
            }
        } else {
            // 消える
            const index = this.availableTraders.indexOf('wandering_merchant');
            if (index !== -1) {
                this.availableTraders.splice(index, 1);
                return {
                    disappeared: true,
                    message: '行商人は去っていきました'
                };
            }
        }

        return { appeared: false, disappeared: false };
    }

    // マーケット情報を取得
    getMarketInfo() {
        return {
            totalListings: this.marketListings.length,
            playerListings: this.playerListings.length,
            recentPurchases: this.purchaseHistory.slice(-5),
            feeRate: this.marketFeeRate * 100
        };
    }

    // NPCトレーダー一覧
    getAvailableTraders() {
        return this.npcTraders.filter(t => this.availableTraders.includes(t.id));
    }

    // 期限切れの出品を削除
    removeExpiredListings() {
        const now = Date.now();
        const expired = [];

        this.marketListings = this.marketListings.filter(listing => {
            if (now >= listing.expiresAt) {
                expired.push(listing);
                return false;
            }
            return true;
        });

        // プレイヤーの出品リストも更新
        this.playerListings = this.playerListings.filter(listing => {
            return now < listing.expiresAt;
        });

        return expired;
    }

    // マーケット統計
    getMarketStats() {
        const stats = {
            totalSales: this.salesHistory.length,
            totalRevenue: this.salesHistory.reduce((sum, sale) => sum + sale.price, 0),
            totalFees: this.salesHistory.reduce((sum, sale) => sum + (sale.fee || 0), 0),
            totalPurchases: this.purchaseHistory.length,
            totalSpent: this.purchaseHistory.reduce((sum, purchase) => sum + purchase.price, 0)
        };

        return stats;
    }
}
