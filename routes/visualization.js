const express = require('express');
const router = express.Router();
const Candle = require('../app/models/Candle');
const Trade = require('../app/models/Trade');

router.get('/chart/:symbol([^/]+/[^/]+)/:timeframe', async (req, res) => {
    const { symbol, timeframe } = req.params;
    const candles = await Candle.find({ symbol, timeframe })
        .sort({ timestamp: 1 })
        .limit(500);

    const trades = await Trade.find({ symbol });

    res.json({
        candles: candles.map(c => ({
            time: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
        })),
        trades: trades.map(t => ({
            time: t.timestamp,
            price: t.entryPrice,
            type: t.type
        }))
    });
});

module.exports = router;
