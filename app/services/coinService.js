// app/services/coinService.js
const axios = require('axios');
const BASE = 'https://api.coinpaprika.com/v1';
const IMAGE_CDN = 'https://static.coinpaprika.com/coin';

/**
 * Fetches a comprehensive summary for a given coin, including 1-week high/low.
 * @param {string} coinId - The ID of the coin (e.g., 'btc-bitcoin').
 * @returns {Promise<object|null>} A summary object for the coin or null if an error occurs.
 */
async function getCoinSummary(coinId) {
    try {
        // --- Calculate start date for the 7-day historical fetch ---
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        const startISO = startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

        // 1) Fetch ticker and 1 week of OHLCV data in parallel for efficiency.
        const [tickerRes, historicalRes] = await Promise.all([
            axios.get(`${BASE}/tickers/${coinId}`),
            // Fetch the last 7 days of historical data for the 1-week high/low
            axios.get(`${BASE}/coins/${coinId}/ohlcv/historical?start=${startISO}`)
        ]);

        // 2) Check HTTP status for the main ticker data
        if (tickerRes.status !== 200) {
            throw new Error(`Failed to fetch ticker data for ${coinId}`);
        }

        // 3) Process Ticker Data
        const ticker = tickerRes.data;
        const quotes = ticker.quotes.USD;
        if (!quotes) {
            throw new Error(`USD quotes not available for ${coinId}`);
        }

        // 4) Process Historical Data to find the 1-week high and low
        let high_1w = null;
        let low_1w = null;
        // Gracefully handle if the historical data call fails or returns no data
        if (historicalRes.status === 200 && Array.isArray(historicalRes.data) && historicalRes.data.length > 0) {
            const weeklyData = historicalRes.data;
            high_1w = Math.max(...weeklyData.map(d => d.high));
            low_1w = Math.min(...weeklyData.map(d => d.low));
        }

        // 5) Calculate an approximate high/low for the last 24h.
        const price = quotes.price;
        const change24h = quotes.percent_change_24h;
        const price24hAgo = price / (1 + (change24h / 100));
        const high_24h = change24h >= 0 ? price : price24hAgo;
        const low_24h = change24h >= 0 ? price24hAgo : price;

        // 6) Return the final combined summary object.
        console.log(`Coin ${coinId} summary fetched successfully.`);
        return {
            id: ticker.id,
            name: ticker.name,
            symbol: ticker.symbol,
            price: quotes.price,
            volume_24h: quotes.volume_24h,
            market_cap: quotes.market_cap,
            last_updated: ticker.last_updated,

            // Percentage changes (directly from API)
            percent_change_24h: quotes.percent_change_24h,
            percent_change_7d: quotes.percent_change_7d,
            percent_change_30d: quotes.percent_change_30d,
            percent_change_1y: quotes.percent_change_1y,

            // High / Low data
            high_24h: high_24h,
            low_24h: low_24h,
            high_1w: high_1w,
            low_1w: low_1w,

            // The API provides All-Time High
            ath: quotes.ath_price,

            imageUrl: `${IMAGE_CDN}/${ticker.id}/logo.png`,
        };

    } catch (error) {
        console.error(`Error in getCoinSummary for ${coinId}:`, error.message);
        return null;
    }
}

module.exports = { getCoinSummary };
