const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
// Import the strategy classes.
const RSI = require('../indicators/RSI');
const MACD = require('../indicators/MACD');
const MACrossover = require('../indicators/MovingAverageCrossover');
const StrategyManager = require('../indicators/StrategyManager');

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
        bots.forEach(bot => this.addBot(bot));
    }

    /**
     * Add a single bot (from DB) into the activeBots registry.
     */
    addBot(bot) {
        const strategy = this.createStrategy(bot);
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;

        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }

        this.activeBots.get(key).push({ bot, strategy });
        // Register the strategy in the StrategyManager using the bot's name as identifier.
        this.strategyManager.registerStrategy(bot.name, strategy);
    }

    /**
     * Instantiate the correct strategy class based on the bot's strategy name.
     */
    createStrategy(bot) {
        switch (bot.strategy) {
            case 'MA_Crossover':
                return new MACrossover(bot.strategyParams);
            case 'RSI':
                return new RSI(bot.strategyParams);
            case 'MACD':
                return new MACD(bot.strategyParams);
            default:
                throw new Error(`Unknown strategy: ${bot.strategy}`);
        }
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

        // Check daily loss limit
        if (bot.riskParams && bot.riskParams.dailyLossLimit) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0); // midnight

            const [aggregation] = await Trade.aggregate([
                { $match: {
                        bot: bot._id,
                        timestamp: { $gte: startOfDay },
                        profit: { $exists: true }
                    }
                },
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
     * Called whenever new candles arrive for a given symbol/timeframe.
     * Uses the StrategyManager to process signals and executes orders if needed.
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

            // Process signals using the StrategyManager.
            const signals = this.strategyManager.processSignals(candles);
            const signal = signals[bot.name]; // Get signal for the specific bot.

            if (signal !== 'HOLD') {
                await this.executeOrder(bot, signal, closePrice);
            }
        }
    }

    /**
     * Executes a trade based on the signal.
     */
    async executeOrder(bot, signal, price) {
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        if (signal === 'BUY') {
            if (openTrade) {
                console.log(`Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return;
            }

            const quantity = this.calculatePositionSize(bot, price);
            const newTrade = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: price,
                quantity,
                timestamp: new Date()
            });
            await newTrade.save();
            console.log(`Bot "${bot.name}" opened a BUY at ${price}, qty=${quantity}`);

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
            console.log(`Bot "${bot.name}" closed trade. Profit: ${openTrade.profit}`);

            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += openTrade.profit;
                await bot.save();
            }
        }
    }

    /**
     * Updates a bot's market data using a newly received candle.
     * For each bot watching this symbol and matching the timeframe, it fetches the latest candles,
     * computes the trading signal, and updates the bot's market info with the last candle and the computed signal.
     *
     * @param {Object} candle - The new candle object (should include symbol, timeframe, timestamp, open, high, low, close, volume).
     */
    async updateBotDataFromCandle(candle) {
        try {
            // Normalize the symbol and timeframe.
            const normSymbol = candle.symbol.toUpperCase();
            const normTimeframe = candle.timeframe.toLowerCase();

            // Query only bots matching the normalized symbol and timeframe.
            const bots = await Bot.find({ symbol: normSymbol, timeframe: normTimeframe });
            if (!bots || bots.length === 0) {
                console.log(`No bots found for symbol ${normSymbol} and timeframe ${normTimeframe}`);
                return;
            }

            for (const bot of bots) {
                // Update the bot's last candle.
                bot.marketInfo.lastCandle = {
                    timestamp: candle.timestamp,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume,
                };

                // Fetch recent candles (sorted oldest first) for signal calculation.
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
                        default:
                            console.error(`Unknown strategy: ${bot.strategy}`);
                    }
                } catch (error) {
                    console.error(`Error computing signal for bot ${bot.name}: ${error.message}`);
                }

                // Update the bot's market info with the computed signal.
                bot.marketInfo.lastSignal = computedSignal;
                await bot.save();
                console.log(`Updated bot ${bot.name} with new candle data and signal: ${computedSignal}`);

                // Normalize bot object by converting _id to id.
                const updatedBot = bot.toObject();
                updatedBot.id = updatedBot._id.toString();

                // Broadcast the updated bot to connected clients.
                const wsServer = require('./WebSocketServer');
                wsServer.broadcastBotUpdate(updatedBot);
            }
        } catch (error) {
            console.error(`Error updating bot data from candle: ${error.message}`);
        }
    }

    calculatePositionSize(bot, price) {
        const riskParams = bot.riskParams || {};
        // Check if the bot has defined a position sizing method.
        if (riskParams.positionSizeType && riskParams.positionSizeValue) {
            if (riskParams.positionSizeType === 'fixed') {
                // Use the fixed position size.
                return riskParams.positionSizeValue;
            } else if (riskParams.positionSizeType === 'percentage') {
                // Calculate the position size as a percentage of the bot's paperBalance.
                // For example, if positionSizeValue is 2, that means 2% of the paper balance.
                // quantity = (paperBalance × percentage) / price
                const percentage = riskParams.positionSizeValue / 100;
                return (bot.paperBalance * percentage) / price;
            }
        }

        // Default behavior: use 1% of the paperBalance as the risk for this trade.
        return (bot.paperBalance * 0.01) / price;
    }

}

module.exports = new BotService();
