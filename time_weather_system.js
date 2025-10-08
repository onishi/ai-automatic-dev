// 昼夜・天候システム
class TimeWeatherSystem {
    constructor() {
        // 時間システム
        this.timeOfDay = 0; // 0-24（時間）
        this.dayCount = 1;
        this.timeScale = 1; // 実時間1秒 = ゲーム内1分（デフォルト）
        this.lastUpdateTime = Date.now();

        // 時間帯
        this.timePhases = {
            dawn: { start: 5, end: 7, name: '夜明け' },
            day: { start: 7, end: 17, name: '昼' },
            dusk: { start: 17, end: 19, name: '夕暮れ' },
            night: { start: 19, end: 5, name: '夜' }
        };

        // 天候システム
        this.weather = 'clear'; // clear, rain, storm, fog, snow
        this.weatherDuration = 0;
        this.nextWeatherChange = 300000; // 5分後に天候変化

        // 天候データ
        this.weatherTypes = {
            clear: {
                name: '晴れ',
                effects: {},
                color: null,
                probability: 0.5
            },
            rain: {
                name: '雨',
                effects: {
                    visibilityReduction: 0.2,
                    staminaConsumption: 1.2,
                    herbGatherBonus: 0.3
                },
                color: 'rgba(100, 100, 200, 0.3)',
                probability: 0.25
            },
            storm: {
                name: '嵐',
                effects: {
                    visibilityReduction: 0.4,
                    staminaConsumption: 1.5,
                    damageReduction: 0.9, // 被ダメージ増加
                    enemySpawnIncrease: 0.3
                },
                color: 'rgba(60, 60, 100, 0.5)',
                probability: 0.1
            },
            fog: {
                name: '霧',
                effects: {
                    visibilityReduction: 0.5,
                    enemyDetectionReduction: 0.4,
                    treasureDiscoveryBonus: 0.2
                },
                color: 'rgba(200, 200, 200, 0.4)',
                probability: 0.1
            },
            snow: {
                name: '雪',
                effects: {
                    visibilityReduction: 0.3,
                    movementSpeed: 0.8,
                    staminaConsumption: 1.3,
                    iceResistanceNeeded: true
                },
                color: 'rgba(220, 220, 255, 0.3)',
                probability: 0.05
            }
        };

        // 季節システム
        this.season = 'spring'; // spring, summer, autumn, winter
        this.seasonDay = 0;
        this.daysPerSeason = 30;

        this.seasons = {
            spring: {
                name: '春',
                effects: {
                    herbGatherBonus: 0.3,
                    expBonus: 0.1
                },
                weatherWeights: { clear: 0.6, rain: 0.3, fog: 0.1 }
            },
            summer: {
                name: '夏',
                effects: {
                    staminaConsumption: 1.2,
                    foodSpoilRate: 1.5
                },
                weatherWeights: { clear: 0.7, storm: 0.2, rain: 0.1 }
            },
            autumn: {
                name: '秋',
                effects: {
                    gatherBonus: 0.2,
                    goldBonus: 0.15
                },
                weatherWeights: { clear: 0.5, rain: 0.3, fog: 0.2 }
            },
            winter: {
                name: '冬',
                effects: {
                    staminaConsumption: 1.4,
                    hungerIncrease: 1.3,
                    enemySpawnReduction: 0.2
                },
                weatherWeights: { snow: 0.4, clear: 0.4, storm: 0.2 }
            }
        };
    }

    // 時間を更新
    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // 秒
        this.lastUpdateTime = now;

        // 時間を進める（実時間1秒 = ゲーム内1分）
        const gameMinutes = deltaTime * this.timeScale;
        const gameHours = gameMinutes / 60;

        this.timeOfDay += gameHours;

        // 日付が変わる
        if (this.timeOfDay >= 24) {
            this.timeOfDay -= 24;
            this.dayCount++;
            this.seasonDay++;

            // 季節が変わる
            if (this.seasonDay >= this.daysPerSeason) {
                this.seasonDay = 0;
                this.changeSeason();
            }

            return { newDay: true, day: this.dayCount };
        }

        // 天候更新
        this.weatherDuration += deltaTime * 1000;
        if (this.weatherDuration >= this.nextWeatherChange) {
            this.changeWeather();
        }

        return { newDay: false };
    }

    // 現在の時間帯を取得
    getCurrentPhase() {
        const hour = Math.floor(this.timeOfDay);

        if (hour >= this.timePhases.night.start || hour < this.timePhases.night.end) {
            return 'night';
        } else if (hour >= this.timePhases.dawn.start && hour < this.timePhases.dawn.end) {
            return 'dawn';
        } else if (hour >= this.timePhases.day.start && hour < this.timePhases.day.end) {
            return 'day';
        } else {
            return 'dusk';
        }
    }

    // 時間帯の名前を取得
    getPhaseName() {
        const phase = this.getCurrentPhase();
        return this.timePhases[phase].name;
    }

    // 夜かどうか
    isNight() {
        return this.getCurrentPhase() === 'night';
    }

    // 画面の明るさ（0.0-1.0）
    getBrightness() {
        const phase = this.getCurrentPhase();
        switch (phase) {
            case 'dawn':
                return 0.6;
            case 'day':
                return 1.0;
            case 'dusk':
                return 0.7;
            case 'night':
                return 0.3;
            default:
                return 1.0;
        }
    }

    // 天候を変更
    changeWeather() {
        const seasonData = this.seasons[this.season];
        const weatherWeights = seasonData.weatherWeights;

        // 重み付きランダム選択
        const rand = Math.random();
        let cumulative = 0;

        for (const [weatherType, weight] of Object.entries(weatherWeights)) {
            cumulative += weight;
            if (rand <= cumulative) {
                this.weather = weatherType;
                break;
            }
        }

        // 次の天候変化までの時間（5-15分）
        this.nextWeatherChange = (300000 + Math.random() * 600000);
        this.weatherDuration = 0;

        return {
            weather: this.weather,
            name: this.weatherTypes[this.weather].name
        };
    }

    // 季節を変更
    changeSeason() {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasons.indexOf(this.season);
        this.season = seasons[(currentIndex + 1) % seasons.length];

        // 新しい季節に応じた天候に変更
        this.changeWeather();

        return {
            season: this.season,
            name: this.seasons[this.season].name
        };
    }

    // 現在の天候効果を取得
    getWeatherEffects() {
        const weatherEffects = { ...this.weatherTypes[this.weather].effects };
        const seasonEffects = { ...this.seasons[this.season].effects };

        // 夜間効果
        if (this.isNight()) {
            seasonEffects.visibilityReduction = (seasonEffects.visibilityReduction || 0) + 0.3;
            seasonEffects.enemySpawnIncrease = (seasonEffects.enemySpawnIncrease || 0) + 0.2;
            seasonEffects.staminaConsumption = (seasonEffects.staminaConsumption || 1) * 1.2;
        }

        // 効果を統合
        return { ...weatherEffects, ...seasonEffects };
    }

    // 視界距離を計算
    getVisibilityRange(baseRange = 300) {
        const effects = this.getWeatherEffects();
        const reduction = effects.visibilityReduction || 0;
        return baseRange * (1 - reduction);
    }

    // スタミナ消費倍率
    getStaminaMultiplier() {
        const effects = this.getWeatherEffects();
        return effects.staminaConsumption || 1.0;
    }

    // 移動速度倍率
    getMovementMultiplier() {
        const effects = this.getWeatherEffects();
        return effects.movementSpeed || 1.0;
    }

    // 天候オーバーレイの色
    getWeatherOverlayColor() {
        return this.weatherTypes[this.weather].color;
    }

    // 画面全体のエフェクト（暗さ + 天候）
    getScreenEffect() {
        const brightness = this.getBrightness();
        const weatherColor = this.getWeatherOverlayColor();

        return {
            brightness,
            weatherColor,
            phase: this.getCurrentPhase(),
            phaseName: this.getPhaseName(),
            weather: this.weather,
            weatherName: this.weatherTypes[this.weather].name
        };
    }

    // 時刻を文字列で取得
    getTimeString() {
        const hour = Math.floor(this.timeOfDay);
        const minute = Math.floor((this.timeOfDay - hour) * 60);
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    // 詳細情報
    getInfo() {
        return {
            time: this.getTimeString(),
            day: this.dayCount,
            phase: this.getPhaseName(),
            weather: this.weatherTypes[this.weather].name,
            season: this.seasons[this.season].name,
            brightness: this.getBrightness()
        };
    }

    // 天候パーティクル（雨、雪など）の生成
    shouldGenerateWeatherParticle() {
        switch (this.weather) {
            case 'rain':
                return Math.random() < 0.3;
            case 'storm':
                return Math.random() < 0.5;
            case 'snow':
                return Math.random() < 0.2;
            default:
                return false;
        }
    }

    // 天候パーティクルの種類
    getWeatherParticleType() {
        switch (this.weather) {
            case 'rain':
            case 'storm':
                return 'rain';
            case 'snow':
                return 'snow';
            default:
                return null;
        }
    }
}
