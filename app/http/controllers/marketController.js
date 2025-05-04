// app/http/controllers/marketController.js
const { getTopMovers } = require('../../services/marketService')

/**
 * GET /api/market/top-movers?limit=5
 */
exports.getTopMovers = async (req, res) => {
    try {
        // allow override via query param
        const limit = Math.max(1, Math.min(20, parseInt(req.query.limit) || 5))
        const movers = await getTopMovers(limit)
        res.json(movers)
    } catch (err) {
        console.error('marketController.getTopMovers error', err)
        res.status(500).json({ error: 'Failed to fetch top movers' })
    }
}
