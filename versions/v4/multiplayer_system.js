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
        let data;
        try {
            data = JSON.parse(originalData);
        } catch (e) {
            console.error('Failed to parse mock response:', e);
            return;
        }

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

            case 'battle_challenge':
                this.emit('message', JSON.stringify({
                    type: 'battle_challenge_received',
                    challenger: data.playerId,
                    challengerName: data.challengerName,
                    target: data.targetId,
                    timestamp: Date.now()
                }));
                break;

            case 'accept_challenge':
                this.emit('message', JSON.stringify({
                    type: 'battle_started',
                    player1: data.playerId,
                    player2: data.challengerId,
                    battleId: 'battle_' + Date.now(),
                    arena: this.generateBattleArena(),
                    timestamp: Date.now()
                }));
                break;

            case 'battle_action':
                this.emit('message', JSON.stringify({
                    type: 'battle_result',
                    playerId: data.playerId,
                    action: data.action,
                    target: data.target,
                    damage: this.calculateDamage(data.action, data.attackPower),
                    position: data.position,
                    timestamp: Date.now()
                }));
                break;

            case 'request_matchmaking':
                setTimeout(() => {
                    this.emit('message', JSON.stringify({
                        type: 'match_found',
                        player1: data.playerId,
                        player2: 'ai_opponent_' + Math.floor(Math.random() * 1000),
                        battleId: 'ranked_battle_' + Date.now(),
                        arena: this.generateBattleArena(),
                        mode: data.mode || 'ranked',
                        timestamp: Date.now()
                    }));
                }, 2000 + Math.random() * 3000);
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

    generateBattleArena() {
        const arenas = [
            {
                name: '古代の闘技場',
                width: 600,
                height: 400,
                obstacles: [
                    { x: 200, y: 150, width: 50, height: 50 },
                    { x: 350, y: 200, width: 50, height: 50 }
                ],
                background: '#8B4513'
            },
            {
                name: '氷の要塞',
                width: 600,
                height: 400,
                obstacles: [
                    { x: 150, y: 100, width: 30, height: 100 },
                    { x: 420, y: 200, width: 30, height: 100 }
                ],
                background: '#ADD8E6'
            },
            {
                name: '溶岩の洞窟',
                width: 600,
                height: 400,
                obstacles: [
                    { x: 100, y: 200, width: 80, height: 30 },
                    { x: 400, y: 150, width: 80, height: 30 }
                ],
                background: '#DC143C'
            }
        ];

        return arenas[Math.floor(Math.random() * arenas.length)];
    }

    calculateDamage(action, attackPower) {
        const baseMinDamage = attackPower || 20;
        const baseMaxDamage = (attackPower || 20) * 2;

        switch(action) {
            case 'attack':
                return Math.floor(Math.random() * (baseMaxDamage - baseMinDamage + 1)) + baseMinDamage;
            case 'special_attack':
                return Math.floor(Math.random() * (baseMaxDamage * 1.5 - baseMinDamage + 1)) + baseMinDamage;
            case 'critical_attack':
                return Math.floor(Math.random() * (baseMaxDamage * 2 - baseMinDamage + 1)) + baseMinDamage;
            default:
                return Math.floor(Math.random() * 30) + 10;
        }
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
            try {
                const data = JSON.parse(message);
                this.handleServerMessage(data);
            } catch (e) {
                console.error('Failed to parse server message:', e);
            }
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

            case 'battle_challenge_received':
                this.handleBattleChallenge(data.challenger, data.challengerName);
                break;

            case 'battle_started':
                this.handleBattleStarted(data.player1, data.player2, data.battleId, data.arena);
                break;

            case 'battle_result':
                this.handleBattleResult(data);
                break;

            case 'match_found':
                this.handleMatchFound(data);
                break;

            default:
                console.warn('Unknown message type:', data.type);
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

    // PvPバトル機能の追加
    challengePlayer(targetPlayerId) {
        if (!this.isConnected || !this.currentRoom || !this.localPlayer) {
            return false;
        }

        this.socket.send(JSON.stringify({
            type: 'battle_challenge',
            roomId: this.currentRoom.id,
            playerId: this.localPlayer.id,
            challengerName: this.localPlayer.name,
            targetId: targetPlayerId
        }));

        return true;
    }

    acceptChallenge(challengerId) {
        if (!this.isConnected || !this.currentRoom || !this.localPlayer) {
            return false;
        }

        this.socket.send(JSON.stringify({
            type: 'accept_challenge',
            roomId: this.currentRoom.id,
            playerId: this.localPlayer.id,
            challengerId: challengerId
        }));

        return true;
    }

    sendBattleAction(action, target, attackPower, position) {
        if (!this.isConnected || !this.currentRoom || !this.localPlayer) {
            return false;
        }

        this.socket.send(JSON.stringify({
            type: 'battle_action',
            roomId: this.currentRoom.id,
            playerId: this.localPlayer.id,
            action: action,
            target: target,
            attackPower: attackPower,
            position: position
        }));

        return true;
    }

    requestMatchmaking(mode = 'ranked') {
        if (!this.isConnected || !this.localPlayer) {
            return false;
        }

        this.socket.send(JSON.stringify({
            type: 'request_matchmaking',
            playerId: this.localPlayer.id,
            mode: mode,
            playerLevel: this.localPlayer.level || 1
        }));

        return true;
    }

    // バトル関連ハンドラー
    handleBattleChallenge(challengerId, challengerName) {
        if (window.game && window.game.addMessage) {
            window.game.addMessage(`${challengerName}から対戦の挑戦を受けました！`);
            window.game.addMessage(`Yキーで受諾、Nキーで拒否`);
        }

        // ゲームにチャレンジ情報を保存
        if (window.game) {
            window.game.pendingChallenge = {
                challengerId: challengerId,
                challengerName: challengerName
            };
        }
    }

    handleBattleStarted(player1, player2, battleId, arena) {
        console.log(`バトル開始: ${player1} vs ${player2}`);

        if (window.game) {
            window.game.startPvPBattle({
                player1: player1,
                player2: player2,
                battleId: battleId,
                arena: arena
            });
        }
    }

    handleBattleResult(data) {
        if (window.game && window.game.processBattleResult) {
            window.game.processBattleResult(data);
        }
    }

    handleMatchFound(data) {
        console.log(`マッチが見つかりました: ${data.mode}モード`);

        if (window.game) {
            window.game.addMessage(`${data.mode}マッチが見つかりました！`);
            window.game.startPvPBattle({
                player1: data.player1,
                player2: data.player2,
                battleId: data.battleId,
                arena: data.arena,
                mode: data.mode
            });
        }
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

// ランキング・リーダーボードシステム
class RankingSystem {
    constructor() {
        this.playerStats = new Map();
        this.leaderboard = [];
        this.seasons = [];
        this.currentSeason = this.createNewSeason();
    }

    createNewSeason() {
        return {
            id: 'season_' + Date.now(),
            name: `シーズン ${this.seasons.length + 1}`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日間
            playerRankings: new Map()
        };
    }

    getPlayerStats(playerId) {
        if (!this.playerStats.has(playerId)) {
            this.playerStats.set(playerId, {
                playerId: playerId,
                totalMatches: 0,
                wins: 0,
                losses: 0,
                rating: 1200,
                rank: 'Bronze',
                winStreak: 0,
                bestWinStreak: 0,
                totalDamage: 0,
                averageDamage: 0,
                lastMatchDate: null
            });
        }
        return this.playerStats.get(playerId);
    }

    recordMatch(player1Id, player2Id, winnerId, matchData) {
        const player1Stats = this.getPlayerStats(player1Id);
        const player2Stats = this.getPlayerStats(player2Id);

        // 試合数を増加
        player1Stats.totalMatches++;
        player2Stats.totalMatches++;

        // 勝敗を記録
        if (winnerId === player1Id) {
            player1Stats.wins++;
            player1Stats.winStreak++;
            player1Stats.bestWinStreak = Math.max(player1Stats.bestWinStreak, player1Stats.winStreak);
            player2Stats.losses++;
            player2Stats.winStreak = 0;
        } else {
            player2Stats.wins++;
            player2Stats.winStreak++;
            player2Stats.bestWinStreak = Math.max(player2Stats.bestWinStreak, player2Stats.winStreak);
            player1Stats.losses++;
            player1Stats.winStreak = 0;
        }

        // レーティング更新
        this.updateRating(player1Stats, player2Stats, winnerId === player1Id);

        // ランク更新
        this.updateRank(player1Stats);
        this.updateRank(player2Stats);

        // ダメージ統計更新
        if (matchData.player1Damage) {
            player1Stats.totalDamage += matchData.player1Damage;
            player1Stats.averageDamage = player1Stats.totalDamage / player1Stats.totalMatches;
        }
        if (matchData.player2Damage) {
            player2Stats.totalDamage += matchData.player2Damage;
            player2Stats.averageDamage = player2Stats.totalDamage / player2Stats.totalMatches;
        }

        // 最終試合日更新
        const now = new Date();
        player1Stats.lastMatchDate = now;
        player2Stats.lastMatchDate = now;

        // リーダーボード更新
        this.updateLeaderboard();

        return {
            player1Stats: player1Stats,
            player2Stats: player2Stats,
            ratingChange: this.calculateRatingChange(player1Stats, player2Stats, winnerId === player1Id)
        };
    }

    updateRating(player1Stats, player2Stats, player1Won) {
        const K = 32; // K因子
        const expectedScore1 = 1 / (1 + Math.pow(10, (player2Stats.rating - player1Stats.rating) / 400));
        const expectedScore2 = 1 - expectedScore1;

        const actualScore1 = player1Won ? 1 : 0;
        const actualScore2 = 1 - actualScore1;

        const ratingChange1 = Math.round(K * (actualScore1 - expectedScore1));
        const ratingChange2 = Math.round(K * (actualScore2 - expectedScore2));

        player1Stats.rating += ratingChange1;
        player2Stats.rating += ratingChange2;

        // 最低レーティングを保証
        player1Stats.rating = Math.max(800, player1Stats.rating);
        player2Stats.rating = Math.max(800, player2Stats.rating);
    }

    calculateRatingChange(player1Stats, player2Stats, player1Won) {
        const K = 32;
        const expectedScore1 = 1 / (1 + Math.pow(10, (player2Stats.rating - player1Stats.rating) / 400));
        const actualScore1 = player1Won ? 1 : 0;
        return Math.round(K * (actualScore1 - expectedScore1));
    }

    updateRank(playerStats) {
        const rating = playerStats.rating;

        if (rating >= 2400) {
            playerStats.rank = 'Grandmaster';
        } else if (rating >= 2200) {
            playerStats.rank = 'Master';
        } else if (rating >= 2000) {
            playerStats.rank = 'Diamond';
        } else if (rating >= 1800) {
            playerStats.rank = 'Platinum';
        } else if (rating >= 1600) {
            playerStats.rank = 'Gold';
        } else if (rating >= 1400) {
            playerStats.rank = 'Silver';
        } else {
            playerStats.rank = 'Bronze';
        }
    }

    updateLeaderboard() {
        this.leaderboard = Array.from(this.playerStats.values())
            .filter(stats => stats.totalMatches >= 5) // 最低5試合
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 100); // トップ100
    }

    getLeaderboard(limit = 10) {
        return this.leaderboard.slice(0, limit);
    }

    getPlayerRank(playerId) {
        const playerStats = this.getPlayerStats(playerId);
        const rank = this.leaderboard.findIndex(stats => stats.playerId === playerId) + 1;
        return rank > 0 ? rank : null;
    }

    generateMatchmakingRating(playerId) {
        const stats = this.getPlayerStats(playerId);
        return {
            rating: stats.rating,
            rank: stats.rank,
            uncertaintyFactor: Math.max(0.1, 1 - (stats.totalMatches / 20))
        };
    }
}

// スペクテーター・リプレイシステム
class SpectatorSystem {
    constructor() {
        this.activeMatches = new Map();
        this.replays = new Map();
        this.spectators = new Map();
    }

    startSpectating(matchId, spectatorId) {
        if (!this.spectators.has(matchId)) {
            this.spectators.set(matchId, new Set());
        }
        this.spectators.get(matchId).add(spectatorId);

        // スペクテーター情報を返す
        return this.getMatchInfo(matchId);
    }

    stopSpectating(matchId, spectatorId) {
        if (this.spectators.has(matchId)) {
            this.spectators.get(matchId).delete(spectatorId);
            if (this.spectators.get(matchId).size === 0) {
                this.spectators.delete(matchId);
            }
        }
    }

    recordMatchEvent(matchId, event) {
        if (!this.activeMatches.has(matchId)) {
            this.activeMatches.set(matchId, {
                id: matchId,
                events: [],
                startTime: Date.now(),
                participants: event.participants || []
            });
        }

        const match = this.activeMatches.get(matchId);
        match.events.push({
            ...event,
            timestamp: Date.now(),
            sequenceNumber: match.events.length
        });

        // スペクテーターに配信
        this.broadcastToSpectators(matchId, event);
    }

    finishMatch(matchId, result) {
        const match = this.activeMatches.get(matchId);
        if (match) {
            match.endTime = Date.now();
            match.result = result;
            match.duration = match.endTime - match.startTime;

            // リプレイとして保存
            this.replays.set(matchId, {
                ...match,
                compressed: this.compressMatchData(match)
            });

            // アクティブマッチから削除
            this.activeMatches.delete(matchId);

            // スペクテーター終了通知
            this.broadcastToSpectators(matchId, {
                type: 'match_ended',
                result: result
            });
        }
    }

    broadcastToSpectators(matchId, event) {
        if (this.spectators.has(matchId)) {
            this.spectators.get(matchId).forEach(spectatorId => {
                // 実際の実装では WebSocket を通じて送信
                console.log(`スペクテーター ${spectatorId} に配信:`, event);
            });
        }
    }

    getMatchInfo(matchId) {
        return this.activeMatches.get(matchId) || this.replays.get(matchId);
    }

    getActiveMatches() {
        return Array.from(this.activeMatches.values());
    }

    getReplay(matchId) {
        return this.replays.get(matchId);
    }

    compressMatchData(match) {
        // 基本的な圧縮（重要なイベントのみ保持）
        const importantEvents = match.events.filter(event =>
            event.type === 'battle_start' ||
            event.type === 'player_attack' ||
            event.type === 'player_death' ||
            event.type === 'battle_end'
        );

        return {
            events: importantEvents,
            metadata: {
                duration: match.duration,
                participants: match.participants,
                result: match.result
            }
        };
    }
}

// トーナメントシステム
class TournamentSystem {
    constructor() {
        this.tournaments = new Map();
        this.activeTournaments = new Set();
    }

    createTournament(config) {
        const tournament = {
            id: 'tournament_' + Date.now(),
            name: config.name || 'トーナメント',
            type: config.type || 'single_elimination', // single_elimination, double_elimination, round_robin
            maxParticipants: config.maxParticipants || 8,
            entryFee: config.entryFee || 0,
            prizePool: config.prizePool || 0,
            startTime: config.startTime || new Date(Date.now() + 30 * 60 * 1000), // 30分後
            status: 'registration', // registration, in_progress, completed
            participants: [],
            matches: [],
            brackets: null,
            currentRound: 0
        };

        this.tournaments.set(tournament.id, tournament);
        return tournament;
    }

    registerForTournament(tournamentId, playerId, playerName) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'registration') {
            return false;
        }

        if (tournament.participants.length >= tournament.maxParticipants) {
            return false;
        }

        tournament.participants.push({
            playerId: playerId,
            playerName: playerName,
            seed: tournament.participants.length + 1,
            eliminated: false
        });

        return true;
    }

    startTournament(tournamentId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament || tournament.status !== 'registration') {
            return false;
        }

        if (tournament.participants.length < 2) {
            return false;
        }

        tournament.status = 'in_progress';
        tournament.brackets = this.generateBrackets(tournament);
        tournament.currentRound = 1;

        this.activeTournaments.add(tournamentId);
        this.scheduleFirstRoundMatches(tournament);

        return true;
    }

    generateBrackets(tournament) {
        const participants = [...tournament.participants];

        if (tournament.type === 'single_elimination') {
            return this.generateSingleEliminationBrackets(participants);
        } else if (tournament.type === 'round_robin') {
            return this.generateRoundRobinBrackets(participants);
        }

        return null;
    }

    generateSingleEliminationBrackets(participants) {
        const rounds = Math.ceil(Math.log2(participants.length));
        const brackets = [];

        // シード順に並び替え
        participants.sort((a, b) => a.seed - b.seed);

        for (let round = 1; round <= rounds; round++) {
            brackets.push({
                round: round,
                matches: []
            });
        }

        // 初回ラウンドのマッチを生成
        const firstRound = brackets[0];
        for (let i = 0; i < participants.length; i += 2) {
            if (i + 1 < participants.length) {
                firstRound.matches.push({
                    matchId: `match_1_${i/2}`,
                    player1: participants[i],
                    player2: participants[i + 1],
                    winner: null,
                    status: 'scheduled'
                });
            }
        }

        return brackets;
    }

    scheduleFirstRoundMatches(tournament) {
        const firstRound = tournament.brackets[0];
        firstRound.matches.forEach((match, index) => {
            setTimeout(() => {
                this.startTournamentMatch(tournament.id, match.matchId);
            }, index * 5000); // 5秒間隔でマッチ開始
        });
    }

    startTournamentMatch(tournamentId, matchId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return;

        const match = this.findMatch(tournament, matchId);
        if (!match) return;

        match.status = 'in_progress';

        // 実際の対戦を開始
        if (window.game) {
            window.game.addMessage(`トーナメント試合開始: ${match.player1.playerName} vs ${match.player2.playerName}`);
        }
    }

    reportTournamentMatchResult(tournamentId, matchId, winnerId) {
        const tournament = this.tournaments.get(tournamentId);
        if (!tournament) return;

        const match = this.findMatch(tournament, matchId);
        if (!match) return;

        match.winner = winnerId;
        match.status = 'completed';

        // 敗者を除外
        const loser = match.player1.playerId === winnerId ? match.player2 : match.player1;
        loser.eliminated = true;

        // 次のラウンドに進出
        this.advanceToNextRound(tournament, matchId, winnerId);

        // トーナメント完了チェック
        this.checkTournamentCompletion(tournament);
    }

    findMatch(tournament, matchId) {
        for (const round of tournament.brackets) {
            const match = round.matches.find(m => m.matchId === matchId);
            if (match) return match;
        }
        return null;
    }

    advanceToNextRound(tournament, currentMatchId, winnerId) {
        const currentRound = tournament.currentRound;
        const nextRound = currentRound + 1;

        if (nextRound > tournament.brackets.length) {
            return; // 最終ラウンド
        }

        const winner = tournament.participants.find(p => p.playerId === winnerId);
        const nextRoundBracket = tournament.brackets[nextRound - 1];

        // 次のラウンドの対応するマッチを見つけて winner を追加
        const nextMatchIndex = Math.floor(this.getMatchIndex(tournament, currentMatchId) / 2);
        const nextMatch = nextRoundBracket.matches[nextMatchIndex];

        if (!nextMatch.player1) {
            nextMatch.player1 = winner;
        } else {
            nextMatch.player2 = winner;
            // 両プレイヤーが決まったらマッチ開始
            setTimeout(() => {
                this.startTournamentMatch(tournament.id, nextMatch.matchId);
            }, 10000); // 10秒後
        }
    }

    getMatchIndex(tournament, matchId) {
        for (let roundIndex = 0; roundIndex < tournament.brackets.length; roundIndex++) {
            const round = tournament.brackets[roundIndex];
            const matchIndex = round.matches.findIndex(m => m.matchId === matchId);
            if (matchIndex !== -1) {
                return matchIndex;
            }
        }
        return -1;
    }

    checkTournamentCompletion(tournament) {
        const remainingPlayers = tournament.participants.filter(p => !p.eliminated);

        if (remainingPlayers.length === 1) {
            tournament.status = 'completed';
            tournament.winner = remainingPlayers[0];
            this.activeTournaments.delete(tournament.id);

            if (window.game) {
                window.game.addMessage(`トーナメント優勝: ${tournament.winner.playerName}！`);
            }
        }
    }

    getTournament(tournamentId) {
        return this.tournaments.get(tournamentId);
    }

    getActiveTournaments() {
        return Array.from(this.activeTournaments).map(id => this.tournaments.get(id));
    }
}
