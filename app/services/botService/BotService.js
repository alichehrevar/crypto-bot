const Bot = require('../../models/Bot');
const Trade = require('../../models/Trade');
const StrategyManager = require('../../strategies/StrategyManager');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const BotUpdateService = require('./BotUpdateService');
const { createIndicator, createRiskStrategy } = require('./botFactory');

class BotService {
    constructor() {
        this.activeBots = new Map();
        this.strategyManager = new StrategyManager();
    }

    /**
     * Load all active bots from the database and register them in memory.
     */
    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach(bot => this.addBot(bot));
    }

    /**
     * Add a bot to the in-memory registry.
     * Now, we create both an indicator instance and a risk management strategy instance.
     */
    addBot(bot) {
        const indicatorInstance = createIndicator(bot);
        const riskStrategyInstance = createRiskStrategy(bot);
        // Normalize key: symbol uppercase, timeframe lowercase.
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }
        // Store both instances along with the bot.
        this.activeBots.get(key).push({ bot, indicatorInstance, riskStrategyInstance });
        // Optionally, register the indicator instance in the StrategyManager if you want to combine signals.
        this.strategyManager.registerStrategy(bot.name, indicatorInstance);
    }

    async processCandle(symbol, timeframe, candles) {
        const normSymbol = symbol.toUpperCase();
        const normTimeframe = timeframe.toLowerCase();
        const key = `${normSymbol}-${normTimeframe}`;
        const botEntries = this.activeBots.get(key) || [];
        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        for (const { bot, indicatorInstance, riskStrategyInstance } of botEntries) {
            const riskCheck = await RiskManagementService.checkRisk(bot);
            if (!riskCheck.canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${riskCheck.reason}`);
                continue;
            }
            const signal = indicatorInstance.calculateSignal(candles);
            if (signal !== 'HOLD') {
                await OrderExecutionService.executeOrder(bot, signal, closePrice, riskStrategyInstance);
            }
        }
    }

    async updateBotDataFromCandle(candle) {
        await BotUpdateService.updateBotDataFromCandle(candle);
    }
}

module.exports = new BotService();
