// リソースシステム

class ResourceNode {
    constructor(type, rarity, position) {
        this.type = type; // wood, ore, herb, crystal, food
        this.rarity = rarity; // common, rare, epic, legendary
        this.position = position;
        this.amount = this.calculateAmount();
        this.respawnTime = Date.now() + this.getRespawnDelay();
        this.isActive = true;
    }

    calculateAmount() {
        const baseAmount = {
            common: [3, 5],
            rare: [2, 4],
            epic: [1, 3],
            legendary: [1, 2]
        };
        const range = baseAmount[this.rarity];
        return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    getRespawnDelay() {
        const delays = {
            common: 30000,
            rare: 60000,
            epic: 120000,
            legendary: 300000
        };
        return delays[this.rarity];
    }

    harvest(playerLevel, skillLevel) {
        if (!this.isActive) return null;

        const staminaCost = 10;
        const baseAmount = this.amount;
        const bonusAmount = Math.floor(skillLevel * 0.2);
        const totalAmount = baseAmount + bonusAmount;

        this.isActive = false;
        setTimeout(() => {
            this.isActive = true;
            this.amount = this.calculateAmount();
        }, this.getRespawnDelay());

        return {
            type: this.type,
            rarity: this.rarity,
            amount: totalAmount,
            staminaCost: staminaCost
        };
    }

    draw(ctx, cameraX, cameraY) {
        if (!this.isActive) return;

        const screenX = this.position.x - cameraX;
        const screenY = this.position.y - cameraY;

        const colors = {
            wood: { base: '#8B4513', glow: '#D2691E' },
            ore: { base: '#808080', glow: '#C0C0C0' },
            herb: { base: '#228B22', glow: '#90EE90' },
            crystal: { base: '#4169E1', glow: '#87CEEB' },
            food: { base: '#FFD700', glow: '#FFFF00' }
        };

        const rarityColors = {
            common: '#FFFFFF',
            rare: '#4169E1',
            epic: '#9932CC',
            legendary: '#FFD700'
        };

        ctx.save();

        // グロー効果
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors[this.type].glow;

        // リソースノードを描画
        ctx.fillStyle = colors[this.type].base;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
        ctx.fill();

        // レアリティ表示
        ctx.strokeStyle = rarityColors[this.rarity];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
        ctx.stroke();

        // タイプアイコン
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { wood: 'W', ore: 'O', herb: 'H', crystal: 'C', food: 'F' };
        ctx.fillText(icons[this.type], screenX, screenY);

        ctx.restore();
    }
}

class ResourceManager {
    constructor() {
        this.resources = {
            wood: { common: 0, rare: 0, epic: 0, legendary: 0 },
            ore: { common: 0, rare: 0, epic: 0, legendary: 0 },
            herb: { common: 0, rare: 0, epic: 0, legendary: 0 },
            crystal: { common: 0, rare: 0, epic: 0, legendary: 0 },
            food: { common: 0, rare: 0, epic: 0, legendary: 0 }
        };
        this.nodes = [];
        this.maxStorageCapacity = 1000;
    }

    addResource(type, rarity, amount) {
        if (this.getTotalResources() + amount > this.maxStorageCapacity) {
            return false;
        }
        this.resources[type][rarity] += amount;
        return true;
    }

    removeResource(type, rarity, amount) {
        if (this.resources[type][rarity] >= amount) {
            this.resources[type][rarity] -= amount;
            return true;
        }
        return false;
    }

    hasResource(type, rarity, amount) {
        return this.resources[type][rarity] >= amount;
    }

    getTotalResources() {
        let total = 0;
        for (let type in this.resources) {
            for (let rarity in this.resources[type]) {
                total += this.resources[type][rarity];
            }
        }
        return total;
    }

    generateNodes(dungeon, floor) {
        this.nodes = [];
        const nodeCount = 10 + Math.floor(floor * 2);

        for (let i = 0; i < nodeCount; i++) {
            const x = Math.random() * dungeon.width;
            const y = Math.random() * dungeon.height;
            const type = this.getRandomResourceType();
            const rarity = this.getRandomRarity(floor);

            this.nodes.push(new ResourceNode(type, rarity, { x, y }));
        }
    }

    getRandomResourceType() {
        const types = ['wood', 'ore', 'herb', 'crystal', 'food'];
        return types[Math.floor(Math.random() * types.length)];
    }

    getRandomRarity(floor) {
        const rand = Math.random();
        const floorBonus = floor * 0.02;

        if (rand < 0.5 - floorBonus) return 'common';
        if (rand < 0.8 - floorBonus * 0.5) return 'rare';
        if (rand < 0.95) return 'epic';
        return 'legendary';
    }

    tryHarvest(playerPos, playerLevel, skillLevel, stamina) {
        const harvestRange = 40;

        for (let node of this.nodes) {
            if (!node.isActive) continue;

            const dx = playerPos.x - node.position.x;
            const dy = playerPos.y - node.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < harvestRange) {
                const result = node.harvest(playerLevel, skillLevel);
                if (result && stamina >= result.staminaCost) {
                    if (this.addResource(result.type, result.rarity, result.amount)) {
                        return result;
                    }
                }
            }
        }
        return null;
    }

    drawNodes(ctx, cameraX, cameraY) {
        for (let node of this.nodes) {
            node.draw(ctx, cameraX, cameraY);
        }
    }

    save() {
        return {
            resources: JSON.parse(JSON.stringify(this.resources))
        };
    }

    load(data) {
        if (data && data.resources) {
            this.resources = data.resources;
        }
    }
}
