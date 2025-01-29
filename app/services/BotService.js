const Bot = require('../models/Bot');
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

    processCandle(symbol, timeframe, candles) {
        const key = `${symbol}-${timeframe}`;
        const bots = this.activeBots.get(key) || [];

        bots.forEach(({ bot, strategy }) => {
            const signal = strategy.calculateSignal(candles);
            if (signal !== 'HOLD') {
                this.executeOrder(bot, signal);
            }
        });
    }

    executeOrder(bot, signal) {
        console.log(`[${bot.name}] Executing ${signal} order`);
        // Implement actual order execution here
    }
}

module.exports = new BotService();
