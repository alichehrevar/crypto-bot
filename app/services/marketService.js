// app/services/marketService.js
const axios = require('axios')

/**
 * Fetch all 24h ticker stats from Binance, filter to USDT pairs,
 * sort by absolute percent change, and return the top N movers.
 *
 * @param {number} limit
 * @returns {Promise<Array<{name: string, symbol: string, changePct: number}>>}
 */
async function getTopMovers(limit = 5) {
    // 1) fetch 24h stats
    const resp = await axios.get('https://api.binance.com/api/v3/ticker/24hr')
    const data = resp.data

    // 2) keep only USDT pairs and map to our shape
    const usdt = data
        .filter(t => t.symbol.endsWith('USDT'))
        .map(t => ({
            symbol: t.symbol.replace(/USDT$/, '/USDT'),
            // Binance returns changePercent as a string:
            changePct: parseFloat(t.priceChangePercent)
        }))

    // 3) sort by absolute % change descending
    usdt.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))

    // 4) take top N and add a friendly name placeholder
    return usdt.slice(0, limit).map(item => ({
        name: item.symbol.split('/')[0], // you can swap this for a real lookup
        symbol: item.symbol.split('/')[0],
        changePct: item.changePct
    }))
}

module.exports = { getTopMovers }
