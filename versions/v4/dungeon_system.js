class DungeonSystem {
    constructor() {
        this.mapWidth = 15;
        this.mapHeight = 10;
        this.roomCount = 8;
        this.currentRoom = null;
        this.currentDungeon = null;
        this.playerMapX = 0;
        this.playerMapY = 0;
        this.visitedRooms = new Set();
        this.roomTypes = ['normal', 'treasure', 'shop', 'boss'];
    }

    generateDungeon(playerLevel = 1) {
        this.playerLevel = playerLevel;
        const map = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
        const rooms = [];

        // スタート地点を設定
        const startX = Math.floor(this.mapWidth / 2);
        const startY = Math.floor(this.mapHeight / 2);
        map[startY][startX] = 1;
        rooms.push({
            x: startX,
            y: startY,
            type: 'start',
            cleared: false,
            enemies: [],
            items: []
        });

        // ランダムウォークで部屋を生成
        let currentX = startX;
        let currentY = startY;
        let roomsGenerated = 1;

        while (roomsGenerated < this.roomCount) {
            const directions = [
                { dx: 0, dy: -1 }, // 上
                { dx: 1, dy: 0 },  // 右
                { dx: 0, dy: 1 },  // 下
                { dx: -1, dy: 0 }  // 左
            ];

            const shuffledDirections = directions.sort(() => Math.random() - 0.5);

            for (const dir of shuffledDirections) {
                const newX = currentX + dir.dx;
                const newY = currentY + dir.dy;

                if (newX >= 0 && newX < this.mapWidth &&
                    newY >= 0 && newY < this.mapHeight &&
                    map[newY][newX] === 0) {

                    map[newY][newX] = 1;

                    // 部屋タイプを決定
                    let roomType = 'normal';
                    if (roomsGenerated === this.roomCount - 1) {
                        roomType = 'boss';
                    } else if (Math.random() < 0.3) {
                        roomType = Math.random() < 0.5 ? 'treasure' : 'shop';
                    }

                    rooms.push({
                        x: newX,
                        y: newY,
                        type: roomType,
                        cleared: false,
                        enemies: this.generateRoomEnemies(roomType, playerLevel),
                        items: this.generateRoomItems(roomType)
                    });

                    currentX = newX;
                    currentY = newY;
                    roomsGenerated++;
                    break;
                }
            }

            // 袋小路の場合は既存の部屋からランダムに選んで継続
            if (roomsGenerated < this.roomCount) {
                const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
                currentX = randomRoom.x;
                currentY = randomRoom.y;
            }
        }

        this.currentDungeon = {
            map: map,
            rooms: rooms,
            width: this.mapWidth,
            height: this.mapHeight
        };

        // プレイヤーをスタート地点に配置
        this.playerMapX = startX;
        this.playerMapY = startY;
        this.currentRoom = this.getCurrentRoom();
        this.visitedRooms.clear();
        this.visitedRooms.add(`${startX},${startY}`);

        return this.currentDungeon;
    }

    generateRoomEnemies(roomType, playerLevel = 1) {
        const enemies = [];
        const levelScale = 1 + (playerLevel - 1) * 0.3;

        if (roomType === 'normal') {
            const enemyCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < enemyCount; i++) {
                enemies.push({
                    type: 'basic',
                    health: Math.floor(40 * levelScale) + Math.floor(Math.random() * 20),
                    damage: Math.floor(8 * levelScale) + Math.floor(Math.random() * 4),
                    experience: Math.floor(15 * levelScale)
                });
            }
        } else if (roomType === 'boss') {
            enemies.push({
                type: 'boss',
                health: Math.floor(150 * levelScale * 1.5),
                damage: Math.floor(20 * levelScale),
                experience: Math.floor(100 * levelScale)
            });
        }

        return enemies;
    }

    generateRoomItems(roomType) {
        const items = [];

        if (roomType === 'treasure') {
            items.push({
                type: 'credits',
                amount: Math.floor(Math.random() * 100) + 50
            });

            if (Math.random() < 0.7) {
                items.push({
                    type: 'weapon_upgrade',
                    rarity: Math.random() < 0.3 ? 'rare' : 'common'
                });
            }
        } else if (roomType === 'shop') {
            items.push({
                type: 'shop_items',
                items: [
                    { type: 'health_potion', price: 30 },
                    { type: 'weapon_upgrade', price: 100 },
                    { type: 'shield_upgrade', price: 80 }
                ]
            });
        }

        return items;
    }

    getCurrentRoom() {
        if (!this.currentDungeon) return null;

        return this.currentDungeon.rooms.find(room =>
            room.x === this.playerMapX && room.y === this.playerMapY
        );
    }

    canMoveToDirection(direction) {
        const directions = {
            'up': { dx: 0, dy: -1 },
            'right': { dx: 1, dy: 0 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -1, dy: 0 }
        };

        const dir = directions[direction];
        if (!dir) return false;

        const newX = this.playerMapX + dir.dx;
        const newY = this.playerMapY + dir.dy;

        if (newX < 0 || newX >= this.mapWidth ||
            newY < 0 || newY >= this.mapHeight) {
            return false;
        }

        return this.currentDungeon.map[newY][newX] === 1;
    }

    moveToDirection(direction) {
        if (!this.canMoveToDirection(direction)) return false;

        const directions = {
            'up': { dx: 0, dy: -1 },
            'right': { dx: 1, dy: 0 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -1, dy: 0 }
        };

        const dir = directions[direction];
        this.playerMapX += dir.dx;
        this.playerMapY += dir.dy;
        this.currentRoom = this.getCurrentRoom();
        this.visitedRooms.add(`${this.playerMapX},${this.playerMapY}`);

        return true;
    }

    clearCurrentRoom() {
        if (this.currentRoom) {
            this.currentRoom.cleared = true;
            this.currentRoom.enemies = [];
        }
    }

    isRoomVisited(x, y) {
        return this.visitedRooms.has(`${x},${y}`);
    }

    getAdjacentRooms() {
        const adjacent = [];
        const directions = [
            { name: 'up', dx: 0, dy: -1 },
            { name: 'right', dx: 1, dy: 0 },
            { name: 'down', dx: 0, dy: 1 },
            { name: 'left', dx: -1, dy: 0 }
        ];

        for (const dir of directions) {
            const newX = this.playerMapX + dir.dx;
            const newY = this.playerMapY + dir.dy;

            if (newX >= 0 && newX < this.mapWidth &&
                newY >= 0 && newY < this.mapHeight &&
                this.currentDungeon.map[newY][newX] === 1) {

                const room = this.currentDungeon.rooms.find(r => r.x === newX && r.y === newY);
                adjacent.push({
                    direction: dir.name,
                    room: room
                });
            }
        }

        return adjacent;
    }

    drawMiniMap(ctx, x, y, width, height) {
        if (!this.currentDungeon) return;

        const cellWidth = width / this.mapWidth;
        const cellHeight = height / this.mapHeight;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, width, height);

        // 部屋を描画
        for (const room of this.currentDungeon.rooms) {
            const cellX = x + room.x * cellWidth;
            const cellY = y + room.y * cellHeight;

            // 部屋の色を決定
            let roomColor = '#333';
            if (this.isRoomVisited(room.x, room.y)) {
                if (room.type === 'start') roomColor = '#00ff00';
                else if (room.type === 'boss') roomColor = '#ff0000';
                else if (room.type === 'treasure') roomColor = '#ffff00';
                else if (room.type === 'shop') roomColor = '#00ffff';
                else if (room.cleared) roomColor = '#888';
                else roomColor = '#fff';
            }

            ctx.fillStyle = roomColor;
            ctx.fillRect(cellX + 1, cellY + 1, cellWidth - 2, cellHeight - 2);

            // 現在の部屋をハイライト
            if (room.x === this.playerMapX && room.y === this.playerMapY) {
                ctx.strokeStyle = '#ff6600';
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
            }
        }

        // ミニマップの枠
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    }
}
