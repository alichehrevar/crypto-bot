// services/BotService.js

const Bot = require('../../models/Bot');
const StrategyManager = require('../../strategies/StrategyManager');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const BotUpdateService = require('./BotUpdateService');
const { createIndicator, createRiskStrategy } = require('./botFactory');

class BotService {
    constructor() {
        // Active bots are stored in a Map keyed by a normalized combination of symbol and timeframe.
        this.activeBots = new Map();
        // StrategyManager is used to optionally combine indicator signals (if needed).
        this.strategyManager = new StrategyManager();
    }

    /**
     * Loads all active bots from the database and registers them in memory.
     */
    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach(bot => this.addBot(bot));
    }

    /**
     * Adds a single bot to the in-memory registry.
     * This function creates both an indicator instance and a risk strategy instance for the bot.
     *
     * @param {Object} bot - Bot document from the database.
     */
    addBot(bot) {
        // Create indicator instance based on the bot's indicator field.
        const indicatorInstance = createIndicator(bot);
        // Create risk management (money management) strategy instance based on the bot's riskStrategy field.
        const riskStrategyInstance = createRiskStrategy(bot);
        // Normalize key: symbol is uppercase and timeframe is lowercase.
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }
        // Store the bot along with its indicator and risk strategy instances.
        this.activeBots.get(key).push({ bot, indicatorInstance, riskStrategyInstance });
        // Optionally, register the indicator instance with the StrategyManager for combined signal processing.
        this.strategyManager.registerStrategy(bot.name, indicatorInstance);
    }

    /**
     * Processes new candle data for a given symbol/timeframe.
     * For each bot under the given key, it:
     *  - Checks risk limits via RiskManagementService.
     *  - Uses the indicator instance to generate a trading signal.
     *  - If the signal is actionable (not 'HOLD'), executes an order via OrderExecutionService.
     *
     * @param {string} symbol - Trading symbol.
     * @param {string} timeframe - Trading timeframe.
     * @param {Array<Object>} candles - Array of candle objects.
     */
    async processCandle(symbol, timeframe, candles) {
        // Normalize symbol and timeframe.
        const normSymbol = symbol.toUpperCase();
        const normTimeframe = timeframe.toLowerCase();
        const key = `${normSymbol}-${normTimeframe}`;
        const botEntries = this.activeBots.get(key) || [];
        // Get the most recent candle's close price.
        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        // Iterate over each active bot for this symbol/timeframe.
        for (const { bot, indicatorInstance, riskStrategyInstance } of botEntries) {
            // Use RiskManagementService to check if the bot is allowed to trade.
            const riskCheck = await RiskManagementService.checkRisk(bot);
            if (!riskCheck.canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${riskCheck.reason}`);
                continue;
            }
            // Generate a signal using the indicator instance.
            const signal = indicatorInstance.calculateSignal(candles);
            if (signal !== 'HOLD') {
                // If a BUY/SELL signal is generated, execute an order using OrderExecutionService.
                await OrderExecutionService.executeOrder(bot, signal, closePrice, riskStrategyInstance);
            }
        }
    }

    /**
     * Updates a bot's market data using new candle information.
     * Delegates the update logic to BotUpdateService.
     *
     * @param {Object} candle - New candle data.
     */
    async updateBotDataFromCandle(candle) {
        await BotUpdateService.updateBotDataFromCandle(candle);
    }
}

module.exports = new BotService();
