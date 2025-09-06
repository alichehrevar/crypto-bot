// app/services/coinService.js
const axios = require('axios');

const COINGECKO = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Simple in-memory cache
const cache = new Map();

/**
 * Converts a common symbol or a coinpaprika-style ID to a CoinGecko ID.
 * e.g., 'BTC', 'btc-bitcoin' -> 'bitcoin'
 * @param {string} coinIdOrSymbol
 * @returns {string} The CoinGecko coin ID.
 */
function toCoingeckoId(coinIdOrSymbol) {
    if (!coinIdOrSymbol) throw new Error('No coin identifier provided');

    const lower = coinIdOrSymbol.toLowerCase();

    // Mapping for common symbols to CoinGecko IDs
    const special = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'bnb': 'binancecoin',
        'sol': 'solana',
        'xrp': 'ripple',
        'ada': 'cardano',
        'doge': 'dogecoin',
        'ton': 'the-open-network', // Note: CoinGecko ID for Toncoin
        'trx': 'tron',
        'dot': 'polkadot',
        'matic': 'matic-network',
        'link': 'chainlink',
        'ltc': 'litecoin',
        'bch': 'bitcoin-cash',
        'etc': 'ethereum-classic',
    };

    // Check if the input is a known symbol
    if (special[lower]) return special[lower];

    // Rule: if it contains a hyphen (like 'btc-bitcoin'), take the second part.
    if (lower.includes('-')) {
        const parts = lower.split('-');
        return parts[1] || parts[0]; // 'btc-bitcoin' -> 'bitcoin'
    }

    // Fallback: assume the input itself is the ID (e.g., 'bitcoin')
    return lower;
}

/**
 * Fetches a comprehensive summary for a given coin using CoinGecko.
 * Accepts a CoinGecko ID ('bitcoin'), symbol ('BTC'), or CoinPaprika-like id ('btc-bitcoin').
 * @param {string} coinIdOrSymbol
 * @returns {Promise<object|null>}
 */
async function getCoinSummary(coinIdOrSymbol) {
    const id = toCoingeckoId(coinIdOrSymbol);
    const now = Date.now();

    // 1. Check if a valid cache entry exists
    if (cache.has(id)) {
        const cached = cache.get(id);
        if (now - cached.timestamp < CACHE_TTL_MS) {
            console.log(`Returning cached data for ${id}.`);
            return cached.data;
        }
    }

    // 2. If no valid cache, fetch from API
    try {
        const id = toCoingeckoId(coinIdOrSymbol);

        // 1) Fetch main coin data and 7-day OHLC in parallel
        const [coinDetailsRes, ohlc7dRes] = await Promise.all([
            // This single endpoint provides most of what we need!
            axios.get(`${COINGECKO}/coins/${id}`, {
                params: {
                    localization: false,
                    tickers: false,
                    market_data: true,
                    community_data: false,
                    developer_data: false,
                    sparkline: false,
                },
            }),
            // A separate call for 7-day high/low
            // axios.get(`${COINGECKO}/coins/${id}/ohlc`, {
            //     params: {
            //         vs_currency: 'usd',
            //         days: '7',
            //     },
            // }),
        ]);

        if (coinDetailsRes.status !== 200) {
            throw new Error(`Failed to fetch CoinGecko details for ${id}`);
        }

        const data = coinDetailsRes.data;
        const marketData = data.market_data;

        // --- Process 7-day OHLC data for 1-week high/low ---
        // Each ohlc item: [timestamp, open, high, low, close]
        // const ohlc7d = Array.isArray(ohlc7dRes.data) ? ohlc7dRes.data : [];
        // let high_1w = null;
        // let low_1w = null;
        //
        // if (ohlc7d.length > 0) {
        //     const highs = ohlc7d.map(k => k[2]); // high is at index 2
        //     const lows = ohlc7d.map(k => k[3]);  // low is at index 3
        //     high_1w = Math.max(...highs);
        //     low_1w = Math.min(...lows);
        // }

        // --- Return combined summary object ---
        console.log(`Coin ${coinIdOrSymbol} (${id}) summary fetched successfully via CoinGecko.`);
        const summaryData = {
            id: data.id,
            name: data.name,
            symbol: data.symbol.toUpperCase(),
            price: marketData.current_price?.usd,
            volume_24h: marketData.total_volume?.usd,
            market_cap: marketData.market_cap?.usd,
            last_updated: marketData.last_updated,
            percent_change_24h: marketData.price_change_percentage_24h_in_currency?.usd,
            percent_change_7d: marketData.price_change_percentage_7d_in_currency?.usd,
            percent_change_30d: marketData.price_change_percentage_30d_in_currency?.usd,
            percent_change_1y: marketData.price_change_percentage_1y_in_currency?.usd,
            high_24h: marketData.high_24h?.usd,
            low_24h: marketData.low_24h?.usd,
            // high_1w,
            // low_1w,
            ath: marketData.ath?.usd,
            imageUrl: data.image?.large,
        };

        // 3. Store the new result in the cache
        cache.set(id, {
            timestamp: now,
            data: summaryData,
        });

        return summaryData;
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`Error in getCoinSummary (CoinGecko) for ${coinIdOrSymbol}:`, errorMessage);

        // If API fails, check for an expired cache entry and return it if it exists
        // This is better than returning nothing.
        if (cache.has(id)) {
            console.warn(`API call failed for ${id}. Returning stale cache data.`);
            return cache.get(id).data;
        }

        return null;
    }
}

module.exports = { getCoinSummary };
