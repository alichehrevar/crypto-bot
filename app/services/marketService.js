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
    const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

    let allCoins = [];
    let page = 1;
    const perPage = 250; // Max allowed by CoinGecko API

    try {
        // 1) Fetch all coins with market data using pagination
        // CoinGecko requires pagination to get the full list.
        while (true) {
            const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
            const marketRes = await fetch(url);

            if (!marketRes.ok) {
                throw new Error(`API call failed with status: ${marketRes.status}`);
            }

            const marketData = await marketRes.json();

            // If the page returns no data, we've fetched everything
            if (marketData.length === 0) {
                break;
            }

            allCoins = allCoins.concat(marketData);
            page++;
        }

        console.log(`[Market] Fetched ${allCoins.length} entries from CoinGecko.`);

        // 2) Upsert each coin into the database
        for (const coin of allCoins) {
            // Determine the type: If it has an 'asset_platform_id', it's a token.
            // Otherwise, it's a native coin on its own blockchain.
            const coinType = coin.asset_platform_id ? 'token' : 'coin';

            await MarketSnapshot.updateOne(
                { id: coin.id }, // Use CoinGecko's ID for matching
                {
                    id:                 coin.id,
                    name:               coin.name,
                    symbol:             coin.symbol,
                    rank:               coin.market_cap_rank,
                    type:               coinType, // Determined from asset_platform_id
                    circulating_supply: coin.circulating_supply,
                    total_supply:       coin.total_supply,
                    max_supply:         coin.max_supply,
                    // beta_value is not provided by this CoinGecko endpoint
                    first_data_at:      coin.atl_date, // Using 'All Time Low' date as a proxy
                    last_updated:       coin.last_updated,
                    // Re-structure quotes to match your existing schema
                    quotes: {
                        USD: {
                            price:                 coin.current_price,
                            market_cap:            coin.market_cap,
                            fully_diluted_valuation: coin.fully_diluted_valuation,
                            total_volume:          coin.total_volume,
                            percent_change_1h:     coin.price_change_percentage_1h_in_currency,
                            percent_change_24h:    coin.price_change_percentage_24h_in_currency,
                            percent_change_7d:     coin.price_change_percentage_7d_in_currency,
                        }
                    },
                    imageUrl:           coin.image, // CoinGecko provides a direct image URL
                    updatedAt:          new Date()
                },
                { upsert: true }
            );
        }

        console.log(`[Market] Synced ${allCoins.length} entries with types.`);

    } catch (error) {
        console.error('Error fetching or storing market data:', error);
    }
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
