const axios = require('axios');
const { validationResult } = require('express-validator');
const Candle = require('../../models/Candle');

const candleController = {
    fetchHistoricalData: async (req, res) => {
        try {
            const { symbol, interval, limit = 100 } = req.body;
            const binanceSymbol = symbol.replace('/', '');

            const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
                params: {
                    symbol: binanceSymbol,
                    interval,
                    limit
                }
            });

            const candles = response.data.map(kline => ({
                symbol,
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                timeframe: interval,
                timestamp: new Date(kline[0])
            }));

            // Remove existing data and insert new
            await Candle.deleteMany({ symbol, timeframe: interval });
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

            const candles = await Candle.find({
                symbol: symbol.toUpperCase(),
                timeframe: timeframe.toLowerCase()
            }).sort({ timestamp: -1 }).limit(100);

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

    // Add real-time WebSocket connection later
};

module.exports = candleController;
