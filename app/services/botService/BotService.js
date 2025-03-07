const Bot = require('../../models/Bot');
const StrategyManager = require('../../strategies/StrategyManager');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const BotUpdateService = require('./BotUpdateService');
const { createIndicator, createRiskStrategy } = require('./botFactory');

/**
 * BotService is responsible for:
 * - Loading active bots from the database and registering them in memory.
 * - Processing live candle data from each indicator instance.
 * - Aggregating signals from multiple indicator instances using either
 *   a consensus (AND) or weighted method.
 * - Checking risk conditions and executing orders via OrderExecutionService.
 * - Updating bot market data via BotUpdateService.
 */
class BotService {
    constructor() {
        // activeBots is a Map keyed by "SYMBOL-TIMEFRAME" (normalized).
        // Each value is an array of objects: { bot, indicatorInstance, riskStrategyInstance }.
        this.activeBots = new Map();
        // StrategyManager can be used to combine signals if needed.
        this.strategyManager = new StrategyManager();

        // botSignals stores the latest signal from each indicator instance for each bot.
        // Instead of a simple string array, we now store objects of the form { signal: string, weight: number }.
        // Keyed by bot id.
        this.botSignals = new Map();
    }

    /**
     * Loads all active bots from the database and registers them in memory.
     */
    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach((bot) => this.addBot(bot));
    }

    /**
     * Adds a bot to the in-memory registry.
     * Creates both an indicator instance and a risk strategy instance for each bot.
     *
     * @param {Object} bot - The bot configuration document.
     */
    addBot(bot) {
        // Create an indicator instance using the bot's indicator field.
        const indicatorInstance = createIndicator(bot);
        // Create the risk strategy instance using the bot's riskStrategy.
        const riskStrategyInstance = createRiskStrategy(bot);
        // Normalize the key (symbol uppercase, timeframe lowercase).
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }
        this.activeBots.get(key).push({ bot, indicatorInstance, riskStrategyInstance });
        // Optionally register the indicator instance in the StrategyManager.
        this.strategyManager.registerStrategy(bot.name, indicatorInstance);
        // Initialize the botSignals entry for this bot id as an empty array.
        this.botSignals.set(bot._id.toString(), []);
    }

    /**
     * Aggregates signals using consensus ("AND") logic.
     * Returns 'BUY' if all signals are 'BUY', 'SELL' if all are 'SELL', otherwise 'HOLD'.
     *
     * @param {Array<string>} signals - Array of signals from indicator instances.
     * @returns {string} The aggregated signal.
     */
    aggregateConsensus(signals) {
        const validSignals = signals.filter(s => s);
        if (validSignals.length === 0) return 'HOLD';
        const allBuy = validSignals.every(s => s === 'BUY');
        const allSell = validSignals.every(s => s === 'SELL');
        if (allBuy) return 'BUY';
        if (allSell) return 'SELL';
        return 'HOLD';
    }

    /**
     * Aggregates signals using weighted processing.
     * Each signal is mapped to a numeric value: BUY => +1, SELL => -1, HOLD => 0.
     * The weighted average is computed. If the average is above a positive threshold, returns 'BUY';
     * if below a negative threshold, returns 'SELL'; otherwise, returns 'HOLD'.
     *
     * @param {Array<{ signal: string, weight: number }>} signals - Array of signal objects.
     * @returns {string} The aggregated signal.
     */
    aggregateWeightedSignals(signals) {
        const validSignals = signals.filter(s => s);
        if (validSignals.length === 0) return 'HOLD';

        // Sum up the weights and weighted signal values.
        let totalWeight = 0;
        let weightedSum = 0;
        validSignals.forEach(({ signal, weight }) => {
            totalWeight += weight;
            if (signal === 'BUY') {
                weightedSum += weight;
            } else if (signal === 'SELL') {
                weightedSum -= weight;
            }
            // HOLD contributes 0.
        });
        // Compute weighted average.
        const average = weightedSum / totalWeight;
        // Set thresholds: if average > 0.5, return BUY; if average < -0.5, return SELL; else HOLD.
        if (average > 0.5) return 'BUY';
        if (average < -0.5) return 'SELL';
        return 'HOLD';
    }

    /**
     * Processes new live candle data for a given symbol/timeframe.
     * For each bot in that key, updates its indicator instance signal and aggregates signals across
     * all indicator instances. Uses the method specified in bot.tradeInfo.signalProcessingMethod.
     * If the aggregated signal is actionable (not HOLD), executes an order.
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

        // Process each indicator instance registered for bots under this key.
        for (const { bot, indicatorInstance, riskStrategyInstance } of botEntries) {
            // Check risk conditions.
            const riskCheck = await RiskManagementService.checkRisk(bot);
            if (!riskCheck.canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${riskCheck.reason}`);
                continue;
            }
            // Generate the signal from the indicator instance.
            const signal = indicatorInstance.calculateSignal(candles);
            // For this example, assign a default weight of 1 to every signal.
            const signalObj = { signal, weight: 1 };

            const botId = bot._id.toString();
            // Retrieve previous signals for this bot.
            let signals = this.botSignals.get(botId) || [];
            // For simplicity, we simply add the new signal to the array.
            signals.push(signalObj);
            this.botSignals.set(botId, signals);

            // Determine which aggregation method to use.
            const method = (bot.tradeInfo && bot.tradeInfo.signalProcessingMethod) || 'consensus';
            let aggregatedSignal = 'HOLD';
            if (method === 'weighted') {
                aggregatedSignal = this.aggregateWeightedSignals(this.botSignals.get(botId));
            } else {
                aggregatedSignal = this.aggregateConsensus(this.botSignals.get(botId).map(s => s.signal));
            }

            // Execute order if aggregated signal is actionable.
            if (aggregatedSignal !== 'HOLD') {
                await OrderExecutionService.executeOrder(bot, aggregatedSignal, closePrice, riskStrategyInstance);
                // After executing, clear the stored signals for this bot.
                this.botSignals.set(botId, []);
            }
        }
    }

    /**
     * Delegates bot market data update to BotUpdateService.
     *
     * @param {Object} candle - New candle data.
     */
    async updateBotDataFromCandle(candle) {
        await BotUpdateService.updateBotDataFromCandle(candle);
    }
}

module.exports = new BotService();
