// WebSocket模擬システム - マルチプレイヤー通信基盤
class MockWebSocket {
    constructor() {
        this.isConnected = false;
        this.eventHandlers = {};
        this.pingInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect(serverUrl) {
        console.log(`接続中: ${serverUrl}`);

        // 模擬接続処理
        setTimeout(() => {
            this.isConnected = true;
            this.emit('open', { message: 'サーバーに接続しました' });
            this.startPing();
        }, 1000);
    }

    send(data) {
        if (!this.isConnected) {
            console.warn('サーバーに接続されていません');
            return false;
        }

        // 模擬送信処理
        console.log('送信:', data);

        // 模擬応答（実際のWebSocketでは不要）
        setTimeout(() => {
            this.handleMockResponse(data);
        }, 100 + Math.random() * 200);

        return true;
    }

    handleMockResponse(originalData) {
        const data = JSON.parse(originalData);

        switch(data.type) {
            case 'join_room':
                this.emit('message', JSON.stringify({
                    type: 'room_joined',
                    roomId: data.roomId,
                    playerId: data.playerId,
                    players: this.generateMockPlayers(data.roomId)
                }));
                break;

            case 'player_action':
                // 他プレイヤーの行動をブロードキャスト
                this.emit('message', JSON.stringify({
                    type: 'player_action_broadcast',
                    playerId: data.playerId,
                    action: data.action,
                    data: data.data
                }));
                break;

            case 'chat_message':
                this.emit('message', JSON.stringify({
                    type: 'chat_broadcast',
                    playerId: data.playerId,
                    message: data.message,
                    timestamp: Date.now()
                }));
                break;
        }
    }

    generateMockPlayers(roomId) {
        const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana'];
        const players = [];
        const playerCount = Math.floor(Math.random() * 3) + 2; // 2-4人

        for (let i = 0; i < playerCount; i++) {
            players.push({
                id: `player_${i}`,
                name: playerNames[i],
                level: Math.floor(Math.random() * 50) + 1,
                class: ['Warrior', 'Mage', 'Rogue', 'Cleric'][Math.floor(Math.random() * 4)],
                isAI: i > 0 // 最初のプレイヤー以外はAI
            });
        }

        return players;
    }

    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    close() {
        this.isConnected = false;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.emit('close', { message: 'サーバーとの接続が切断されました' });
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(data));
        }
    }
}

// マルチプレイヤーマネージャー
class MultiplayerManager {
    constructor() {
        this.socket = new MockWebSocket();
        this.isConnected = false;
        this.currentRoom = null;
        this.localPlayer = null;
        this.remotePlayers = new Map();
        this.connectionStatus = 'disconnected'; // disconnected, connecting, connected

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('open', (data) => {
            this.isConnected = true;
            this.connectionStatus = 'connected';
            console.log('マルチプレイヤー接続:', data.message);
        });

        this.socket.on('message', (message) => {
            const data = JSON.parse(message);
            this.handleServerMessage(data);
        });

        this.socket.on('close', (data) => {
            this.isConnected = false;
            this.connectionStatus = 'disconnected';
            console.log('マルチプレイヤー切断:', data.message);
        });
    }

    connect() {
        if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
            return;
        }

        this.connectionStatus = 'connecting';
        this.socket.connect('ws://localhost:8080');
    }

    joinRoom(roomId, playerData) {
        if (!this.isConnected) {
            console.warn('サーバーに接続されていません');
            return false;
        }

        this.localPlayer = {
            id: playerData.id || `player_${Date.now()}`,
            name: playerData.name || 'Player',
            level: playerData.level || 1,
            class: playerData.class || 'Warrior',
            x: playerData.x || 0,
            y: playerData.y || 0
        };

        this.socket.send(JSON.stringify({
            type: 'join_room',
            roomId: roomId,
            playerId: this.localPlayer.id,
            playerData: this.localPlayer
        }));

        return true;
    }

    sendPlayerAction(action, data) {
        if (!this.isConnected || !this.currentRoom) {
            return false;
        }

        this.socket.send(JSON.stringify({
            type: 'player_action',
            roomId: this.currentRoom.id,
            playerId: this.localPlayer.id,
            action: action,
            data: data
        }));

        return true;
    }

    sendChatMessage(message) {
        if (!this.isConnected || !this.currentRoom) {
            return false;
        }

        this.socket.send(JSON.stringify({
            type: 'chat_message',
            roomId: this.currentRoom.id,
            playerId: this.localPlayer.id,
            message: message
        }));

        return true;
    }

    handleServerMessage(data) {
        switch(data.type) {
            case 'room_joined':
                this.currentRoom = {
                    id: data.roomId,
                    players: data.players
                };
                console.log(`ルーム ${data.roomId} に参加しました`);
                break;

            case 'player_action_broadcast':
                if (data.playerId !== this.localPlayer.id) {
                    this.updateRemotePlayer(data.playerId, data.action, data.data);
                }
                break;

            case 'chat_broadcast':
                this.handleChatMessage(data.playerId, data.message, data.timestamp);
                break;

            case 'player_joined':
                console.log(`プレイヤー ${data.playerName} が参加しました`);
                break;

            case 'player_left':
                console.log(`プレイヤー ${data.playerName} が退出しました`);
                this.remotePlayers.delete(data.playerId);
                break;
        }
    }

    updateRemotePlayer(playerId, action, data) {
        if (!this.remotePlayers.has(playerId)) {
            this.remotePlayers.set(playerId, {
                id: playerId,
                x: 0,
                y: 0,
                lastUpdate: Date.now()
            });
        }

        const player = this.remotePlayers.get(playerId);

        switch(action) {
            case 'move':
                player.x = data.x;
                player.y = data.y;
                break;
            case 'attack':
                player.isAttacking = true;
                player.attackTarget = data.target;
                break;
            case 'use_item':
                player.lastItemUsed = data.itemId;
                break;
        }

        player.lastUpdate = Date.now();
    }

    handleChatMessage(playerId, message, timestamp) {
        const playerName = this.getPlayerName(playerId);
        console.log(`[チャット] ${playerName}: ${message}`);

        // ゲームイベントとして配信
        if (window.game && window.game.addMessage) {
            window.game.addMessage(`${playerName}: ${message}`);
        }
    }

    getPlayerName(playerId) {
        if (playerId === this.localPlayer?.id) {
            return this.localPlayer.name;
        }

        if (this.currentRoom) {
            const player = this.currentRoom.players.find(p => p.id === playerId);
            return player ? player.name : 'Unknown Player';
        }

        return 'Unknown Player';
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            status: this.connectionStatus,
            room: this.currentRoom,
            localPlayer: this.localPlayer,
            remotePlayers: Array.from(this.remotePlayers.values())
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.currentRoom = null;
        this.remotePlayers.clear();
    }
}

// AI制御模擬プレイヤーシステム
class AIPlayer {
    constructor(playerData) {
        this.id = playerData.id;
        this.name = playerData.name;
        this.level = playerData.level;
        this.class = playerData.class;
        this.x = Math.random() * 800;
        this.y = Math.random() * 600;

        this.behavior = this.generateBehavior();
        this.lastAction = Date.now();
        this.actionCooldown = 2000 + Math.random() * 3000;
    }

    generateBehavior() {
        const behaviors = [
            'aggressive',   // 積極的に戦闘を求める
            'defensive',    // 慎重に行動
            'explorer',     // 探索を重視
            'supportive'    // 他プレイヤーをサポート
        ];

        return behaviors[Math.floor(Math.random() * behaviors.length)];
    }

    update(gameState, otherPlayers) {
        const now = Date.now();

        if (now - this.lastAction < this.actionCooldown) {
            return null;
        }

        this.lastAction = now;
        this.actionCooldown = 1000 + Math.random() * 4000;

        return this.decideAction(gameState, otherPlayers);
    }

    decideAction(gameState, otherPlayers) {
        const actions = [];

        switch(this.behavior) {
            case 'aggressive':
                if (Math.random() < 0.7) {
                    actions.push({ type: 'move_to_enemy', priority: 0.8 });
                    actions.push({ type: 'attack', priority: 0.9 });
                }
                break;

            case 'defensive':
                if (Math.random() < 0.6) {
                    actions.push({ type: 'move_to_safe_position', priority: 0.7 });
                    actions.push({ type: 'use_healing_item', priority: 0.8 });
                }
                break;

            case 'explorer':
                if (Math.random() < 0.8) {
                    actions.push({ type: 'explore_area', priority: 0.9 });
                    actions.push({ type: 'collect_items', priority: 0.7 });
                }
                break;

            case 'supportive':
                if (Math.random() < 0.6) {
                    actions.push({ type: 'follow_player', priority: 0.8 });
                    actions.push({ type: 'share_items', priority: 0.6 });
                }
                break;
        }

        // ランダムアクション
        if (Math.random() < 0.3) {
            actions.push({ type: 'chat_message', priority: 0.3 });
        }

        if (actions.length === 0) {
            return { type: 'idle' };
        }

        // 優先度の高いアクションを選択
        actions.sort((a, b) => b.priority - a.priority);
        return this.executeAction(actions[0], gameState, otherPlayers);
    }

    executeAction(action, gameState, otherPlayers) {
        switch(action.type) {
            case 'move_to_enemy':
                return {
                    type: 'move',
                    data: {
                        x: this.x + (Math.random() - 0.5) * 100,
                        y: this.y + (Math.random() - 0.5) * 100
                    }
                };

            case 'attack':
                return {
                    type: 'attack',
                    data: {
                        target: { x: this.x + 50, y: this.y },
                        damage: Math.floor(Math.random() * 20) + 10
                    }
                };

            case 'chat_message':
                const messages = [
                    'こんにちは！',
                    'この敵は強いですね',
                    'アイテムを見つけました',
                    '一緒に戦いましょう',
                    'レベルアップしました！'
                ];
                return {
                    type: 'chat',
                    data: {
                        message: messages[Math.floor(Math.random() * messages.length)]
                    }
                };

            default:
                return { type: 'idle' };
        }
    }
}

// AI制御プレイヤーマネージャー
class AIPlayerManager {
    constructor() {
        this.aiPlayers = new Map();
        this.updateInterval = null;
    }

    addAIPlayer(playerData) {
        const aiPlayer = new AIPlayer(playerData);
        this.aiPlayers.set(aiPlayer.id, aiPlayer);
        return aiPlayer;
    }

    removeAIPlayer(playerId) {
        this.aiPlayers.delete(playerId);
    }

    startSimulation(gameState) {
        this.updateInterval = setInterval(() => {
            this.updateAllAI(gameState);
        }, 2000);
    }

    stopSimulation() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateAllAI(gameState) {
        const allPlayers = Array.from(this.aiPlayers.values());

        this.aiPlayers.forEach(aiPlayer => {
            const action = aiPlayer.update(gameState, allPlayers);
            if (action && action.type !== 'idle') {
                this.executeAIAction(aiPlayer, action);
            }
        });
    }

    executeAIAction(aiPlayer, action) {
        // マルチプレイヤーマネージャーを通じてアクションを送信
        if (window.multiplayerManager) {
            switch(action.type) {
                case 'move':
                    aiPlayer.x = action.data.x;
                    aiPlayer.y = action.data.y;
                    break;

                case 'chat':
                    console.log(`[AI ${aiPlayer.name}]: ${action.data.message}`);
                    if (window.game && window.game.addMessage) {
                        window.game.addMessage(`${aiPlayer.name}: ${action.data.message}`);
                    }
                    break;
            }
        }
    }

    getAIPlayers() {
        return Array.from(this.aiPlayers.values());
    }
}