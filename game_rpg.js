class GameRPG {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // RPGとダンジョンシステム
        this.rpgSystem = new RPGSystem();
        this.dungeonSystem = new DungeonSystem();

        // ゲーム状態
        this.gameState = 'menu'; // menu, dungeon_explore, battle, shop, status, gameOver
        this.showUI = {
            miniMap: true,
            stats: true,
            inventory: false,
            statusScreen: false
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

        this.bindEvents();
        this.initialize();
        this.gameLoop();
    }

    initialize() {
        this.dungeonSystem.generateDungeon();
        this.addMessage('新しいダンジョンに入りました');
        this.addMessage('矢印キー: 移動, スペース: アクション, S: ステータス');
        this.gameState = 'dungeon_explore';
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
            this.showUI.inventory = !this.showUI.inventory;
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
        // ショップ実装（後で拡張）
        if (keyCode === 'KeyE' || keyCode === 'Escape') {
            this.gameState = 'dungeon_explore';
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
                const item = this.generateRandomItem();
                this.rpgSystem.addItem(item);
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
                const generatedItem = this.generateItemFromType(item.type, item.rarity);
                this.rpgSystem.addItem(generatedItem);
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

    generateItemFromType(type, rarity = 'common') {
        const rarityMultiplier = rarity === 'rare' ? 2 : 1;

        switch (type) {
            case 'weapon_upgrade':
                return {
                    type: 'weapon_upgrade',
                    name: rarity === 'rare' ? 'レア武器強化石' : '武器強化石',
                    bonus: 3 * rarityMultiplier
                };
            default:
                return this.generateRandomItem();
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
        this.rpgSystem = new RPGSystem();
        this.dungeonSystem = new DungeonSystem();
        this.messages = [];
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

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ショップ', this.canvas.width / 2, 100);

        this.ctx.font = '16px Arial';
        this.ctx.fillText('(実装予定)', this.canvas.width / 2, 150);
        this.ctx.fillText('Press E to Exit', this.canvas.width / 2, 200);
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