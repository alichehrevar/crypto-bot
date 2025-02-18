const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
// Import indicator classes from the indicators directory.
const RSI = require('../indicators/RSI');
const MACD = require('../indicators/MACD');
const MACrossover = require('../indicators/MovingAverageCrossover');
// Import money-management strategies (if used).
const MartingaleStrategy = require('../strategies/moneyManagement/MartingaleStrategy');
const MirroredMartingaleStrategy = require('../strategies/moneyManagement/MirroredMartingaleStrategy');
const KellyCriterionStrategy = require('../strategies/moneyManagement/KellyCriterionStrategy');
// Import the StrategyManager from the strategies' directory.
const StrategyManager = require('../strategies/StrategyManager');
const DynamicStrategy = require('../strategies/DynamicStrategy');

class BotService {
    constructor() {
        this.activeBots = new Map();
        this.strategyManager = new StrategyManager(); // Initialize StrategyManager
    }

    /**
     * Load all active bots from the database and register them in memory.
     */
    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach((bot) => this.addBot(bot));
    }

    /**
     * Add a single bot (from DB) into the activeBots registry.
     */
    addBot(bot) {
        const strategy = this.createStrategy(bot);
        // Normalize key: symbol uppercase, timeframe lowercase.
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }
        this.activeBots.get(key).push({ bot, strategy });
        // Register the strategy in the StrategyManager using the bot's name as identifier.
        this.strategyManager.registerStrategy(bot.name, strategy);
    }

    /**
     * Instantiate the appropriate strategy instance based on the bot's strategy field.
     */
    createStrategy(bot) {
        let baseStrategy;
        switch (bot.strategy) {
            case 'MA_Crossover':
                baseStrategy = new MACrossover(bot.strategyParams);
                break;
            case 'RSI':
                baseStrategy = new RSI(bot.strategyParams);
                break;
            case 'MACD':
                baseStrategy = new MACD(bot.strategyParams);
                break;
            case 'Martingale':
                baseStrategy = new MartingaleStrategy(bot.strategyParams);
                break;
            case 'MirroredMartingale':
                baseStrategy = new MirroredMartingaleStrategy(bot.strategyParams);
                break;
            case 'KellyCriterion':
                baseStrategy = new KellyCriterionStrategy(bot.strategyParams);
                break;
            case 'SimpleStrategy':
                // Import SimpleStrategy from the strategies directory.
                baseStrategy = new (require('../strategies/SimpleStrategy'))(bot.strategyParams);
                break;
            default:
                throw new Error(`Unknown strategy: ${bot.strategy}`);
        }
        // If the bot has a flag `dynamic`, wrap the baseStrategy in a DynamicStrategy.
        if (bot.dynamic) {
            return new DynamicStrategy(baseStrategy, bot.strategyParams, bot.symbol, bot.timeframe);
        }
        return baseStrategy;
    }

    /**
     * Check risk parameters to decide if a bot can open a new position.
     */
    async checkRisk(bot) {
        const openTradesCount = await Trade.countDocuments({ bot: bot._id, exitPrice: null });
        if (bot.riskParams && bot.riskParams.maxOpenTrades) {
            if (openTradesCount >= bot.riskParams.maxOpenTrades) {
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
     * Uses the StrategyManager to compute signals from all registered strategies,
     * and if a signal is actionable (not HOLD), executes an order.
     */
    async processCandle(symbol, timeframe, candles) {
        const normSymbol = symbol.toUpperCase();
        const normTimeframe = timeframe.toLowerCase();
        const key = `${normSymbol}-${normTimeframe}`;
        const botEntries = this.activeBots.get(key) || [];
        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        for (const { bot } of botEntries) {
            const { canTrade, reason } = await this.checkRisk(bot);
            if (!canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${reason}`);
                continue;
            }
            // Use StrategyManager to process signals.
            const signals = this.strategyManager.processSignals(candles);
            const signal = signals[bot.name];
            if (signal !== 'HOLD') {
                await this.executeOrder(bot, signal, closePrice);
            }
        }
    }

    /**
     * Executes a trade based on the given signal.
     */
    async executeOrder(bot, signal, price) {
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });
        if (signal === 'BUY') {
            if (openTrade) {
                console.log(`Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return;
            }
            let quantity = 0;
            // Retrieve the registered strategy instance.
            const strategyInstance = this.strategyManager.strategies.get(bot.name);
            if (strategyInstance && typeof strategyInstance.calculatePositionSize === 'function') {
                // Check the function's parameters.
                if (strategyInstance.calculatePositionSize.length === 3) {
                    // Assume it expects (lastTradeOutcome, balance, price). For backtesting, assume last trade was 'win'.
                    quantity = strategyInstance.calculatePositionSize('win', bot.paperBalance, price);
                } else {
                    quantity = strategyInstance.calculatePositionSize(bot.paperBalance, price);
                }
            } else {
                // Fallback default.
                quantity = this.calculatePositionSize(bot, price);
            }
            // Compute TP/SL levels using the risk module.
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
            if (!openTrade) {
                console.log(`Bot "${bot.name}" received SELL signal but no open trade exists.`);
                return;
            }
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();
            if (openTrade.type === 'BUY') {
                openTrade.profit = (price - openTrade.entryPrice) * openTrade.quantity;
            } else {
                openTrade.profit = (openTrade.entryPrice - price) * openTrade.quantity;
            }
            await openTrade.save();
            console.log(`Bot "${bot.name}" closed trade at ${price}. Profit: ${openTrade.profit}`);
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += openTrade.profit;
                await bot.save();
            }
        }
    }

    /**
     * Updates a bot's market data using a new candle.
     * For each bot matching the symbol and timeframe, fetch recent candles,
     * compute the signal, update the bot's market info, and broadcast the update.
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
                if (
                    bot.marketInfo.lastCandle &&
                    new Date(bot.marketInfo.lastCandle.timestamp).getTime() === new Date(candle.timestamp).getTime()
                ) {
                    console.log(`Bot "${bot.name}" already updated with candle timestamp ${candle.timestamp}`);
                    continue;
                }
                bot.marketInfo.lastCandle = {
                    timestamp: candle.timestamp,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume,
                };
                const Candle = require('../models/Candle');
                const recentCandles = await Candle.find({
                    symbol: normSymbol,
                    timeframe: normTimeframe
                }).sort({ timestamp: 1 }).limit(100);
                let computedSignal = 'HOLD';
                try {
                    switch (bot.strategy) {
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
                        // You can add cases for money-management strategies if they need signal computation.
                        default:
                            console.error(`Unknown strategy: ${bot.strategy}`);
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
     * Default position sizing if no money-management strategy is used.
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
