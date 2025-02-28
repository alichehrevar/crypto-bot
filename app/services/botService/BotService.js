// services/BotService.js

const Bot = require('../../models/Bot');
const StrategyManager = require('../../strategies/StrategyManager');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const BotUpdateService = require('./BotUpdateService');
const { createIndicator, createRiskStrategy } = require('./botFactory');

/**
 * BotService is responsible for:
 * - Loading active bots from the database and registering them in memory.
 * - Processing live candle data by generating trading signals from the indicator.
 * - Checking risk conditions and executing orders via OrderExecutionService.
 * - Updating bot market data via BotUpdateService.
 */
class BotService {
    constructor() {
        // activeBots: Map keyed by "SYMBOL-TIMEFRAME" (normalized)
        // Each entry is an array of objects containing { bot, indicatorInstance, riskStrategyInstance }.
        this.activeBots = new Map();
        // StrategyManager can optionally be used to combine signals.
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
     * Creates both an indicator instance and a risk strategy instance for each bot.
     *
     * @param {Object} bot - The bot configuration document.
     */
    addBot(bot) {
        // Create the indicator instance based on bot.indicator.
        const indicatorInstance = createIndicator(bot);
        // Create the risk strategy (money management) instance based on bot.riskStrategy.
        const riskStrategyInstance = createRiskStrategy(bot);
        // Normalize key: symbol in uppercase and timeframe in lowercase.
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }
        // Store the bot along with both instances.
        this.activeBots.get(key).push({ bot, indicatorInstance, riskStrategyInstance });
        // Optionally register the indicator instance in the StrategyManager.
        this.strategyManager.registerStrategy(bot.name, indicatorInstance);
    }

    /**
     * Process new live candle data for a given symbol/timeframe.
     * For each bot under that key, check risk limits, generate a signal, and execute an order if needed.
     *
     * @param {string} symbol - The trading symbol.
     * @param {string} timeframe - The trading timeframe.
     * @param {Array<Object>} candles - Array of candle objects.
     */
    async processCandle(symbol, timeframe, candles) {
        const normSymbol = symbol.toUpperCase();
        const normTimeframe = timeframe.toLowerCase();
        const key = `${normSymbol}-${normTimeframe}`;
        const botEntries = this.activeBots.get(key) || [];
        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        for (const { bot, indicatorInstance, riskStrategyInstance } of botEntries) {
            // Check if the bot is allowed to trade based on risk limits.
            const riskCheck = await RiskManagementService.checkRisk(bot);
            if (!riskCheck.canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${riskCheck.reason}`);
                continue;
            }
            // Generate a signal using the indicator instance.
            const signal = indicatorInstance.calculateSignal(candles);
            if (signal !== 'HOLD') {
                // Execute the order using the risk strategy instance.
                await OrderExecutionService.executeOrder(bot, signal, closePrice, riskStrategyInstance);
            }
        }
    }

    /**
     * Update a bot's market data using new candle information.
     *
     * @param {Object} candle - New candle data.
     */
    async updateBotDataFromCandle(candle) {
        await BotUpdateService.updateBotDataFromCandle(candle);
    }
}

module.exports = new BotService();
