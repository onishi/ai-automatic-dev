// クエストシステム
class QuestSystem {
    constructor() {
        // クエストテンプレート
        this.questTemplates = {
            // 討伐クエスト
            hunt_slimes: {
                id: 'hunt_slimes',
                name: 'スライム退治',
                description: 'スライムを5体倒す',
                type: 'hunt',
                target: 'slime',
                targetCount: 5,
                rewards: { exp: 50, gold: 30, wood: 5 },
                level: 1
            },
            hunt_goblins: {
                id: 'hunt_goblins',
                name: 'ゴブリン討伐',
                description: 'ゴブリンを3体倒す',
                type: 'hunt',
                target: 'goblin',
                targetCount: 3,
                rewards: { exp: 80, gold: 50, stone: 5 },
                level: 3
            },
            hunt_boss: {
                id: 'hunt_boss',
                name: 'ボス討伐',
                description: 'ダンジョンボスを倒す',
                type: 'hunt',
                target: 'boss',
                targetCount: 1,
                rewards: { exp: 200, gold: 150, crystal: 3 },
                level: 5
            },

            // 収集クエスト
            gather_wood: {
                id: 'gather_wood',
                name: '木材収集',
                description: '木材を20個集める',
                type: 'gather',
                target: 'wood',
                targetCount: 20,
                rewards: { exp: 40, gold: 20 },
                level: 1
            },
            gather_herbs: {
                id: 'gather_herbs',
                name: '薬草採集',
                description: '薬草を15個集める',
                type: 'gather',
                target: 'herb',
                targetCount: 15,
                rewards: { exp: 60, gold: 30 },
                level: 2
            },
            gather_rare: {
                id: 'gather_rare',
                name: 'レアリソース収集',
                description: 'レア以上のリソースを10個集める',
                type: 'gather_rare',
                targetCount: 10,
                rewards: { exp: 100, gold: 80, crystal: 2 },
                level: 4
            },

            // クラフトクエスト
            craft_items: {
                id: 'craft_items',
                name: 'アイテム製作',
                description: 'アイテムを3個クラフトする',
                type: 'craft',
                targetCount: 3,
                rewards: { exp: 70, gold: 40 },
                level: 2
            },
            craft_quality: {
                id: 'craft_quality',
                name: '高品質製作',
                description: 'Fine以上のアイテムを5個クラフトする',
                type: 'craft_quality',
                targetCount: 5,
                rewards: { exp: 120, gold: 70, crystal: 1 },
                level: 5
            },

            // 探索クエスト
            explore_floors: {
                id: 'explore_floors',
                name: 'ダンジョン探索',
                description: 'ダンジョンを3階まで到達する',
                type: 'explore',
                targetFloor: 3,
                rewards: { exp: 100, gold: 60 },
                level: 2
            },
            find_treasure: {
                id: 'find_treasure',
                name: '宝箱発見',
                description: '宝箱を5個開ける',
                type: 'treasure',
                targetCount: 5,
                rewards: { exp: 90, gold: 50, crystal: 1 },
                level: 3
            },

            // 基地クエスト
            build_base: {
                id: 'build_base',
                name: '基地建設',
                description: '建物を3つ建設する',
                type: 'build',
                targetCount: 3,
                rewards: { exp: 150, gold: 100 },
                level: 3
            },
            upgrade_base: {
                id: 'upgrade_base',
                name: '施設強化',
                description: '建物を5回アップグレードする',
                type: 'upgrade',
                targetCount: 5,
                rewards: { exp: 200, gold: 120, crystal: 2 },
                level: 6
            },

            // サバイバルクエスト
            survive_hunger: {
                id: 'survive_hunger',
                name: 'サバイバル',
                description: '空腹度50%以下で1時間生存',
                type: 'survive',
                duration: 60000, // 1分（テスト用に短縮）
                rewards: { exp: 80, gold: 50, food: 5 },
                level: 2
            },
            night_survival: {
                id: 'night_survival',
                name: '夜間生存',
                description: '夜を3回乗り越える',
                type: 'night_survive',
                targetCount: 3,
                rewards: { exp: 100, gold: 70 },
                level: 4
            }
        };

        // アクティブクエスト
        this.activeQuests = [];

        // 完了したクエスト履歴
        this.completedQuests = [];

        // デイリークエスト
        this.dailyQuests = [];
        this.lastDailyReset = Date.now();
    }

    // クエストを受注
    acceptQuest(questId) {
        const template = this.questTemplates[questId];
        if (!template) {
            return { success: false, message: 'クエストが見つかりません' };
        }

        // すでに受注済みかチェック
        if (this.activeQuests.find(q => q.id === questId)) {
            return { success: false, message: 'すでに受注しています' };
        }

        // アクティブクエスト数制限（最大5つ）
        if (this.activeQuests.length >= 5) {
            return { success: false, message: 'これ以上クエストを受注できません' };
        }

        const quest = {
            ...template,
            progress: 0,
            startTime: Date.now(),
            completed: false
        };

        this.activeQuests.push(quest);

        return {
            success: true,
            message: `クエスト「${template.name}」を受注しました`,
            quest
        };
    }

    // クエスト進行を更新
    updateProgress(type, value, count = 1) {
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;

            let updated = false;

            switch (quest.type) {
                case 'hunt':
                    if (type === 'enemy_defeated' && value === quest.target) {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'gather':
                    if (type === 'resource_gathered' && value === quest.target) {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'gather_rare':
                    if (type === 'rare_resource_gathered') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'craft':
                    if (type === 'item_crafted') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'craft_quality':
                    if (type === 'quality_item_crafted') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'explore':
                    if (type === 'floor_reached' && value >= quest.targetFloor) {
                        quest.progress = quest.targetFloor;
                        updated = true;
                    }
                    break;

                case 'treasure':
                    if (type === 'treasure_opened') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'build':
                    if (type === 'building_built') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'upgrade':
                    if (type === 'building_upgraded') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;

                case 'survive':
                    if (type === 'survival_time' && value >= quest.duration) {
                        quest.progress = quest.duration;
                        updated = true;
                    }
                    break;

                case 'night_survive':
                    if (type === 'night_survived') {
                        quest.progress = Math.min(quest.progress + count, quest.targetCount);
                        updated = true;
                    }
                    break;
            }

            // クエスト完了チェック
            if (updated && this.isQuestCompleted(quest)) {
                quest.completed = true;
                quest.completedTime = Date.now();
            }
        }
    }

    // クエスト完了判定
    isQuestCompleted(quest) {
        switch (quest.type) {
            case 'hunt':
            case 'gather':
            case 'gather_rare':
            case 'craft':
            case 'craft_quality':
            case 'treasure':
            case 'build':
            case 'upgrade':
            case 'night_survive':
                return quest.progress >= quest.targetCount;

            case 'explore':
                return quest.progress >= quest.targetFloor;

            case 'survive':
                return quest.progress >= quest.duration;

            default:
                return false;
        }
    }

    // クエスト報酬を受け取る
    claimReward(questId) {
        const questIndex = this.activeQuests.findIndex(q => q.id === questId);
        if (questIndex === -1) {
            return { success: false, message: 'クエストが見つかりません' };
        }

        const quest = this.activeQuests[questIndex];
        if (!quest.completed) {
            return { success: false, message: 'クエストが完了していません' };
        }

        // 報酬を返す
        const rewards = { ...quest.rewards };

        // クエストを完了済みリストに移動
        this.completedQuests.push({
            ...quest,
            claimedTime: Date.now()
        });
        this.activeQuests.splice(questIndex, 1);

        return {
            success: true,
            message: `クエスト「${quest.name}」の報酬を受け取りました`,
            rewards
        };
    }

    // デイリークエストを生成
    generateDailyQuests(playerLevel) {
        this.dailyQuests = [];

        // プレイヤーレベルに応じたクエストをランダムに3つ選択
        const availableQuests = Object.values(this.questTemplates).filter(
            q => q.level <= playerLevel + 2
        );

        for (let i = 0; i < 3 && availableQuests.length > 0; i++) {
            const index = Math.floor(Math.random() * availableQuests.length);
            const quest = availableQuests.splice(index, 1)[0];
            this.dailyQuests.push({
                ...quest,
                isDaily: true,
                rewards: {
                    exp: Math.floor(quest.rewards.exp * 1.5),
                    gold: Math.floor(quest.rewards.gold * 1.5),
                    ...(quest.rewards.crystal && { crystal: quest.rewards.crystal + 1 })
                }
            });
        }

        this.lastDailyReset = Date.now();
    }

    // デイリークエストのリセットチェック
    checkDailyReset(playerLevel) {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        if (now - this.lastDailyReset >= dayInMs) {
            this.generateDailyQuests(playerLevel);
            return true;
        }

        return false;
    }

    // 利用可能なクエスト一覧
    getAvailableQuests(playerLevel) {
        return Object.values(this.questTemplates).filter(
            q => q.level <= playerLevel && !this.activeQuests.find(aq => aq.id === q.id)
        );
    }

    // アクティブクエスト一覧
    getActiveQuests() {
        return this.activeQuests.map(q => ({
            ...q,
            progressPercent: this.getProgressPercent(q)
        }));
    }

    // 進行度パーセント
    getProgressPercent(quest) {
        switch (quest.type) {
            case 'hunt':
            case 'gather':
            case 'gather_rare':
            case 'craft':
            case 'craft_quality':
            case 'treasure':
            case 'build':
            case 'upgrade':
            case 'night_survive':
                return Math.floor((quest.progress / quest.targetCount) * 100);

            case 'explore':
                return Math.floor((quest.progress / quest.targetFloor) * 100);

            case 'survive':
                return Math.floor((quest.progress / quest.duration) * 100);

            default:
                return 0;
        }
    }
}
