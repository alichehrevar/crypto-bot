const axios = require('axios');

const Bot = require('../../models/Bot');
// Import all technical indicators from the index file.
const Indicators = require('../../strategies/technical');
const candleStore = require('../../../utils/candleStore');
const wsServer = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');

// Helper: Fetch historical candles from Binance REST API
// This is an example function for Binance. You can adjust URL/params as needed.
async function fetchHistoricalCandles(symbol, timeframe, count) {
    console.log('fetch historical data from broker')
    const normalizedSymbol = symbol.replace('/', '');
    const endpoint = 'https://api.binance.com/api/v3/klines';
    try {
        const response = await axios.get(endpoint, {
            params: {
                symbol: normalizedSymbol,
                interval: timeframe,
                limit: count,
            },
        });
        // Binance returns an array of arrays.
        // Each kline: [ Open time, Open, High, Low, Close, Volume, Close time, ... ]
        // We convert that into our candle object with a timestamp, open, high, low, close, and volume.
        return response.data.map(kline => ({
            timestamp: new Date(kline[0]), // open time
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            isClosed: true, // historical klines are closed.
        }));
    } catch (error) {
        console.error('Error fetching historical candles:', error.message);
        throw error;
    }
}

class BotUpdateService {
    /**
     * Updates a bot's market data based on a new candle update.
     * Uses an in-memory candle store for retrieving the most recent candles.
     * When a new candle is finalized (closed), it calculates the indicator signal
     * and, if the signal is not HOLD, triggers order execution.
     *
     * @param {Object} candle - The incoming candle data.
     *   Must include: symbol, timeframe, close, timestamp, isClosed flag, etc.
     */
    async updateBotDataFromCandle(candle) {
        try {
            // Normalize symbol and timeframe.
            const normSymbol = candle.symbol.toUpperCase();
            const normTimeframe = candle.timeframe.toLowerCase();

            // Update the in-memory candle store with the latest candle.
            candleStore.updateCandle(normSymbol, normTimeframe, candle);

            // Find active bots for this symbol and timeframe.
            const bots = await Bot.find({
                symbol: normSymbol,
                timeframe: normTimeframe,
                active: true
            });

            if (!bots || bots.length === 0) {
                return;
            }

            for (const bot of bots) {
                // Update market info based on whether the candle is the same as the last candle.
                if (
                    bot.marketInfo.lastCandle &&
                    new Date(bot.marketInfo.lastCandle.timestamp).getTime() === new Date(candle.timestamp).getTime()
                ) {
                    // If the candle exists, update the current candle price.
                    bot.marketInfo.currentCandle = { price: candle.close };
                    console.log(`Bot "${bot.name}" updated current candle price to ${candle.close}`);
                } else {
                    // Otherwise, treat the candle as finalized.
                    bot.marketInfo.lastCandle = {
                        timestamp: candle.timestamp,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                    };
                    bot.marketInfo.currentCandle = { price: candle.close };
                    console.log(`Bot "${bot.name}" finalized candle and updated price to ${candle.close}`);
                }

                // Only recalculate the signal if the incoming candle is marked as closed.
                if (candle.isClosed) {
                    // Determine the number of candles to retrieve based on the bot's strategy params.
                    let requiredCount = 50; // fallback default for indicators that don't use a period
                    if (bot.strategyParams && bot.strategyParams.period) {
                        // Optionally, you might require period+1 candles.
                        requiredCount = bot.strategyParams.period + 2;
                    }

                    // Retrieve the latest requiredCount closed candles.
                    let recentCandles = candleStore.getLatestCandles(normSymbol, normTimeframe, requiredCount);

                    // If we don't have enough candles, fetch historical candles from a broker.
                    if (recentCandles.length < requiredCount) {
                        const historicalCandles = await fetchHistoricalCandles(normSymbol, normTimeframe, requiredCount - recentCandles.length);
                        // Combine historical candles (oldest first) with those in memory.
                        recentCandles = historicalCandles.concat(recentCandles);
                    }

                    let computedSignal = 'HOLD';
                    try {
                        let indicatorInstance;
                        switch (bot.indicator) {
                            case 'RSI': {
                                indicatorInstance = new Indicators.RSI(bot.strategyParams);
                                break;
                            }
                            case 'MACD': {
                                indicatorInstance = new Indicators.MACD(bot.strategyParams);
                                break;
                            }
                            case 'MA_Crossover': {
                                indicatorInstance = new Indicators.MACrossover(bot.strategyParams);
                                break;
                            }
                            case 'Donchian': {
                                indicatorInstance = new Indicators.Donchian(bot.strategyParams);
                                break;
                            }
                            case 'Volume': {
                                indicatorInstance = new Indicators.Volume(bot.strategyParams);
                                break;
                            }
                            case 'Heikin_Ashi': {
                                indicatorInstance = new Indicators.HeikinAshi(bot.strategyParams);
                                break;
                            }
                            case 'Combined_RSI_MACD': {
                                indicatorInstance = new Indicators.CombinedRsiMacd(bot.strategyParams);
                                break;
                            }
                            case 'Bollinger_Bands': {
                                indicatorInstance = new Indicators.BollingerBands(bot.strategyParams);
                                break;
                            }
                            case 'Stochastic_RSI': {
                                indicatorInstance = new Indicators.StochasticRSI(bot.strategyParams);
                                break;
                            }
                            default:
                                console.error(`Unknown indicator: ${bot.indicator}`);
                        }
                        if (indicatorInstance) {
                            computedSignal = indicatorInstance.calculateSignal(recentCandles);
                            console.log(`Computed signal for bot "${bot.name}" using ${bot.indicator} with ${requiredCount} candles:`, computedSignal);
                        }
                    } catch (error) {
                        console.error(`Error computing signal for bot "${bot.name}": ${error.message}`);
                    }

                    bot.marketInfo.lastSignal = computedSignal;
                    await bot.save();
                    console.log(`Updated bot "${bot.name}" with signal: ${computedSignal}`);

                    // Broadcast update to clients...
                    const updatedBot = bot.toObject();
                    updatedBot.id = updatedBot._id.toString();
                    wsServer.broadcastBotUpdate(updatedBot);
                } else {
                    await bot.save();
                }
            }
        } catch (error) {
            console.error(`Error updating bot data from candle: ${error.message}`);
        }
    }
}

module.exports = new BotUpdateService();
