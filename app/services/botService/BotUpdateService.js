const Bot = require('../../models/Bot');
const RSI = require('../../strategies/technical/RSI');
const MACD = require('../../strategies/technical/MACD');
const MACrossover = require('../../strategies/technical/MovingAverageCrossover');

class BotUpdateService {
    /**
     * Updates a bot's market data with new candle information.
     * Updates both the last closed candle and the current (open) candle price.
     * Then, recalculates the signal using recent candles and broadcasts the update.
     *
     * @param {Object} candle - The incoming candle data.
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
                // If the incoming candle's timestamp matches the last closed candle, update current candle.
                if (
                    bot.marketInfo.lastCandle &&
                    new Date(bot.marketInfo.lastCandle.timestamp).getTime() === new Date(candle.timestamp).getTime()
                ) {
                    bot.marketInfo.currentCandle = { price: candle.close };
                    console.log(`Bot "${bot.name}" updated current candle price to ${candle.close}`);
                } else {
                    // Otherwise, treat the incoming candle as a new finalized candle.
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
                // Fetch recent candles for signal calculation.
                const Candle = require('../../models/Candle');
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
                const wsServer = require('../WebSocketServer');
                wsServer.broadcastBotUpdate(updatedBot);
            }
        } catch (error) {
            console.error(`Error updating bot data from candle: ${error.message}`);
        }
    }
}

module.exports = new BotUpdateService();
