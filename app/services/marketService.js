// services/MarketService.js

const axios = require('axios');

/**
 * Pulls Binance 24 h ticker data and returns top gainers or losers.
 *
 * @param {number} limit      Number of symbols to return
 * @param {'asc'|'desc'} direction  'desc' ⇒ biggest positive % moves; 'asc' ⇒ biggest negative
 * @returns {Promise<Array<{symbol:string, name:string, changePct:number}>>}
 */
async function getTopMovers(limit = 5, direction = 'desc') {
    // 1) Fetch all 24 h tickers
    const resp = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
    const all = resp.data; // array of { symbol, priceChangePercent, ... }

    // 2) Filter to USDT pairs, map to { symbol, name, changePct }
    const filtered = all
        .filter(t => t.symbol.endsWith('USDT'))
        .map(t => {
            const base = t.symbol.slice(0, -4);
            return {
                symbol: `${base}/USDT`,
                name:   base,
                changePct: parseFloat(t.priceChangePercent)
            };
        })
        // 3) Keep only the desired direction
        .filter(m => (direction === 'desc' ? m.changePct > 0 : m.changePct < 0))
        // 4) Sort
        .sort((a, b) =>
            direction === 'desc'
                ? b.changePct - a.changePct
                : a.changePct - b.changePct
        )
        // 5) Limit
        .slice(0, limit);

    return filtered;
}

module.exports = {
    getTopMovers,
};
