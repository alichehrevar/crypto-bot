const axios = require('axios');
const Candle = require('../../models/Candle');

const candleController = {
    fetchHistoricalData: async (req, res) => {
        try {
            const { symbol, interval, limit = 100 } = req.body;

            // Ensure the symbol is in the correct format (e.g., "BTC/USDT" to "BTCUSDT")
            const binanceSymbol = symbol.replace('/', '');

            // Fetch historical data from Binance API
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                    symbol: binanceSymbol,
                    interval,
                    limit
                }
            });

            // Map the response data to the format used in our database
            const candles = response.data.map(kline => ({
                symbol,
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                timeframe: interval,
                timestamp: new Date(kline[0]) // Convert timestamp to Date object
            }));

            // Delete any existing data for the given symbol and timeframe before inserting new data
            await Candle.deleteMany({ symbol, timeframe: interval });

            // Insert the new candle data into the database
            await Candle.insertMany(candles);

            res.json({
                success: true,
                count: candles.length,
                symbol,
                interval
            });

        } catch (error) {
            console.error('Binance API error:', error.response?.data || error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch historical data',
                details: error.response?.data || error.message
            });
        }
    },

    getData: async (req, res) => {
        try {
            const { symbol, timeframe } = req.params;

            // Fetch data from the database for the given symbol and timeframe
            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase()
            }).sort({ timestamp: -1 }).limit(100); // Limit to the latest 100 candles

            res.json({
                success: true,
                count: candles.length,
                data: candles
            });
        } catch (error) {
            console.error('Get candles error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch candles'
            });
        }
    }
};

module.exports = candleController;
