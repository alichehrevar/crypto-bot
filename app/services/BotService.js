const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
const { MACrossover, RSI } = require('../strategies');

class BotService {
    constructor() {
        this.activeBots = new Map();
    }

    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach(bot => this.addBot(bot));
    }

    addBot(bot) {
        const strategy = this.createStrategy(bot);
        const key = `${bot.symbol}-${bot.timeframe}`;

        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }

        this.activeBots.get(key).push({
            bot,
            strategy
        });
    }

    createStrategy(bot) {
        switch(bot.strategy) {
            case 'MA_Crossover':
                return new MACrossover(bot.strategyParams);
            case 'RSI':
                return new RSI(bot.strategyParams);
            default:
                throw new Error(`Unknown strategy: ${bot.strategy}`);
        }
    }

    async checkRisk(bot) {
        const openTrades = await Trade.countDocuments({ bot: bot._id, exitPrice: null });

        return {
            canTrade: openTrades < bot.riskParams.maxOpenTrades,
            reason: openTrades >= bot.riskParams.maxOpenTrades ?
                'Max open trades reached' : null
        };
    }

    async processCandle(symbol, timeframe, candles) {
        const key = `${symbol}-${timeframe}`;
        const bots = this.activeBots.get(key) || [];

        for (const { bot, strategy } of bots) {
            const { canTrade, reason } = await this.checkRisk(bot);
            if (!canTrade) {
                console.log(`Blocked trade for ${bot.name}: ${reason}`);
                continue;
            }

            const signal = strategy.calculateSignal(candles);
            if (signal !== 'HOLD') {
                await this.executeOrder(bot, signal, candles[candles.length - 1].close);
            }
        }
    }

    async executeOrder(bot, signal) {
        const trade = new Trade({
            bot: bot._id,
            symbol: bot.symbol,
            type: signal,
            entryPrice: price,
            timestamp: new Date()
        });
        await trade.save();
    }
}

module.exports = new BotService();
