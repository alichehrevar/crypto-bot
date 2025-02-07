const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
const { MACrossover, RSI, MACD } = require('../strategies');
const StrategyManager = require('../strategies/StrategyManager'); // Import StrategyManager

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
        const key = `${bot.symbol}-${bot.timeframe}`;

        if (!this.activeBots.has(key)) {
            this.activeBots.set(key, []);
        }

        this.activeBots.get(key).push({ bot, strategy });
        // Register the strategy in the StrategyManager
        this.strategyManager.registerStrategy(bot.name, strategy); // Use bot.name as strategy identifier
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
                    }},
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
     */
    async processCandle(symbol, timeframe, candles) {
        const key = `${symbol}-${timeframe}`;
        const botEntries = this.activeBots.get(key) || [];

        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        for (const { bot } of botEntries) {
            const { canTrade, reason } = await this.checkRisk(bot);
            if (!canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${reason}`);
                continue;
            }

            // Use StrategyManager to process signals
            const signals = this.strategyManager.processSignals(candles);
            const signal = signals[bot.name]; // Get signal for the specific bot

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
}

module.exports = new BotService();
