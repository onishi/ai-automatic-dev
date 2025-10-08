// ギルドシステム
class GuildSystem {
    constructor() {
        // プレイヤーのギルド所属情報
        this.playerGuild = null;
        this.guildRank = 'recruit'; // recruit, member, veteran, elite, officer, master

        // ギルドランク
        this.guildRanks = {
            recruit: { name: '新人', level: 1, benefits: {} },
            member: { name: 'メンバー', level: 2, benefits: { expBonus: 0.05, goldBonus: 0.05 } },
            veteran: { name: 'ベテラン', level: 3, benefits: { expBonus: 0.1, goldBonus: 0.1, craftBonus: 0.05 } },
            elite: { name: 'エリート', level: 4, benefits: { expBonus: 0.15, goldBonus: 0.15, craftBonus: 0.1, shopDiscount: 0.1 } },
            officer: { name: '幹部', level: 5, benefits: { expBonus: 0.2, goldBonus: 0.2, craftBonus: 0.15, shopDiscount: 0.15 } },
            master: { name: 'マスター', level: 6, benefits: { expBonus: 0.25, goldBonus: 0.25, craftBonus: 0.2, shopDiscount: 0.2 } }
        };

        // ギルド貢献度
        this.guildContribution = 0;
        this.totalContribution = 0;

        // ランクアップに必要な貢献度
        this.rankRequirements = {
            recruit: 0,
            member: 100,
            veteran: 300,
            elite: 600,
            officer: 1000,
            master: 2000
        };

        // ギルドショップ
        this.guildShopItems = [
            {
                id: 'guild_exp_boost',
                name: '経験値ブースト',
                description: '1時間経験値+50%',
                cost: 50,
                type: 'boost',
                duration: 3600000,
                effect: { expBonus: 0.5 }
            },
            {
                id: 'guild_gather_boost',
                name: '採取ブースト',
                description: '1時間採取量+50%',
                cost: 50,
                type: 'boost',
                duration: 3600000,
                effect: { gatherBonus: 0.5 }
            },
            {
                id: 'guild_craft_boost',
                name: 'クラフトブースト',
                description: '1時間クラフト成功率+30%',
                cost: 50,
                type: 'boost',
                duration: 3600000,
                effect: { craftBonus: 0.3 }
            },
            {
                id: 'guild_revival_token',
                name: '復活トークン',
                description: '死亡時に1回復活できる',
                cost: 100,
                type: 'consumable',
                effect: { revive: true }
            },
            {
                id: 'guild_teleport_scroll',
                name: 'テレポートスクロール',
                description: 'ギルドホールに瞬時に移動',
                cost: 30,
                type: 'consumable',
                effect: { teleport: 'guild_hall' }
            },
            {
                id: 'rare_material_box',
                name: 'レア素材ボックス',
                description: 'レアリソースをランダムに獲得',
                cost: 80,
                type: 'consumable',
                effect: { randomRareResources: 5 }
            },
            {
                id: 'guild_banner',
                name: 'ギルドバナー',
                description: 'ギルドメンバー全員に30分間バフ',
                cost: 150,
                type: 'consumable',
                effect: { guildBuff: { expBonus: 0.2, goldBonus: 0.2 }, duration: 1800000 }
            }
        ];

        // ギルドクエスト
        this.guildQuests = [];
        this.completedGuildQuests = [];

        // ギルドクエストテンプレート
        this.guildQuestTemplates = [
            {
                id: 'guild_hunt_100',
                name: 'ギルド討伐：100体',
                description: 'ギルドメンバーで合計100体の敵を倒す',
                type: 'guild_hunt',
                targetCount: 100,
                rewards: { guildExp: 500, contribution: 10 }
            },
            {
                id: 'guild_gather_500',
                name: 'ギルド採取：500個',
                description: 'ギルドメンバーで合計500個のリソースを集める',
                type: 'guild_gather',
                targetCount: 500,
                rewards: { guildExp: 400, contribution: 8 }
            },
            {
                id: 'guild_craft_50',
                name: 'ギルドクラフト：50個',
                description: 'ギルドメンバーで合計50個のアイテムをクラフトする',
                type: 'guild_craft',
                targetCount: 50,
                rewards: { guildExp: 300, contribution: 6 }
            },
            {
                id: 'guild_boss_raid',
                name: 'ギルドボス討伐',
                description: 'ギルドボスを討伐する',
                type: 'guild_boss',
                targetCount: 1,
                rewards: { guildExp: 1000, contribution: 30, specialReward: true }
            }
        ];

        // アクティブなブースト
        this.activeBoosts = [];
    }

    // ギルドに加入
    joinGuild(guildName) {
        this.playerGuild = guildName;
        this.guildRank = 'recruit';
        this.guildContribution = 0;

        return {
            success: true,
            message: `ギルド「${guildName}」に加入しました`
        };
    }

    // ギルドから脱退
    leaveGuild() {
        if (!this.playerGuild) {
            return { success: false, message: 'ギルドに所属していません' };
        }

        const oldGuild = this.playerGuild;
        this.playerGuild = null;
        this.guildRank = 'recruit';
        this.guildContribution = 0;
        this.activeBoosts = [];

        return {
            success: true,
            message: `ギルド「${oldGuild}」から脱退しました`
        };
    }

    // 貢献度を獲得
    gainContribution(amount, action = '') {
        if (!this.playerGuild) return { success: false };

        this.guildContribution += amount;
        this.totalContribution += amount;

        // ランクアップチェック
        const rankUp = this.checkRankUp();

        return {
            success: true,
            amount,
            action,
            rankUp
        };
    }

    // ランクアップチェック
    checkRankUp() {
        const ranks = Object.keys(this.guildRanks);
        const currentRankIndex = ranks.indexOf(this.guildRank);

        for (let i = currentRankIndex + 1; i < ranks.length; i++) {
            const nextRank = ranks[i];
            if (this.totalContribution >= this.rankRequirements[nextRank]) {
                this.guildRank = nextRank;
                return {
                    rankUp: true,
                    newRank: this.guildRanks[nextRank].name,
                    benefits: this.guildRanks[nextRank].benefits
                };
            }
        }

        return { rankUp: false };
    }

    // ギルドショップでアイテム購入
    buyGuildItem(itemId) {
        if (!this.playerGuild) {
            return { success: false, message: 'ギルドに所属していません' };
        }

        const item = this.guildShopItems.find(i => i.id === itemId);
        if (!item) {
            return { success: false, message: 'アイテムが見つかりません' };
        }

        if (this.guildContribution < item.cost) {
            return { success: false, message: '貢献度が不足しています' };
        }

        this.guildContribution -= item.cost;

        // ブーストアイテムの場合、アクティブリストに追加
        if (item.type === 'boost') {
            this.activeBoosts.push({
                ...item,
                activatedAt: Date.now(),
                expiresAt: Date.now() + item.duration
            });
        }

        return {
            success: true,
            message: `${item.name}を購入しました`,
            item
        };
    }

    // アクティブなブーストを更新（期限切れを削除）
    updateBoosts() {
        const now = Date.now();
        const expiredBoosts = [];

        this.activeBoosts = this.activeBoosts.filter(boost => {
            if (now >= boost.expiresAt) {
                expiredBoosts.push(boost.name);
                return false;
            }
            return true;
        });

        return expiredBoosts;
    }

    // 現在のブースト効果を取得
    getActiveBoostEffects() {
        this.updateBoosts();

        const effects = {};

        for (const boost of this.activeBoosts) {
            for (const [key, value] of Object.entries(boost.effect)) {
                effects[key] = (effects[key] || 0) + value;
            }
        }

        return effects;
    }

    // ギルドランクのベネフィットを取得
    getRankBenefits() {
        return this.guildRanks[this.guildRank].benefits;
    }

    // 全てのベネフィット（ランク + ブースト）
    getTotalBenefits() {
        const rankBenefits = this.getRankBenefits();
        const boostEffects = this.getActiveBoostEffects();

        const total = { ...rankBenefits };

        for (const [key, value] of Object.entries(boostEffects)) {
            total[key] = (total[key] || 0) + value;
        }

        return total;
    }

    // ギルドクエストを生成
    generateGuildQuests() {
        this.guildQuests = [];

        // ランダムに2つのギルドクエストを選択
        const templates = [...this.guildQuestTemplates];
        for (let i = 0; i < 2 && templates.length > 0; i++) {
            const index = Math.floor(Math.random() * templates.length);
            const template = templates.splice(index, 1)[0];

            this.guildQuests.push({
                ...template,
                progress: 0,
                completed: false,
                startTime: Date.now()
            });
        }
    }

    // ギルドクエストの進行を更新
    updateGuildQuestProgress(type, amount = 1) {
        if (!this.playerGuild) return;

        for (const quest of this.guildQuests) {
            if (quest.completed) continue;

            if (quest.type === type) {
                quest.progress = Math.min(quest.progress + amount, quest.targetCount);

                if (quest.progress >= quest.targetCount) {
                    quest.completed = true;
                    quest.completedTime = Date.now();
                }
            }
        }
    }

    // ギルドクエスト報酬を受け取る
    claimGuildQuestReward(questId) {
        const questIndex = this.guildQuests.findIndex(q => q.id === questId);
        if (questIndex === -1) {
            return { success: false, message: 'クエストが見つかりません' };
        }

        const quest = this.guildQuests[questIndex];
        if (!quest.completed) {
            return { success: false, message: 'クエストが完了していません' };
        }

        const rewards = { ...quest.rewards };

        // 貢献度を獲得
        if (rewards.contribution) {
            this.gainContribution(rewards.contribution, 'ギルドクエスト達成');
        }

        // クエストを完了リストに移動
        this.completedGuildQuests.push(quest);
        this.guildQuests.splice(questIndex, 1);

        return {
            success: true,
            message: `ギルドクエスト「${quest.name}」の報酬を受け取りました`,
            rewards
        };
    }

    // ギルド情報を取得
    getGuildInfo() {
        if (!this.playerGuild) {
            return {
                inGuild: false,
                message: 'ギルドに所属していません'
            };
        }

        const rankInfo = this.guildRanks[this.guildRank];
        const nextRankKey = Object.keys(this.guildRanks)[Object.keys(this.guildRanks).indexOf(this.guildRank) + 1];
        const nextRankReq = nextRankKey ? this.rankRequirements[nextRankKey] : null;

        return {
            inGuild: true,
            guildName: this.playerGuild,
            rank: rankInfo.name,
            contribution: this.guildContribution,
            totalContribution: this.totalContribution,
            benefits: this.getTotalBenefits(),
            activeBoosts: this.activeBoosts.length,
            nextRank: nextRankKey ? this.guildRanks[nextRankKey].name : 'MAX',
            nextRankRequirement: nextRankReq,
            progressToNextRank: nextRankReq ? Math.min(100, (this.totalContribution / nextRankReq) * 100) : 100
        };
    }
}
