// services/MarketService.js

const MarketSnapshot = require('../models/MarketSnapshot');
const IMAGE_CDN = 'https://static.coinpaprika.com/coin';

/**
 * Get top movers from the DB.
 *
 * @param {number} limit     how many movers to return (1–100)
 * @param {'asc'|'desc'} direction  'desc' → biggest gainers, 'asc' → biggest losers
 */
async function getTopMovers(limit = 5, direction = 'desc') {
    const lim = Math.max(1, Math.min(100, limit));
    const dir = direction === 'asc' ? 'asc' : 'desc';

    const match = {
        type: 'coin',                                   // ← only real coins
        'quotes.USD.percent_change_24h': dir === 'desc'
            ? { $gt: 0 }
            : { $lt: 0 }
    };

    const sortOrder = {
        'quotes.USD.percent_change_24h': dir === 'desc' ? -1 : 1
    };

    const docs = await MarketSnapshot
        .find(match)
        .sort(sortOrder)
        .limit(lim)
        .select('symbol name imageUrl quotes.USD.percent_change_24h');

    return docs.map(d => ({
        symbol:    d.symbol,
        name:      d.name,
        imageUrl:  d.imageUrl,
        changePct: d.quotes.USD.percent_change_24h
    }));
}

async function fetchAndStoreMarketData() {
    // 1) get all coins for their types
    const coinsRes   = await fetch('https://api.coinpaprika.com/v1/coins');
    const coinsList  = await coinsRes.json();
    const typeMap    = coinsList.reduce((map, c) => {
        map[c.id] = c.type;
        return map;
    }, {});

    // 2) fetch all tickers
    const tickersRes = await fetch('https://api.coinpaprika.com/v1/tickers');
    const tickers    = await tickersRes.json();

    // 3) upsert each ticker + type
    for (const t of tickers) {
        const coinType = typeMap[t.id] || 'coin';
        await MarketSnapshot.updateOne(
            { id: t.id },
            {
                id:         t.id,
                name:       t.name,
                symbol:     t.symbol,
                rank:       t.rank,
                type:       coinType,                           // ← store it
                circulating_supply: t.circulating_supply,
                total_supply:       t.total_supply,
                max_supply:         t.max_supply,
                beta_value:         t.beta_value,
                first_data_at:      t.first_data_at,
                last_updated:       t.last_updated,
                quotes:             t.quotes,
                imageUrl:           `${IMAGE_CDN}/${t.id}/logo.png`,
                updatedAt:          new Date()
            },
            { upsert: true }
        );
    }

    console.log(`[Market] Synced ${tickers.length} entries with types`);
}

module.exports = {
    getTopMovers,
    fetchAndStoreMarketData
};
