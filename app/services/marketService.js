// services/MarketService.js

const axios = require('axios');
const MarketSnapshot = require('../models/MarketSnapshot');
const IMAGE_CDN = 'https://static.coinpaprika.com/coin';

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

async function fetchAndStoreMarketData () {
    const res = await fetch('https://api.coinpaprika.com/v1/tickers');
    if (!res.ok) throw new Error('Failed to fetch market data');

    const coins = await res.json();

    for (const coin of coins) {
        await MarketSnapshot.updateOne(
            { id: coin.id },
            {
                id:         coin.id,
                name:       coin.name,
                symbol:     coin.symbol,
                rank:       coin.rank,
                circulating_supply: coin.circulating_supply,
                total_supply:       coin.total_supply,
                max_supply:         coin.max_supply,
                beta_value:         coin.beta_value,
                first_data_at:      coin.first_data_at,
                last_updated:       coin.last_updated,
                quotes:             coin.quotes,
                imageUrl:           `${IMAGE_CDN}/${coin.id}/logo.png`,
                updatedAt:          new Date()
            },
            { upsert: true }
        );
    }

    console.log(`[Market] ✅ Synced ${coins.length} coins from CoinPaprika`);
};

module.exports = {
    getTopMovers,
    fetchAndStoreMarketData
};
