const Bot = require('../models/Bot');
const Trade = require('../models/Trade');
const { MACrossover, RSI, MACD } = require('../strategies');

class BotService {
    constructor() {
        this.activeBots = new Map();
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
     * (Optional) Compute position size based on riskParams.
     * For example, if positionSizeType is 'percentage' of the current paperBalance,
     * or if it's a fixed size (e.g., 0.1 BTC).
     */
    calculatePositionSize(bot, price) {
        const { riskParams } = bot;
        if (!riskParams || !riskParams.positionSizeType) {
            // No specific sizing, default to 1 unit
            return 1;
        }

        if (riskParams.positionSizeType === 'percentage') {
            const pct = riskParams.positionSizeValue / 100.0;
            // If in paper mode, use bot.paperBalance. In live mode, you'd fetch actual exchange balance
            const balance = bot.mode === 'paper' ? bot.paperBalance : 10000; // Example
            // e.g. if balance=10000 USDT, price=100 USDT/BTC, we buy quantity=balance * pct / price
            return ((balance * pct) / price) || 0;
        } else if (riskParams.positionSizeType === 'fixed') {
            // riskParams.positionSizeValue might be a fixed quantity of the base coin
            return riskParams.positionSizeValue;
        }

        // Default fallback
        return 1;
    }

    /**
     * Check risk parameters to decide if a bot can open a new position.
     * - Ensures maxOpenTrades is not exceeded.
     * - (Optionally) checks daily loss limit or maxDrawdown if needed.
     */
    async checkRisk(bot) {
        const openTradesCount = await Trade.countDocuments({ bot: bot._id, exitPrice: null });

        if (bot.riskParams && bot.riskParams.maxOpenTrades) {
            if (openTradesCount >= bot.riskParams.maxOpenTrades) {
                return { canTrade: false, reason: 'Max open trades reached' };
            }
        }

        // If you want to handle dailyLossLimit:
        if (bot.riskParams && bot.riskParams.dailyLossLimit) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0); // midnight

            // Aggregate the sum of profits for today's trades
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

        // If we want to handle maxDrawdown, we'd compare the paperBalance or track a high-water mark.

        return { canTrade: true, reason: null };
    }

    /**
     * Called whenever new candles arrive for a given symbol/timeframe.
     * We iterate over all bots that match this symbol/timeframe,
     * check risk, calculate signal, and possibly execute an order.
     */
    async processCandle(symbol, timeframe, candles) {
        const key = `${symbol}-${timeframe}`;
        const botEntries = this.activeBots.get(key) || [];

        // We assume candles are sorted oldest -> newest
        const lastCandle = candles[candles.length - 1];
        const closePrice = lastCandle.close;

        for (const { bot, strategy } of botEntries) {
            const { canTrade, reason } = await this.checkRisk(bot);
            if (!canTrade) {
                console.log(`Blocked trade for bot "${bot.name}": ${reason}`);
                continue;
            }

            const signal = strategy.calculateSignal(candles);
            if (signal !== 'HOLD') {
                await this.executeOrder(bot, signal, closePrice);
            }
        }
    }

    /**
     * Executes a trade based on the signal:
     *  - For a BUY, if no open trade, opens a new trade.
     *  - For a SELL, if there's an open trade, closes it.
     *  (Adapt if you want short selling or partial closes, etc.)
     */
    async executeOrder(bot, signal, price) {
        // 1) Check if there's an open trade
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        if (signal === 'BUY') {
            if (openTrade) {
                // Already have an open trade. Decide if you skip or "average up".
                console.log(`Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return;
            }

            // Calculate quantity from riskParams if desired
            const quantity = this.calculatePositionSize(bot, price);

            // Create a new open trade
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
            // If you always go from flat -> buy -> sell -> flat, then a SELL closes the open trade.
            if (!openTrade) {
                // No open trade. Decide if you want to open a short trade or do nothing.
                console.log(`Bot "${bot.name}" received SELL signal but no open trade exists.`);
                return;
            }

            // Close the existing trade
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();  // or "closedAt"

            // Calculate profit for a long: (exitPrice - entryPrice) * quantity
            // For a short, the formula might differ.
            if (openTrade.type === 'BUY') {
                openTrade.profit = (price - openTrade.entryPrice) * openTrade.quantity;
            } else {
                // If you ever allow short trades, handle differently
                openTrade.profit = (openTrade.entryPrice - price) * openTrade.quantity;
            }

            await openTrade.save();
            console.log(`Bot "${bot.name}" closed trade. Profit: ${openTrade.profit}`);

            // If in paper mode, update the bot.paperBalance
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += openTrade.profit;
                await bot.save();
            }
        }
    }
}

module.exports = new BotService();
