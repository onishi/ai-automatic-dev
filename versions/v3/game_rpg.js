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

        // ゲーム状態
        this.gameState = 'menu'; // menu, dungeon_explore, battle, shop, status, inventory, equipment, gameOver
        this.showUI = {
            miniMap: true,
            stats: true,
            inventory: false,
            statusScreen: false,
            equipment: false,
            shopUI: false
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

        // 初期装備を追加
        this.addStartingItems();

        this.addMessage('新しいダンジョンに入りました');
        this.addMessage('矢印キー: 移動, Space: アクション, I: インベントリ, E: 装備, S: ステータス');
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
        // ゲームロジックの更新は主にキー入力で処理されるため、ここでは最小限
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
            case 'gameOver':
                this.renderGameOver();
                break;
        }

        // 共通UI
        if (this.gameState === 'dungeon_explore' || this.gameState === 'battle') {
            this.renderUI();
        }
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

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲーム開始
let game;