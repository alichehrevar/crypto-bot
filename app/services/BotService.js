const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
// Import indicator classes.
const RSI = require('../indicators/RSI');
const MACD = require('../indicators/MACD');
const MACrossover = require('../indicators/MovingAverageCrossover');
// Import risk management (money-management) strategies.
const MartingaleStrategy = require('../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../strategies/moneyManagement/KellyCriterionStrategy');
const SimpleStrategy = require('../strategies/SimpleStrategy'); // as risk strategy

// Import the StrategyManager for combining indicator signals if needed.
const StrategyManager = require('../strategies/StrategyManager');
const DynamicStrategy = require('../strategies/DynamicStrategy');

class BotService {
    constructor() {
        this.activeBots = new Map();
        this.strategyManager = new StrategyManager(); // This can be used for signal processing if needed.
    }

    /**
     * Load all active bots from the database and register them in memory.
     */
    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach((bot) => this.addBot(bot));
    }

    /**
     * Add a bot to the in-memory registry.
     * Now, we create both an indicator instance and a risk management strategy instance.
     */
    addBot(bot) {
        const indicatorInstance = this.createIndicator(bot);
        const riskStrategyInstance = this.createRiskStrategy(bot);
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

    /**
     * Instantiate the indicator instance based on the bot.indicator field.
     */
    createIndicator(bot) {
        switch (bot.indicator) {
            case 'RSI':
                return new RSI(bot.strategyParams);
            case 'MACD':
                return new MACD(bot.strategyParams);
            case 'MA_Crossover':
                return new MACrossover(bot.strategyParams);
            default:
                throw new Error(`Unknown indicator: ${bot.indicator}`);
        }
    }

    /**
     * Instantiate the risk management (money management) strategy based on the bot.riskStrategy field.
     */
    createRiskStrategy(bot) {
        switch (bot.riskStrategy) {
            case 'MartingaleStrategy':
                return new MartingaleStrategy(bot.strategyParams);
            case 'MirroredMartingaleStrategy':
                return new MirroredMartingaleStrategy(bot.strategyParams);
            case 'KellyCriterionStrategy':
                return new KellyCriterionStrategy(bot.strategyParams);
            case 'SimpleStrategy':
                return new SimpleStrategy(bot.strategyParams);
            default:
                throw new Error(`Unknown risk strategy: ${bot.riskStrategy}`);
        }
    }

    /**
     * Checks risk limits and whether a bot can open a new position.
     * Adjusts behavior based on bot.positionMode.
     */
    async checkRisk(bot) {
        const openTradesCount = await Trade.countDocuments({ bot: bot._id, exitPrice: null });
        if (bot.positionMode === 'single') {
            if (openTradesCount >= 1) {
                return { canTrade: false, reason: 'Single mode: one open trade already exists' };
            }
        } else if (bot.positionMode === 'hedge') {
            if (bot.riskParams && bot.riskParams.maxOpenTrades && openTradesCount >= bot.riskParams.maxOpenTrades) {
                return { canTrade: false, reason: 'Max open trades reached' };
            }
        }
        if (bot.riskParams && bot.riskParams.dailyLossLimit) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const [aggregation] = await Trade.aggregate([
                { $match: { bot: bot._id, timestamp: { $gte: startOfDay }, profit: { $exists: true } } },
                { $group: { _id: null, totalProfit: { $sum: '$profit' } } }
            ]);
            const currentDayProfit = aggregation?.totalProfit || 0;
            if (currentDayProfit < -Math.abs(bot.riskParams.dailyLossLimit)) {
                return { canTrade: false, reason: 'Daily loss limit exceeded' };
            }
        }
        return { canTrade: true, reason: null };
    }

    /**
     * Processes new candle data for a given symbol/timeframe.
     * Uses the indicator instance to generate a signal and the risk strategy instance for position sizing.
     */
    async processCandle(symbol, timeframe, candles) {
        const normSymbol = symbol.toUpperCase();
        const normTimeframe = timeframe.toLowerCase();
        const key = `${normSymbol}-${normTimeframe}`;
        const botEntries = this.activeBots.get(key) || [];
        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        for (const entry of botEntries) {
            const { bot, indicatorInstance, riskStrategyInstance } = entry;
            const { canTrade, reason } = await this.checkRisk(bot);
            if (!canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${reason}`);
                continue;
            }
            // Generate signal using the indicator.
            const signal = indicatorInstance.calculateSignal(candles);
            if (signal !== 'HOLD') {
                await this.executeOrder(bot, signal, closePrice, riskStrategyInstance);
            }
        }
    }

    /**
     * Executes a trade based on the given signal.
     * Uses the risk strategy for position sizing.
     */
    async executeOrder(bot, signal, price, riskStrategyInstance) {
        // Get open trades.
        const openTrades = await Trade.find({ bot: bot._id, exitPrice: null });
        if (signal === 'BUY') {
            if (bot.positionMode === 'single' && openTrades.length > 0) {
                console.log(`Bot "${bot.name}" in single mode already has an open trade.`);
                return;
            }
            let quantity = 0;
            if (riskStrategyInstance && typeof riskStrategyInstance.calculatePositionSize === 'function') {
                // Check the number of expected parameters.
                if (riskStrategyInstance.calculatePositionSize.length === 3) {
                    quantity = riskStrategyInstance.calculatePositionSize('win', bot.paperBalance, price);
                } else {
                    quantity = riskStrategyInstance.calculatePositionSize(bot.paperBalance, price);
                }
            } else {
                quantity = this.calculatePositionSize(bot, price);
            }
            // Compute TP/SL levels using RiskStrategy module.
            const { TP, SL } = require('../strategies/RiskStrategy').calculateTPSL(bot.strategyParams, price);
            const newTrade = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: price,
                quantity,
                timestamp: new Date()
            });
            await newTrade.save();
            console.log(`Bot "${bot.name}" opened BUY at ${price} with quantity ${quantity}, TP: ${TP}, SL: ${SL}`);
        } else if (signal === 'SELL') {
            if (openTrades.length === 0) {
                console.log(`Bot "${bot.name}" received SELL signal but no open trade exists.`);
                return;
            }
            // Close the earliest open trade.
            const tradeToClose = openTrades[0];
            tradeToClose.exitPrice = price;
            tradeToClose.timestamp = new Date();
            if (tradeToClose.type === 'BUY') {
                tradeToClose.profit = (price - tradeToClose.entryPrice) * tradeToClose.quantity;
            } else {
                tradeToClose.profit = (tradeToClose.entryPrice - price) * tradeToClose.quantity;
            }
            await tradeToClose.save();
            console.log(`Bot "${bot.name}" closed trade at ${price}. Profit: ${tradeToClose.profit}`);
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += tradeToClose.profit;
                await bot.save();
            }
        }
    }

    /**
     * Updates a bot's market data using a new candle.
     * This method updates both the last closed candle data and the live (current) candle price.
     */
    async updateBotDataFromCandle(candle) {
        try {
            const normSymbol = candle.symbol.toUpperCase();
            const normTimeframe = candle.timeframe.toLowerCase();
            const bots = await Bot.find({ symbol: normSymbol, timeframe: normTimeframe });
            if (!bots || bots.length === 0) {
                console.log(`No bots found for symbol ${normSymbol} and timeframe ${normTimeframe}`);
                return;
            }
            for (const bot of bots) {
                // Update current candle price if the timestamp matches, else treat it as new finalized candle.
                if (
                    bot.marketInfo.lastCandle &&
                    new Date(bot.marketInfo.lastCandle.timestamp).getTime() === new Date(candle.timestamp).getTime()
                ) {
                    bot.marketInfo.currentCandle = { price: candle.close };
                    console.log(`Bot "${bot.name}" updated current candle price to ${candle.close}`);
                } else {
                    bot.marketInfo.lastCandle = {
                        timestamp: candle.timestamp,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    };
                    bot.marketInfo.currentCandle = { price: candle.close };
                    console.log(`Bot "${bot.name}" set new candle data; current candle price: ${candle.close}`);
                }
                // Recalculate signal from recent candles.
                const Candle = require('../models/Candle');
                const recentCandles = await Candle.find({ symbol: normSymbol, timeframe: normTimeframe })
                    .sort({ timestamp: 1 })
                    .limit(100);
                let computedSignal = 'HOLD';
                try {
                    switch (bot.indicator) {
                        case 'RSI': {
                            const rsiInstance = new RSI(bot.strategyParams);
                            computedSignal = rsiInstance.calculateSignal(recentCandles);
                            break;
                        }
                        case 'MACD': {
                            const macdInstance = new MACD(bot.strategyParams);
                            computedSignal = macdInstance.calculateSignal(recentCandles);
                            break;
                        }
                        case 'MA_Crossover': {
                            const maCrossoverInstance = new MACrossover(bot.strategyParams);
                            computedSignal = maCrossoverInstance.calculateSignal(recentCandles);
                            break;
                        }
                        default:
                            console.error(`Unknown indicator: ${bot.indicator}`);
                    }
                } catch (error) {
                    console.error(`Error computing signal for bot "${bot.name}": ${error.message}`);
                }
                bot.marketInfo.lastSignal = computedSignal;
                await bot.save();
                console.log(`Updated bot "${bot.name}" with new candle data and signal: ${computedSignal}`);
                const updatedBot = bot.toObject();
                updatedBot.id = updatedBot._id.toString();
                const wsServer = require('./WebSocketServer');
                wsServer.broadcastBotUpdate(updatedBot);
            }
        } catch (error) {
            console.error(`Error updating bot data from candle: ${error.message}`);
        }
    }

    /**
     * Default position sizing if no risk strategy instance is available.
     */
    calculatePositionSize(bot, price) {
        const riskParams = bot.riskParams || {};
        if (riskParams.positionSizeType && riskParams.positionSizeValue) {
            if (riskParams.positionSizeType === 'fixed') {
                return riskParams.positionSizeValue;
            } else if (riskParams.positionSizeType === 'percentage') {
                const percentage = riskParams.positionSizeValue / 100;
                return (bot.paperBalance * percentage) / price;
            }
        }
        return (bot.paperBalance * 0.01) / price;
    }
}

module.exports = new BotService();
