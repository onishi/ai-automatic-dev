class GameRPG {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // すべてのシステムを初期化
        this.itemSystem = new ItemSystem();
        this.rpgSystem = new RPGSystem();
        this.dungeonSystem = new DungeonSystem();
        this.equipmentSystem = new EquipmentSystem(this.itemSystem);
        this.inventorySystem = new InventorySystem(this.itemSystem, this.equipmentSystem);
        this.shopSystem = new ShopSystem(this.itemSystem);
        this.resourceManager = new ResourceManager();
        this.craftSystem = new CraftSystem();

        // サバイバル・クラフト拡張システム
        this.baseSystem = new BaseSystem();
        this.questSystem = new QuestSystem();
        this.timeWeatherSystem = new TimeWeatherSystem();
        this.guildSystem = new GuildSystem();
        this.tradeSystem = new TradeSystem();

        // マルチプレイヤーシステム
        this.multiplayerManager = new MultiplayerManager();
        this.aiPlayerManager = new AIPlayerManager();
        this.rankingSystem = new RankingSystem();
        this.spectatorSystem = new SpectatorSystem();
        this.tournamentSystem = new TournamentSystem();
        this.isMultiplayerMode = false;
        this.chatMessages = [];
        this.maxChatMessages = 10;

        // ゲーム状態
        this.gameState = 'menu'; // menu, dungeon_explore, battle, shop, status, inventory, equipment, gameOver
        this.showUI = {
            miniMap: true,
            stats: true,
            inventory: false,
            statusScreen: false,
            equipment: false,
            shopUI: false,
            multiplayer: false,
            chat: false,
            leaderboard: false,
            tournament: false,
            spectator: false,
            resources: true,
            craft: false,
            base: false,
            quest: false,
            guild: false,
            trade: false
        };

        // プレイヤーキャラクター（RPG版）
        this.playerChar = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 20,
            color: '#00ff00'
        };

        // 戦闘システム
        this.currentBattle = null;
        this.battleEnemies = [];
        this.battleResult = null;

        // PvPバトルシステム
        this.currentPvPBattle = null;
        this.pvpOpponent = null;
        this.pendingChallenge = null;
        this.isInPvPBattle = false;
        this.pvpBattleArena = null;

        // メッセージシステム
        this.messages = [];
        this.maxMessages = 5;

        // キー入力
        this.keys = {};
        this.lastKeyTime = {};

        // UI要素
        this.uiElements = {
            miniMapPos: { x: 10, y: 10, width: 150, height: 100 },
            statusPos: { x: 170, y: 10, width: 200, height: 80 },
            messagePos: { x: 10, y: this.canvas.height - 120, width: 400, height: 110 }
        };

        // ショップとUI状態
        this.selectedShopItem = 0;
        this.selectedInventoryItem = 0;
        this.selectedEquipmentSlot = 0;

        this.bindEvents();
        this.initialize();
        this.gameLoop();
    }

    initialize() {
        this.dungeonSystem.generateDungeon(this.rpgSystem.player.level);
        this.shopSystem.generateShopInventory('general', this.rpgSystem.player.level);

        // リソースノードを生成
        this.resourceManager.generateNodes(
            { width: this.dungeonSystem.width, height: this.dungeonSystem.height },
            this.dungeonSystem.currentFloor
        );

        // 初期装備を追加
        this.addStartingItems();

        // 基地を初期位置に設置
        this.baseSystem.setBaseLocation(this.playerChar.x, this.playerChar.y);

        // デイリークエストを生成
        this.questSystem.generateDailyQuests(this.rpgSystem.player.level);

        // ギルドに加入（デモ用）
        this.guildSystem.joinGuild('冒険者ギルド');

        this.addMessage('新しいダンジョンに入りました');
        this.addMessage('矢印キー: 移動, Space: アクション, I: インベントリ, E: 装備, S: ステータス');
        this.addMessage('H: リソース採取, K: クラフトメニュー, B: 基地, Q: クエスト, G: ギルド, T: トレード');
        this.gameState = 'dungeon_explore';
    }

    addStartingItems() {
        // 初期装備とアイテムを追加
        const startingItems = [
            this.itemSystem.createItemFromTemplate('health_potion', 'common', 1),
            this.itemSystem.createItemFromTemplate('health_potion', 'common', 1),
            this.itemSystem.createItemFromTemplate('basic_sword', 'common', 1),
            this.itemSystem.createItemFromTemplate('basic_armor', 'common', 1)
        ];

        startingItems[0].quantity = 3; // 体力ポーション3個

        for (const item of startingItems) {
            if (item) {
                this.inventorySystem.addItem(item);
            }
        }
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // キー連射制御
            const currentTime = Date.now();
            if (this.lastKeyTime[e.code] && currentTime - this.lastKeyTime[e.code] < 200) {
                return;
            }
            this.lastKeyTime[e.code] = currentTime;

            this.handleKeyPress(e.code);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    handleKeyPress(keyCode) {
        switch (this.gameState) {
            case 'menu':
                if (keyCode === 'Space') {
                    this.initialize();
                }
                break;

            case 'dungeon_explore':
                this.handleDungeonExploreInput(keyCode);
                break;

            case 'battle':
                this.handleBattleInput(keyCode);
                break;

            case 'shop':
                this.handleShopInput(keyCode);
                break;

            case 'inventory':
                this.handleInventoryInput(keyCode);
                break;

            case 'equipment':
                this.handleEquipmentInput(keyCode);
                break;

            case 'status':
                this.handleStatusInput(keyCode);
                break;

            case 'pvp_battle':
                this.handlePvPBattleInput(keyCode);
                break;

            case 'gameOver':
                if (keyCode === 'Space') {
                    this.restart();
                }
                break;
        }
    }

    handleDungeonExploreInput(keyCode) {
        let moved = false;

        // 移動
        if (keyCode === 'ArrowUp') {
            moved = this.dungeonSystem.moveToDirection('up');
        } else if (keyCode === 'ArrowRight') {
            moved = this.dungeonSystem.moveToDirection('right');
        } else if (keyCode === 'ArrowDown') {
            moved = this.dungeonSystem.moveToDirection('down');
        } else if (keyCode === 'ArrowLeft') {
            moved = this.dungeonSystem.moveToDirection('left');
        }

        if (moved) {
            this.onRoomEnter();
            // マルチプレイヤーに移動を送信
            this.sendPlayerAction('move', {
                x: this.dungeonSystem.playerMapX,
                y: this.dungeonSystem.playerMapY
            });
        }

        // アクション
        if (keyCode === 'Space') {
            this.handleRoomAction();
        }

        // ステータス画面
        if (keyCode === 'KeyS') {
            this.gameState = 'status';
        }

        // インベントリ
        if (keyCode === 'KeyI') {
            this.gameState = 'inventory';
        }

        // 装備画面
        if (keyCode === 'KeyE') {
            this.gameState = 'equipment';
        }

        // マルチプレイヤー画面
        if (keyCode === 'KeyM') {
            this.showUI.multiplayer = !this.showUI.multiplayer;
        }

        // チャット画面
        if (keyCode === 'KeyC') {
            this.showUI.chat = !this.showUI.chat;
        }

        // ルーム参加
        if (keyCode === 'KeyR') {
            this.joinMultiplayerRoom();
        }

        // リーダーボード
        if (keyCode === 'KeyL') {
            this.showUI.leaderboard = !this.showUI.leaderboard;
        }

        // トーナメント
        if (keyCode === 'KeyT') {
            this.showUI.tournament = !this.showUI.tournament;
        }

        // ランクマッチ検索
        if (keyCode === 'KeyQ') {
            this.startMatchmaking();
        }

        // チャレンジ応答
        if (this.pendingChallenge) {
            if (keyCode === 'KeyY') {
                this.acceptChallenge();
            } else if (keyCode === 'KeyN') {
                this.declineChallenge();
            }
        }

        // リソース採取
        if (keyCode === 'KeyH') {
            this.tryHarvestResource();
        }

        // クラフトメニュー
        if (keyCode === 'KeyK') {
            this.showUI.craft = !this.showUI.craft;
        }

        // 基地建設メニュー
        if (keyCode === 'KeyB') {
            this.showUI.base = !this.showUI.base;
        }

        // クエストメニュー
        if (keyCode === 'KeyJ') {
            this.showUI.quest = !this.showUI.quest;
        }

        // ギルドメニュー
        if (keyCode === 'KeyG') {
            this.showUI.guild = !this.showUI.guild;
        }

        // トレードメニュー
        if (keyCode === 'KeyU') {
            this.showUI.trade = !this.showUI.trade;
        }
    }

    handleBattleInput(keyCode) {
        if (!this.currentBattle) return;

        if (keyCode === 'Space') {
            this.performAttack();
        } else if (keyCode === 'KeyE') {
            this.gameState = 'dungeon_explore';
            this.currentBattle = null;
        }
    }

    handleShopInput(keyCode) {
        const shopInfo = this.shopSystem.getShopInfo();
        const maxIndex = shopInfo.inventory.length - 1;

        if (keyCode === 'KeyE' || keyCode === 'Escape') {
            this.gameState = 'dungeon_explore';
            return;
        }

        // ショップナビゲーション
        if (keyCode === 'ArrowUp') {
            this.selectedShopItem = Math.max(0, this.selectedShopItem - 1);
        } else if (keyCode === 'ArrowDown') {
            this.selectedShopItem = Math.min(maxIndex, this.selectedShopItem + 1);
        } else if (keyCode === 'Space') {
            // アイテム購入
            this.buyShopItem(this.selectedShopItem);
        }
    }

    handleInventoryInput(keyCode) {
        const pageData = this.inventorySystem.getPageItems();

        if (keyCode === 'KeyI' || keyCode === 'Escape') {
            this.gameState = 'dungeon_explore';
            return;
        }

        // ナビゲーション
        if (keyCode === 'ArrowUp') {
            this.selectedInventoryItem = Math.max(0, this.selectedInventoryItem - 1);
        } else if (keyCode === 'ArrowDown') {
            this.selectedInventoryItem = Math.min(pageData.items.length - 1, this.selectedInventoryItem + 1);
        } else if (keyCode === 'ArrowLeft') {
            this.inventorySystem.previousPage();
            this.selectedInventoryItem = 0;
        } else if (keyCode === 'ArrowRight') {
            this.inventorySystem.nextPage();
            this.selectedInventoryItem = 0;
        } else if (keyCode === 'Space') {
            // アイテム使用
            this.useInventoryItem(this.selectedInventoryItem);
        } else if (keyCode === 'KeyQ') {
            // アイテム装備
            this.equipInventoryItem(this.selectedInventoryItem);
        }
    }

    handleEquipmentInput(keyCode) {
        const slots = Object.keys(this.equipmentSystem.equipmentSlots);

        if (keyCode === 'KeyE' || keyCode === 'Escape') {
            this.gameState = 'dungeon_explore';
            return;
        }

        // スロット選択
        if (keyCode === 'ArrowUp') {
            this.selectedEquipmentSlot = Math.max(0, this.selectedEquipmentSlot - 1);
        } else if (keyCode === 'ArrowDown') {
            this.selectedEquipmentSlot = Math.min(slots.length - 1, this.selectedEquipmentSlot + 1);
        } else if (keyCode === 'Space') {
            // 装備解除
            this.unequipItem(this.selectedEquipmentSlot);
        }
    }

    handleStatusInput(keyCode) {
        if (keyCode === 'KeyS' || keyCode === 'Escape') {
            this.gameState = 'dungeon_explore';
        }

        // ステータスポイント振り分け
        if (this.rpgSystem.player.availableStatPoints > 0) {
            if (keyCode === 'Digit1') {
                this.rpgSystem.allocateStatPoint('attack');
                this.addMessage('攻撃力が上がった！');
            } else if (keyCode === 'Digit2') {
                this.rpgSystem.allocateStatPoint('defense');
                this.addMessage('防御力が上がった！');
            } else if (keyCode === 'Digit3') {
                this.rpgSystem.allocateStatPoint('speed');
                this.addMessage('速度が上がった！');
            } else if (keyCode === 'Digit4') {
                this.rpgSystem.allocateStatPoint('luck');
                this.addMessage('幸運度が上がった！');
            }
        }
    }

    onRoomEnter() {
        const currentRoom = this.dungeonSystem.currentRoom;
        if (!currentRoom) return;

        this.addMessage(`${this.getRoomTypeText(currentRoom.type)}に入った`);

        // 部屋のイベント処理
        if (!currentRoom.cleared && currentRoom.enemies.length > 0) {
            this.startBattle(currentRoom.enemies);
        } else if (currentRoom.type === 'treasure' && !currentRoom.cleared) {
            this.handleTreasureRoom(currentRoom);
        } else if (currentRoom.type === 'shop') {
            this.gameState = 'shop';
            // ショップ在庫を更新
            this.shopSystem.generateShopInventory('general', this.rpgSystem.player.level);
        }
    }

    handleRoomAction() {
        const currentRoom = this.dungeonSystem.currentRoom;
        if (!currentRoom) return;

        if (currentRoom.type === 'treasure' && !currentRoom.cleared) {
            this.handleTreasureRoom(currentRoom);
        } else if (currentRoom.enemies.length > 0 && !currentRoom.cleared) {
            this.startBattle(currentRoom.enemies);
        }
    }

    startBattle(enemies) {
        this.currentBattle = {
            enemies: [...enemies],
            turn: 'player',
            enemyIndex: 0
        };
        this.gameState = 'battle';
        this.addMessage('戦闘開始！ スペース: 攻撃, E: 逃走');
    }

    performAttack() {
        if (!this.currentBattle || this.currentBattle.enemies.length === 0) return;

        const enemy = this.currentBattle.enemies[0];
        const damageResult = this.rpgSystem.calculateDamage(20, true);

        enemy.health -= damageResult.damage;

        if (damageResult.critical) {
            this.addMessage(`クリティカル！ ${damageResult.damage}ダメージ！`);
        } else {
            this.addMessage(`${damageResult.damage}ダメージを与えた`);
        }

        // 敵を倒した場合
        if (enemy.health <= 0) {
            this.currentBattle.enemies.shift();
            const exp = 25 + Math.floor(Math.random() * 25);
            const credits = 10 + Math.floor(Math.random() * 20);

            const leveledUp = this.rpgSystem.addExperience(exp);
            this.rpgSystem.addCredits(credits);

            this.addMessage(`敵を倒した！ EXP:${exp} クレジット:${credits}`);

            if (leveledUp) {
                this.addMessage('レベルアップ！');
            }

            // アイテムドロップ判定
            if (this.rpgSystem.calculateItemDrop()) {
                const item = this.itemSystem.generateRandomItem(this.rpgSystem.player.level);
                this.inventorySystem.addItem(item);
                this.addMessage(`${item.name}を入手した！`);
            }
        }

        // 全ての敵を倒した場合
        if (this.currentBattle.enemies.length === 0) {
            this.dungeonSystem.clearCurrentRoom();
            this.currentBattle = null;
            this.gameState = 'dungeon_explore';
            this.addMessage('戦闘に勝利した！');
            return;
        }

        // 敵の攻撃
        this.enemyAttack();
    }

    enemyAttack() {
        if (!this.currentBattle || this.currentBattle.enemies.length === 0) return;

        const enemy = this.currentBattle.enemies[0];
        const damageResult = this.rpgSystem.takeDamage(enemy.damage);

        this.addMessage(`${damageResult.damage}ダメージを受けた`);

        if (!this.rpgSystem.isAlive()) {
            this.gameOver();
        }
    }

    handleTreasureRoom(room) {
        if (room.cleared) return;

        for (const item of room.items) {
            if (item.type === 'credits') {
                const earned = this.rpgSystem.addCredits(item.amount);
                this.addMessage(`${earned}クレジットを獲得！`);
            } else {
                const generatedItem = this.itemSystem.generateRandomItem(this.rpgSystem.player.level, item.rarity);
                this.inventorySystem.addItem(generatedItem);
                this.addMessage(`${generatedItem.name}を発見！`);
            }
        }

        this.dungeonSystem.clearCurrentRoom();
    }

    generateRandomItem() {
        const itemTypes = [
            { type: 'health_potion', name: '体力ポーション', amount: 50 },
            { type: 'weapon_upgrade', name: '武器強化石', bonus: 3 },
            { type: 'shield_upgrade', name: 'シールド強化石', bonus: 2 },
            { type: 'speed_boost', name: '速度ブースター', bonus: 1 }
        ];

        const selected = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        return { ...selected };
    }

    // 新しいアイテム関連メソッド
    buyShopItem(itemIndex) {
        const result = this.shopSystem.buyItem(itemIndex, this.rpgSystem.player.credits, this.inventorySystem.inventory);

        if (result.success) {
            this.rpgSystem.spendCredits(result.cost);
            this.addMessage(result.message);
        } else {
            this.addMessage(result.message);
        }
    }

    useInventoryItem(itemIndex) {
        const pageData = this.inventorySystem.getPageItems();
        if (itemIndex >= 0 && itemIndex < pageData.items.length) {
            const item = pageData.items[itemIndex];
            const result = this.inventorySystem.useItem(item.id);

            if (result.success) {
                this.addMessage(result.message);
                // アイテム効果を適用
                if (result.effects.heal) {
                    this.rpgSystem.heal(result.effects.heal);
                }
            } else {
                this.addMessage(result.message);
            }
        }
    }

    equipInventoryItem(itemIndex) {
        const pageData = this.inventorySystem.getPageItems();
        if (itemIndex >= 0 && itemIndex < pageData.items.length) {
            const item = pageData.items[itemIndex];
            const availableSlots = this.equipmentSystem.getAvailableSlots(item);

            if (availableSlots.length > 0) {
                const result = this.equipmentSystem.equipItem(item, availableSlots[0], this.inventorySystem.inventory);
                if (result.success) {
                    this.addMessage(result.message);
                } else {
                    this.addMessage(result.message);
                }
            } else {
                this.addMessage('このアイテムは装備できません');
            }
        }
    }

    unequipItem(slotIndex) {
        const slots = Object.keys(this.equipmentSystem.equipmentSlots);
        if (slotIndex >= 0 && slotIndex < slots.length) {
            const slotName = slots[slotIndex];
            const result = this.equipmentSystem.unequipItem(slotName, this.inventorySystem.inventory);

            if (result.success) {
                this.addMessage(result.message);
            } else {
                this.addMessage(result.message);
            }
        }
    }

    addMessage(text) {
        this.messages.push({
            text: text,
            time: Date.now()
        });

        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }

    getRoomTypeText(type) {
        switch (type) {
            case 'start': return 'スタート地点';
            case 'normal': return '通常の部屋';
            case 'treasure': return '宝物庫';
            case 'shop': return 'ショップ';
            case 'boss': return 'ボス部屋';
            default: return '未知の部屋';
        }
    }

    gameOver() {
        this.gameState = 'gameOver';
        const result = this.rpgSystem.onDeath();
        this.addMessage(`ゲームオーバー! レベル${result.level}で${result.retainedCredits}クレジット保持`);
    }

    restart() {
        this.itemSystem = new ItemSystem();
        this.rpgSystem = new RPGSystem();
        this.dungeonSystem = new DungeonSystem();
        this.equipmentSystem = new EquipmentSystem(this.itemSystem);
        this.inventorySystem = new InventorySystem(this.itemSystem, this.equipmentSystem);
        this.shopSystem = new ShopSystem(this.itemSystem);
        this.messages = [];
        this.selectedShopItem = 0;
        this.selectedInventoryItem = 0;
        this.selectedEquipmentSlot = 0;
        this.initialize();
    }

    update() {
        // スタミナ・空腹システムの更新
        this.rpgSystem.updateSurvivalSystem();

        // 時間・天候システムの更新
        const timeUpdate = this.timeWeatherSystem.update();
        if (timeUpdate.newDay) {
            this.addMessage(`${timeUpdate.day}日目の朝です`);
            this.questSystem.checkDailyReset(this.rpgSystem.player.level);
            this.tradeSystem.checkWanderingMerchant();
        }

        // ギルドブーストの期限切れチェック
        const expiredBoosts = this.guildSystem.updateBoosts();
        for (const boostName of expiredBoosts) {
            this.addMessage(`${boostName}の効果が切れました`);
        }
    }

    render() {
        // 背景をクリア
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.gameState) {
            case 'menu':
                this.renderMenu();
                break;
            case 'dungeon_explore':
                this.renderDungeonExplore();
                break;
            case 'battle':
                this.renderBattle();
                break;
            case 'shop':
                this.renderShop();
                break;
            case 'inventory':
                this.renderInventory();
                break;
            case 'equipment':
                this.renderEquipment();
                break;
            case 'status':
                this.renderStatusScreen();
                break;
            case 'pvp_battle':
                this.renderPvPBattle();
                break;
            case 'gameOver':
                this.renderGameOver();
                break;
        }

        // 共通UI
        if (this.gameState === 'dungeon_explore' || this.gameState === 'battle') {
            this.renderUI();
        }

        // マルチプレイヤーUI（常時表示可能）
        this.drawMultiplayerUI();
        this.drawChatUI();
        this.renderLeaderboard();
        this.renderTournament();

        // 新システムのUI
        this.renderBaseUI();
        this.renderQuestUI();
        this.renderGuildUI();
        this.renderTradeUI();
        this.renderTimeWeatherUI();
    }

    renderMenu() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Dungeon Explorer RPG', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press SPACE to Start', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    renderDungeonExplore() {
        // リソースノードを描画
        const cameraX = this.dungeonSystem.playerMapX * this.dungeonSystem.cellSize - this.canvas.width / 2 + this.dungeonSystem.cellSize / 2;
        const cameraY = this.dungeonSystem.playerMapY * this.dungeonSystem.cellSize - this.canvas.height / 2 + this.dungeonSystem.cellSize / 2;
        this.resourceManager.drawNodes(this.ctx, cameraX, cameraY);

        // プレイヤーキャラクターを描画
        this.ctx.fillStyle = this.playerChar.color;
        this.ctx.fillRect(
            this.playerChar.x - this.playerChar.size / 2,
            this.playerChar.y - this.playerChar.size / 2,
            this.playerChar.size,
            this.playerChar.size
        );

        // 現在の部屋情報を表示
        const room = this.dungeonSystem.currentRoom;
        if (room) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.getRoomTypeText(room.type),
                this.canvas.width / 2,
                50
            );

            if (room.enemies.length > 0 && !room.cleared) {
                this.ctx.fillStyle = '#ff6666';
                this.ctx.fillText('敵がいる！', this.canvas.width / 2, 70);
            }
        }
    }

    renderBattle() {
        // 戦闘画面
        this.ctx.fillStyle = '#440000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.currentBattle && this.currentBattle.enemies.length > 0) {
            const enemy = this.currentBattle.enemies[0];

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('戦闘中', this.canvas.width / 2, 50);

            this.ctx.fillStyle = '#ff6666';
            this.ctx.fillRect(this.canvas.width / 2 - 30, this.canvas.height / 2 - 30, 60, 60);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`敵 HP: ${enemy.health}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }

    renderShop() {
        this.ctx.fillStyle = '#001122';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const shopInfo = this.shopSystem.getShopInfo();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(shopInfo.name, this.canvas.width / 2, 50);

        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';

        // クレジット表示
        this.ctx.fillText(`クレジット: ${this.rpgSystem.player.credits}`, 50, 80);
        this.ctx.fillText(`評判: ${shopInfo.reputation} (${this.shopSystem.getReputationTier()})`, 300, 80);

        // ショップアイテム一覧
        let y = 110;
        shopInfo.inventory.forEach((item, index) => {
            const isSelected = index === this.selectedShopItem;
            const displayInfo = this.itemSystem.getItemDisplayInfo(item);

            if (isSelected) {
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(40, y - 15, 720, 18);
            }

            this.ctx.fillStyle = displayInfo.color;
            this.ctx.fillText(`${displayInfo.displayName}`, 50, y);
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillText(`${item.shopPrice}C`, 600, y);

            y += 20;
        });

        // 操作説明
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('↑↓: 選択, Space: 購入, E: 閉じる', 50, this.canvas.height - 30);
    }

    renderStatusScreen() {
        this.ctx.fillStyle = '#002200';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const status = this.rpgSystem.getStatusData();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';

        let y = 50;
        this.ctx.fillText(`レベル: ${status.level}`, 50, y += 30);
        this.ctx.fillText(`EXP: ${status.experience}/${status.experienceToNext}`, 50, y += 25);
        this.ctx.fillText(`HP: ${status.health}/${status.maxHealth}`, 50, y += 25);
        this.ctx.fillText(`クレジット: ${status.credits}`, 50, y += 25);

        y += 20;
        this.ctx.fillText('ステータス:', 50, y += 25);
        this.ctx.fillText(`攻撃力: ${status.totalStats.attack}`, 50, y += 20);
        this.ctx.fillText(`防御力: ${status.totalStats.defense}`, 50, y += 20);
        this.ctx.fillText(`速度: ${status.totalStats.speed}`, 50, y += 20);
        this.ctx.fillText(`幸運度: ${status.totalStats.luck}`, 50, y += 20);

        if (status.availableStatPoints > 0) {
            y += 20;
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillText(`利用可能ポイント: ${status.availableStatPoints}`, 50, y += 25);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText('1:攻撃 2:防御 3:速度 4:幸運', 50, y += 20);
        }

        this.ctx.fillText('Press S to Close', 50, this.canvas.height - 30);
    }

    renderInventory() {
        this.ctx.fillStyle = '#001100';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const pageData = this.inventorySystem.getPageItems();
        const summary = this.inventorySystem.getInventorySummary();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('インベントリ', this.canvas.width / 2, 40);

        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';

        // ページ情報とスロット情報
        this.ctx.fillText(`${summary.totalItems}/${summary.maxSlots} slots`, 50, 70);
        this.ctx.fillText(`Page: ${pageData.currentPage + 1}/${pageData.totalPages}`, 200, 70);

        // アイテム一覧
        let y = 100;
        pageData.items.forEach((item, index) => {
            const isSelected = index === this.selectedInventoryItem;
            const displayInfo = this.itemSystem.getItemDisplayInfo(item);

            if (isSelected) {
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(40, y - 15, 720, 18);
            }

            this.ctx.fillStyle = displayInfo.color;
            this.ctx.fillText(`${displayInfo.displayName}`, 50, y);

            if (item.type === 'consumable') {
                this.ctx.fillStyle = '#888888';
                this.ctx.fillText('[使用可能]', 500, y);
            } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
                this.ctx.fillStyle = '#888888';
                this.ctx.fillText('[装備可能]', 500, y);
            }

            y += 20;
        });

        // 操作説明
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('↑↓: 選択, ←→: ページ, Space: 使用, Q: 装備, I: 閉じる', 50, this.canvas.height - 30);
    }

    renderEquipment() {
        this.ctx.fillStyle = '#110011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const equipped = this.equipmentSystem.getEquippedItems();
        const totalStats = this.equipmentSystem.getTotalStats();
        const slots = Object.keys(equipped);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('装備', this.canvas.width / 2, 40);

        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';

        // 装備スロット
        let y = 80;
        slots.forEach((slotName, index) => {
            const isSelected = index === this.selectedEquipmentSlot;
            const item = equipped[slotName];

            if (isSelected) {
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(40, y - 15, 350, 18);
            }

            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillText(`${this.getSlotDisplayName(slotName)}:`, 50, y);

            if (item) {
                const displayInfo = this.itemSystem.getItemDisplayInfo(item);
                this.ctx.fillStyle = displayInfo.color;
                this.ctx.fillText(displayInfo.displayName, 150, y);
            } else {
                this.ctx.fillStyle = '#666666';
                this.ctx.fillText('(なし)', 150, y);
            }

            y += 25;
        });

        // 合計ステータス
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('装備効果:', 420, 80);
        y = 100;
        Object.entries(totalStats).forEach(([stat, value]) => {
            if (value > 0) {
                this.ctx.fillText(`${this.getStatDisplayName(stat)}: +${value}`, 420, y);
                y += 18;
            }
        });

        // 操作説明
        this.ctx.fillText('↑↓: 選択, Space: 外す, E: 閉じる', 50, this.canvas.height - 30);
    }

    getSlotDisplayName(slotName) {
        const names = {
            weapon: '武器',
            armor: '防具',
            shield: 'シールド',
            boots: 'ブーツ',
            accessory1: 'アクセサリー1',
            accessory2: 'アクセサリー2'
        };
        return names[slotName] || slotName;
    }

    getStatDisplayName(stat) {
        const names = {
            attack: '攻撃力',
            defense: '防御力',
            health: 'HP',
            speed: '速度',
            luck: '幸運',
            crit_rate: 'クリティカル率',
            life_steal: 'ライフスティール',
            damage_reflect: 'ダメージ反射',
            exp_bonus: '経験値ボーナス',
            item_drop_rate: 'アイテムドロップ率'
        };
        return names[stat] || stat;
    }

    renderGameOver() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press SPACE to Restart', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    renderUI() {
        // ミニマップ
        if (this.showUI.miniMap) {
            this.dungeonSystem.drawMiniMap(
                this.ctx,
                this.uiElements.miniMapPos.x,
                this.uiElements.miniMapPos.y,
                this.uiElements.miniMapPos.width,
                this.uiElements.miniMapPos.height
            );
        }

        // ステータス情報
        if (this.showUI.stats) {
            const status = this.rpgSystem.getStatusData();
            const pos = this.uiElements.statusPos;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';

            this.ctx.fillText(`Lv.${status.level}`, pos.x + 5, pos.y + 15);
            this.ctx.fillText(`HP: ${status.health}/${status.maxHealth}`, pos.x + 5, pos.y + 30);
            this.ctx.fillText(`Credits: ${status.credits}`, pos.x + 5, pos.y + 45);
            this.ctx.fillText(`EXP: ${status.experience}/${status.experienceToNext}`, pos.x + 5, pos.y + 60);

            if (status.availableStatPoints > 0) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.fillText(`+${status.availableStatPoints} points`, pos.x + 5, pos.y + 75);
            }
        }

        // メッセージ
        this.renderMessages();

        // リソース表示
        if (this.showUI.resources) {
            this.renderResources();
        }

        // スタミナ・空腹バー
        this.renderSurvivalBars();

        // クラフトメニュー
        if (this.showUI.craft) {
            this.renderCraftMenu();
        }
    }

    renderMessages() {
        const pos = this.uiElements.messagePos;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';

        for (let i = 0; i < this.messages.length; i++) {
            const message = this.messages[i];
            const alpha = Math.max(0, 1 - (Date.now() - message.time) / 10000);

            this.ctx.globalAlpha = alpha;
            this.ctx.fillText(message.text, pos.x + 5, pos.y + 15 + i * 18);
        }

        this.ctx.globalAlpha = 1;
    }

    renderResources() {
        const pos = { x: 380, y: 10, width: 200, height: 140 };

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.strokeStyle = '#4169E1';
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('リソース', pos.x + 5, pos.y + 15);

        this.ctx.font = '10px Arial';
        let y = pos.y + 30;

        const resourceTypes = ['wood', 'ore', 'herb', 'crystal', 'food'];
        const resourceNames = { wood: '木材', ore: '鉱石', herb: '薬草', crystal: '結晶', food: '食材' };

        for (let type of resourceTypes) {
            const total = Object.values(this.resourceManager.resources[type]).reduce((a, b) => a + b, 0);
            if (total > 0) {
                this.ctx.fillStyle = '#cccccc';
                this.ctx.fillText(`${resourceNames[type]}: ${total}`, pos.x + 5, y);
                y += 15;
            }
        }

        const totalRes = this.resourceManager.getTotalResources();
        const maxRes = this.resourceManager.maxStorageCapacity;
        this.ctx.fillStyle = totalRes > maxRes * 0.9 ? '#ff0000' : '#ffff00';
        this.ctx.fillText(`容量: ${totalRes}/${maxRes}`, pos.x + 5, pos.y + pos.height - 10);
    }

    renderSurvivalBars() {
        const pos = { x: 590, y: 10, width: 200, height: 60 };

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.strokeStyle = '#00ffff';
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        // スタミナバー
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('スタミナ', pos.x + 5, pos.y + 15);

        const staminaRatio = this.rpgSystem.player.stamina / this.rpgSystem.player.maxStamina;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(pos.x + 5, pos.y + 20, pos.width - 10, 10);
        this.ctx.fillStyle = staminaRatio > 0.5 ? '#00ff00' : staminaRatio > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(pos.x + 5, pos.y + 20, (pos.width - 10) * staminaRatio, 10);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '8px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.floor(this.rpgSystem.player.stamina)}/${this.rpgSystem.player.maxStamina}`, pos.x + pos.width / 2, pos.y + 28);

        // 空腹度バー
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('空腹度', pos.x + 5, pos.y + 45);

        const hungerRatio = this.rpgSystem.player.hunger / this.rpgSystem.player.maxHunger;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(pos.x + 5, pos.y + 50, pos.width - 10, 10);
        this.ctx.fillStyle = hungerRatio < 0.5 ? '#00ff00' : hungerRatio < 0.75 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(pos.x + 5, pos.y + 50, (pos.width - 10) * hungerRatio, 10);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '8px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.floor(this.rpgSystem.player.hunger)}/${this.rpgSystem.player.maxHunger}`, pos.x + pos.width / 2, pos.y + 58);
    }

    renderCraftMenu() {
        const pos = { x: 200, y: 100, width: 400, height: 400 };

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('クラフトメニュー', pos.x + pos.width / 2, pos.y + 25);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';

        const recipes = this.craftSystem.getAllRecipes();
        let y = pos.y + 50;

        for (let i = 0; i < Math.min(recipes.length, 15); i++) {
            const recipe = recipes[i];
            const canCraft = recipe.canCraft(this.resourceManager);

            this.ctx.fillStyle = canCraft ? '#00ff00' : '#888888';
            this.ctx.fillText(`${i + 1}. ${recipe.name}`, pos.x + 10, y);

            // 必要リソース
            this.ctx.font = '10px Arial';
            let reqText = '';
            for (let resType in recipe.requirements) {
                for (let rarity in recipe.requirements[resType]) {
                    const amount = recipe.requirements[resType][rarity];
                    reqText += `${resType}(${rarity}):${amount} `;
                }
            }
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillText(reqText, pos.x + 20, y + 12);

            this.ctx.font = '12px Arial';
            y += 25;
        }

        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('K: 閉じる | 数字キー: クラフト', pos.x + 10, pos.y + pos.height - 10);
    }

    // マルチプレイヤー関連メソッド
    joinMultiplayerRoom() {
        if (!this.isMultiplayerMode) {
            this.multiplayerManager.connect();

            const playerData = {
                id: `player_${Date.now()}`,
                name: 'Player',
                level: this.rpgSystem.player.level,
                class: 'Adventurer',
                x: this.playerChar.x,
                y: this.playerChar.y
            };

            const roomId = 'dungeon_room_' + Math.floor(Math.random() * 100);

            if (this.multiplayerManager.joinRoom(roomId, playerData)) {
                this.isMultiplayerMode = true;
                this.addMessage(`ルーム ${roomId} に参加しています...`);

                // AIプレイヤーを追加
                this.addAIPlayers();
            }
        } else {
            this.addMessage('既にマルチプレイヤーモードです');
        }
    }

    addAIPlayers() {
        const aiPlayerData = [
            { id: 'ai_1', name: 'アリス', level: 15, class: 'Mage' },
            { id: 'ai_2', name: 'ボブ', level: 12, class: 'Warrior' },
            { id: 'ai_3', name: 'チャーリー', level: 18, class: 'Rogue' }
        ];

        aiPlayerData.forEach(data => {
            this.aiPlayerManager.addAIPlayer(data);
        });

        this.aiPlayerManager.startSimulation(this);
    }

    sendPlayerAction(action, data) {
        if (this.isMultiplayerMode) {
            this.multiplayerManager.sendPlayerAction(action, data);
        }
    }

    addChatMessage(message) {
        this.chatMessages.push({
            text: message,
            time: Date.now()
        });

        if (this.chatMessages.length > this.maxChatMessages) {
            this.chatMessages.shift();
        }
    }

    addMessage(text) {
        this.messages.push({
            text: text,
            time: Date.now()
        });

        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }

    drawMultiplayerUI() {
        if (!this.showUI.multiplayer) return;

        const pos = { x: 420, y: 10, width: 360, height: 200 };

        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        // タイトル
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('マルチプレイヤー', pos.x + 10, pos.y + 20);

        // 接続状態
        const connectionStatus = this.multiplayerManager.getConnectionStatus();
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = connectionStatus.isConnected ? '#00ff00' : '#ff0000';
        this.ctx.fillText(`状態: ${connectionStatus.status}`, pos.x + 10, pos.y + 40);

        if (connectionStatus.room) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`ルーム: ${connectionStatus.room.id}`, pos.x + 10, pos.y + 60);

            // プレイヤーリスト
            this.ctx.fillText('プレイヤー:', pos.x + 10, pos.y + 80);

            let yOffset = 100;
            if (connectionStatus.room.players) {
                connectionStatus.room.players.forEach((player, index) => {
                    const isLocal = player.id === connectionStatus.localPlayer?.id;
                    this.ctx.fillStyle = isLocal ? '#ffff00' : '#ffffff';
                    this.ctx.fillText(`${player.name} (Lv.${player.level} ${player.class})`,
                                    pos.x + 20, pos.y + yOffset + index * 15);
                });
            }
        }

        // 操作説明
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('R: ルーム参加  C: チャット  M: 閉じる', pos.x + 10, pos.y + pos.height - 10);
    }

    drawChatUI() {
        if (!this.showUI.chat) return;

        const pos = { x: 420, y: 220, width: 360, height: 150 };

        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        // タイトル
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('チャット', pos.x + 10, pos.y + 20);

        // チャットメッセージ
        this.ctx.font = '11px Arial';
        this.ctx.fillStyle = '#ffffff';

        for (let i = 0; i < Math.min(this.chatMessages.length, 8); i++) {
            const message = this.chatMessages[i];
            this.ctx.fillText(message.text, pos.x + 10, pos.y + 40 + i * 14);
        }

        // 操作説明
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('C: 閉じる', pos.x + 10, pos.y + pos.height - 10);
    }

    // PvPバトル関連メソッド
    startPvPBattle(battleData) {
        this.currentPvPBattle = battleData;
        this.pvpBattleArena = battleData.arena;
        this.isInPvPBattle = true;
        this.gameState = 'pvp_battle';

        // プレイヤーの初期位置設定
        this.playerChar.x = 100;
        this.playerChar.y = this.pvpBattleArena.height / 2;

        // 対戦相手の初期位置設定
        this.pvpOpponent = {
            id: battleData.player2,
            x: this.pvpBattleArena.width - 100,
            y: this.pvpBattleArena.height / 2,
            hp: 100,
            maxHp: 100,
            color: '#ff0000'
        };

        this.addMessage(`PvPバトル開始: ${battleData.arena.name}`);

        // スペクテーターシステムに記録
        this.spectatorSystem.recordMatchEvent(battleData.battleId, {
            type: 'battle_start',
            participants: [battleData.player1, battleData.player2],
            arena: battleData.arena
        });
    }

    handlePvPBattleInput(keyCode) {
        if (!this.isInPvPBattle) return;

        let moved = false;
        const moveSpeed = 5;

        // 移動
        if (keyCode === 'ArrowUp' && this.playerChar.y > 0) {
            this.playerChar.y -= moveSpeed;
            moved = true;
        } else if (keyCode === 'ArrowDown' && this.playerChar.y < this.pvpBattleArena.height - this.playerChar.size) {
            this.playerChar.y += moveSpeed;
            moved = true;
        } else if (keyCode === 'ArrowLeft' && this.playerChar.x > 0) {
            this.playerChar.x -= moveSpeed;
            moved = true;
        } else if (keyCode === 'ArrowRight' && this.playerChar.x < this.pvpBattleArena.width - this.playerChar.size) {
            this.playerChar.x += moveSpeed;
            moved = true;
        }

        if (moved) {
            this.multiplayerManager.sendBattleAction('move', null, null, {
                x: this.playerChar.x,
                y: this.playerChar.y
            });
        }

        // 攻撃
        if (keyCode === 'Space') {
            this.performPvPAttack();
        }

        // スペシャル攻撃
        if (keyCode === 'KeyX') {
            this.performPvPSpecialAttack();
        }

        // バトル終了
        if (keyCode === 'Escape') {
            this.endPvPBattle();
        }
    }

    performPvPAttack() {
        const stats = this.rpgSystem.getTotalStats();
        const attackPower = stats.attack;
        this.multiplayerManager.sendBattleAction('attack', this.pvpOpponent.id, attackPower, {
            x: this.playerChar.x,
            y: this.playerChar.y
        });

        this.addMessage('攻撃を実行しました！');
    }

    performPvPSpecialAttack() {
        const stats = this.rpgSystem.getTotalStats();
        const attackPower = stats.attack * 1.5;
        this.multiplayerManager.sendBattleAction('special_attack', this.pvpOpponent.id, attackPower, {
            x: this.playerChar.x,
            y: this.playerChar.y
        });

        this.addMessage('スペシャル攻撃を実行しました！');
    }

    processBattleResult(data) {
        if (data.target === this.pvpOpponent.id) {
            this.pvpOpponent.hp -= data.damage;
            this.addMessage(`${data.damage}ダメージを与えました！`);

            if (this.pvpOpponent.hp <= 0) {
                this.winPvPBattle();
            }
        } else {
            this.rpgSystem.player.hp -= data.damage;
            this.addMessage(`${data.damage}ダメージを受けました！`);

            if (this.rpgSystem.player.hp <= 0) {
                this.losePvPBattle();
            }
        }

        // スペクテーターシステムに記録
        this.spectatorSystem.recordMatchEvent(this.currentPvPBattle.battleId, {
            type: 'player_attack',
            attacker: data.playerId,
            target: data.target,
            damage: data.damage,
            position: data.position
        });
    }

    winPvPBattle() {
        this.addMessage('PvPバトルに勝利しました！');
        this.endPvPBattle();

        // ランキングシステムに記録
        const matchResult = this.rankingSystem.recordMatch(
            this.multiplayerManager.localPlayer.id,
            this.pvpOpponent.id,
            this.multiplayerManager.localPlayer.id,
            {
                player1Damage: this.pvpOpponent.maxHp - this.pvpOpponent.hp,
                player2Damage: this.rpgSystem.player.maxHp - this.rpgSystem.player.hp
            }
        );

        this.addMessage(`レーティング変化: +${matchResult.ratingChange.player1Stats || 0}`);
    }

    losePvPBattle() {
        this.addMessage('PvPバトルに敗北しました...');
        this.endPvPBattle();

        // ランキングシステムに記録
        const matchResult = this.rankingSystem.recordMatch(
            this.multiplayerManager.localPlayer.id,
            this.pvpOpponent.id,
            this.pvpOpponent.id,
            {
                player1Damage: this.pvpOpponent.maxHp - this.pvpOpponent.hp,
                player2Damage: this.rpgSystem.player.maxHp - this.rpgSystem.player.hp
            }
        );

        this.addMessage(`レーティング変化: ${matchResult.ratingChange.player1Stats || 0}`);
    }

    endPvPBattle() {
        // スペクテーターシステムに記録
        if (this.currentPvPBattle) {
            this.spectatorSystem.finishMatch(this.currentPvPBattle.battleId, {
                winner: this.rpgSystem.player.hp > 0 ? this.multiplayerManager.localPlayer.id : this.pvpOpponent.id,
                finalHp: {
                    player1: this.rpgSystem.player.hp,
                    player2: this.pvpOpponent.hp
                }
            });
        }

        this.currentPvPBattle = null;
        this.pvpOpponent = null;
        this.pvpBattleArena = null;
        this.isInPvPBattle = false;
        this.gameState = 'dungeon_explore';

        // HP回復
        this.rpgSystem.player.hp = this.rpgSystem.player.maxHp;
    }

    startMatchmaking() {
        if (this.multiplayerManager.isConnected) {
            this.multiplayerManager.requestMatchmaking('ranked');
            this.addMessage('ランクマッチを検索中...');
        } else {
            this.addMessage('マルチプレイヤーに接続してください');
        }
    }

    acceptChallenge() {
        if (this.pendingChallenge) {
            this.multiplayerManager.acceptChallenge(this.pendingChallenge.challengerId);
            this.addMessage(`${this.pendingChallenge.challengerName}の挑戦を受諾しました`);
            this.pendingChallenge = null;
        }
    }

    declineChallenge() {
        if (this.pendingChallenge) {
            this.addMessage(`${this.pendingChallenge.challengerName}の挑戦を拒否しました`);
            this.pendingChallenge = null;
        }
    }

    renderPvPBattle() {
        if (!this.isInPvPBattle || !this.pvpBattleArena) return;

        // アリーナ背景
        this.ctx.fillStyle = this.pvpBattleArena.background;
        this.ctx.fillRect(100, 100, this.pvpBattleArena.width, this.pvpBattleArena.height);

        // アリーナ境界
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(100, 100, this.pvpBattleArena.width, this.pvpBattleArena.height);

        // 障害物
        this.ctx.fillStyle = '#666666';
        this.pvpBattleArena.obstacles.forEach(obstacle => {
            this.ctx.fillRect(
                100 + obstacle.x,
                100 + obstacle.y,
                obstacle.width,
                obstacle.height
            );
        });

        // プレイヤー
        this.ctx.fillStyle = this.playerChar.color;
        this.ctx.fillRect(
            100 + this.playerChar.x,
            100 + this.playerChar.y,
            this.playerChar.size,
            this.playerChar.size
        );

        // 対戦相手
        if (this.pvpOpponent) {
            this.ctx.fillStyle = this.pvpOpponent.color;
            this.ctx.fillRect(
                100 + this.pvpOpponent.x,
                100 + this.pvpOpponent.y,
                this.playerChar.size,
                this.playerChar.size
            );

            // 対戦相手のHP
            this.renderHealthBar(
                100 + this.pvpOpponent.x,
                100 + this.pvpOpponent.y - 10,
                this.pvpOpponent.hp,
                this.pvpOpponent.maxHp
            );
        }

        // プレイヤーのHP
        this.renderHealthBar(
            100 + this.playerChar.x,
            100 + this.playerChar.y - 10,
            this.rpgSystem.player.hp,
            this.rpgSystem.player.maxHp
        );

        // アリーナ名
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(this.pvpBattleArena.name, 110, 90);

        // 操作説明
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('矢印キー: 移動 | Space: 攻撃 | X: スペシャル攻撃 | ESC: 退出', 110, this.canvas.height - 20);
    }

    renderHealthBar(x, y, hp, maxHp) {
        const width = 30;
        const height = 4;
        const hpRatio = hp / maxHp;

        // 背景
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, width, height);

        // HP
        this.ctx.fillStyle = hpRatio > 0.5 ? '#00ff00' : hpRatio > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(x, y, width * hpRatio, height);
    }

    renderLeaderboard() {
        if (!this.showUI.leaderboard) return;

        const pos = { x: this.canvas.width - 250, y: 50, width: 240, height: 300 };

        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        // 境界
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        // タイトル
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('リーダーボード', pos.x + 10, pos.y + 25);

        // リーダーボードデータ
        const leaderboard = this.rankingSystem.getLeaderboard(10);
        this.ctx.font = '12px Arial';

        leaderboard.forEach((player, index) => {
            const y = pos.y + 50 + (index * 20);
            const rankColor = this.getRankColor(player.rank);

            this.ctx.fillStyle = rankColor;
            this.ctx.fillText(`${index + 1}. ${player.playerId}`, pos.x + 10, y);
            this.ctx.fillText(`${player.rating}`, pos.x + 150, y);
            this.ctx.fillText(`${player.rank}`, pos.x + 190, y);
        });

        // 操作説明
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('L: 閉じる', pos.x + 10, pos.y + pos.height - 10);
    }

    getRankColor(rank) {
        const colors = {
            'Bronze': '#CD7F32',
            'Silver': '#C0C0C0',
            'Gold': '#FFD700',
            'Platinum': '#E5E4E2',
            'Diamond': '#B9F2FF',
            'Master': '#FF6347',
            'Grandmaster': '#FF1493'
        };
        return colors[rank] || '#ffffff';
    }

    renderTournament() {
        if (!this.showUI.tournament) return;

        const pos = { x: 50, y: 300, width: 300, height: 250 };

        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        // 境界
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);

        // タイトル
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('トーナメント', pos.x + 10, pos.y + 25);

        // アクティブトーナメント
        const activeTournaments = this.tournamentSystem.getActiveTournaments();
        this.ctx.font = '12px Arial';

        if (activeTournaments.length === 0) {
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillText('アクティブなトーナメントはありません', pos.x + 10, pos.y + 50);

            this.ctx.fillText('新しいトーナメントを作成:', pos.x + 10, pos.y + 80);
            this.ctx.fillText('1. 8人制シングルエリミネーション', pos.x + 10, pos.y + 100);
            this.ctx.fillText('2. 4人制ラウンドロビン', pos.x + 10, pos.y + 120);
        } else {
            activeTournaments.forEach((tournament, index) => {
                const y = pos.y + 50 + (index * 40);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(`${tournament.name}`, pos.x + 10, y);
                this.ctx.fillStyle = '#cccccc';
                this.ctx.fillText(`参加者: ${tournament.participants.length}/${tournament.maxParticipants}`, pos.x + 10, y + 15);
                this.ctx.fillText(`状態: ${tournament.status}`, pos.x + 10, y + 30);
            });
        }

        // 操作説明
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('T: 閉じる', pos.x + 10, pos.y + pos.height - 10);
    }

    tryHarvestResource() {
        const playerPos = {
            x: this.dungeonSystem.playerMapX * this.dungeonSystem.cellSize + this.dungeonSystem.cellSize / 2,
            y: this.dungeonSystem.playerMapY * this.dungeonSystem.cellSize + this.dungeonSystem.cellSize / 2
        };

        const skillLevel = this.rpgSystem.player.skills.mining; // 仮にminingスキルを使用
        const result = this.resourceManager.tryHarvest(
            playerPos,
            this.rpgSystem.player.level,
            skillLevel,
            this.rpgSystem.player.stamina
        );

        if (result) {
            if (this.rpgSystem.consumeStamina(result.staminaCost)) {
                this.addMessage(`${result.type} (${result.rarity}) x${result.amount} を採取しました`);

                // スキル経験値を追加
                const skillName = this.getSkillNameForResource(result.type);
                this.rpgSystem.addSkillExp(skillName, 10);
            } else {
                this.addMessage('スタミナが不足しています');
            }
        } else {
            this.addMessage('近くに採取できるリソースがありません');
        }
    }

    getSkillNameForResource(resourceType) {
        const mapping = {
            ore: 'mining',
            herb: 'herbalism',
            wood: 'mining',
            crystal: 'mining',
            food: 'herbalism'
        };
        return mapping[resourceType] || 'mining';
    }

    // 基地建設UI
    renderBaseUI() {
        if (!this.showUI.base) return;

        const x = 420;
        const y = 100;
        const width = 360;
        const height = 480;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('基地建設 (B)', x + 10, y + 25);

        const baseInfo = this.baseSystem;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`基地Lv.${baseInfo.baseLevel} (範囲: ${baseInfo.baseRadius}m)`, x + 10, y + 50);

        this.ctx.fillText('建設可能な施設:', x + 10, y + 75);

        const buildings = this.baseSystem.getBuildingsList().slice(0, 8);
        let yOffset = 100;

        for (const building of buildings) {
            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.fillText(`${building.name}`, x + 10, y + yOffset);

            const costText = Object.entries(building.cost).map(([r, amt]) => `${r}:${amt}`).join(', ');
            this.ctx.font = '12px Arial';
            this.ctx.fillText(costText, x + 20, y + yOffset + 15);
            this.ctx.font = '14px Arial';

            yOffset += 45;
        }

        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('※基地範囲内で建設可能', x + 10, y + height - 10);
    }

    // クエストUI
    renderQuestUI() {
        if (!this.showUI.quest) return;

        const x = 420;
        const y = 100;
        const width = 360;
        const height = 480;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('クエスト (J)', x + 10, y + 25);

        const activeQuests = this.questSystem.getActiveQuests();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`アクティブ: ${activeQuests.length}/5`, x + 10, y + 50);

        let yOffset = 75;
        for (const quest of activeQuests.slice(0, 6)) {
            this.ctx.fillStyle = quest.completed ? '#00ff00' : '#ffffff';
            this.ctx.fillText(`${quest.name}`, x + 10, y + yOffset);

            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`${quest.description}`, x + 20, y + yOffset + 15);
            this.ctx.fillText(`進行度: ${quest.progressPercent}%`, x + 20, y + yOffset + 30);
            this.ctx.font = '14px Arial';

            yOffset += 55;
        }

        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('完了したクエストは自動的に報酬を獲得', x + 10, y + height - 10);
    }

    // ギルドUI
    renderGuildUI() {
        if (!this.showUI.guild) return;

        const x = 420;
        const y = 100;
        const width = 360;
        const height = 400;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#9370DB';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = '#9370DB';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('ギルド (G)', x + 10, y + 25);

        const guildInfo = this.guildSystem.getGuildInfo();
        if (guildInfo.inGuild) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`${guildInfo.guildName}`, x + 10, y + 50);
            this.ctx.fillText(`ランク: ${guildInfo.rank}`, x + 10, y + 70);
            this.ctx.fillText(`貢献度: ${guildInfo.contribution}`, x + 10, y + 90);
            this.ctx.fillText(`総貢献度: ${guildInfo.totalContribution}`, x + 10, y + 110);

            this.ctx.fillText('ベネフィット:', x + 10, y + 140);
            let yOffset = 160;
            const benefits = Object.entries(guildInfo.benefits);
            for (const [key, value] of benefits.slice(0, 5)) {
                this.ctx.fillStyle = '#aaaaaa';
                this.ctx.fillText(`${key}: +${(value * 100).toFixed(0)}%`, x + 20, y + yOffset);
                yOffset += 20;
            }

            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`次のランク: ${guildInfo.nextRank}`, x + 10, y + 280);
            if (guildInfo.nextRankRequirement) {
                this.ctx.fillText(`必要貢献度: ${guildInfo.nextRankRequirement}`, x + 10, y + 300);
            }
        } else {
            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('ギルドに所属していません', x + 10, y + 50);
        }
    }

    // トレードUI
    renderTradeUI() {
        if (!this.showUI.trade) return;

        const x = 420;
        const y = 100;
        const width = 360;
        const height = 400;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('トレード (U)', x + 10, y + 25);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('NPCトレーダー:', x + 10, y + 50);

        const traders = this.tradeSystem.getAvailableTraders();
        let yOffset = 75;

        for (const trader of traders) {
            this.ctx.fillStyle = '#00ff88';
            this.ctx.fillText(`${trader.name}`, x + 10, y + yOffset);

            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`取引可能数: ${trader.trades.length}`, x + 20, y + yOffset + 15);
            this.ctx.font = '14px Arial';

            yOffset += 40;
        }

        const marketInfo = this.tradeSystem.getMarketInfo();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(`マーケット出品数: ${marketInfo.totalListings}`, x + 10, y + 250);
        this.ctx.fillText(`自分の出品: ${marketInfo.playerListings}`, x + 10, y + 270);
    }

    // 時間・天候UI（常時表示）
    renderTimeWeatherUI() {
        const info = this.timeWeatherSystem.getInfo();
        const effect = this.timeWeatherSystem.getScreenEffect();

        // 画面右上に表示
        const x = this.canvas.width - 180;
        const y = 10;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(x, y, 170, 80);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`${info.day}日目 ${info.time}`, x + 10, y + 20);
        this.ctx.fillText(`${info.phase} / ${info.weather}`, x + 10, y + 40);
        this.ctx.fillText(`${info.season}`, x + 10, y + 60);

        // 天候エフェクトを画面全体に適用
        if (effect.weatherColor) {
            this.ctx.fillStyle = effect.weatherColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 明るさ調整（夜は暗く）
        const darkness = 1 - effect.brightness;
        if (darkness > 0) {
            this.ctx.fillStyle = `rgba(0, 0, 20, ${darkness * 0.7})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲーム開始
let game;