// app/http/controllers/coinController.js
const CoinService = require('../../services/coinService');

exports.getCoinSummary = async (req, res) => {
    const { coinId } = req.params;
    try {
        const data = await CoinService.getCoinSummary(coinId);
        if (data !== null) {
            res.json({data: data, status: true});
        }
    } catch (err) {
        console.error('getCoinSummary error:', err);
        res.status(502).json({ error: err.message, status: false });
    }
};
