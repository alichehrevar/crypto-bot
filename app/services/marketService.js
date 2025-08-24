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

/**
 * Calculates the average daily volume for a given symbol over a specified period.
 * @param {string} symbol - The symbol of the asset (e.g., 'BTC').
 * @param {number} days - The number of days to look back for the average.
 * @returns {Promise<number>} The average daily volume.
 */
async function getAverageVolume(symbol, days = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // Find daily candles for the symbol within the date range
    const dailyCandles = await Candle.find({
        symbol: `${symbol}/USDT`, // Assuming standard pairing
        timeframe: '1d',
        timestamp: { $gte: dateLimit }
    }).lean();

    if (dailyCandles.length === 0) {
        return 0; // Return 0 if no historical data is found
    }

    const totalVolume = dailyCandles.reduce((sum, candle) => sum + candle.volume, 0);
    return totalVolume / dailyCandles.length;
}

/**
 * Fetches and processes data for the Market Movers & Volatility component.
 * @returns {Promise<object>} An object containing gainers, losers, and data for the scatter plot.
 */
async function getMoversAndVolatility() {
    try {
        // 1. Fetch all market data snapshots from the database
        const allCoins = await MarketSnapshot.find({ "quotes.USD.volume_24h": { $gt: 100000 } }).sort({ rank: 1 }).lean();

        // 2. Enrich each coin with its Relative Volume (RVol)
        const enrichedData = await Promise.all(
            allCoins.map(async (coin) => {
                const avgVolume = await getAverageVolume(coin.symbol);
                const currentVolume = coin.quotes.USD.volume_24h;
                const rVol = avgVolume > 0 ? currentVolume / avgVolume : 0;

                // Generate a simple sparkline (in a real scenario, this would come from more detailed data)
                const sparkline = Array.from({ length: 24 }, () => 100 + (Math.random() - 0.5) * 10);

                return {
                    asset: coin.symbol,
                    change: coin.quotes.USD.percent_change_24h,
                    volume: currentVolume,
                    rVol: rVol,
                    sparkline: sparkline,
                };
            })
        );

        // 3. Sort the enriched data to find the top 10 gainers and losers
        const sortedByChange = [...enrichedData].sort((a, b) => b.change - a.change);

        const gainers = sortedByChange.slice(0, 10);
        const losers = sortedByChange.slice(-10).reverse(); // Get the last 10 and reverse to show highest loss first

        // 4. Return the final data structure required by the frontend component
        return {
            gainers,
            losers,
            volatilityScatter: enrichedData, // The scatter plot uses all the enriched data
        };

    } catch (error) {
        console.error("Error in getMoversAndVolatility service:", error);
        throw new Error('Failed to process market movers data.');
    }
}

module.exports = {
    getTopMovers,
    fetchAndStoreMarketData,
    getMoversAndVolatility,
};
