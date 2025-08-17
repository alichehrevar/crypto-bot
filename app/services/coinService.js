// app/services/coinService.js
const axios = require('axios');
const BASE = 'https://api.coinpaprika.com/v1';
const IMAGE_CDN = 'https://static.coinpaprika.com/coin';

/**
 * Fetches a comprehensive summary for a given coin using the /tickers endpoint.
 * This function is optimized to get all required data in a single API call.
 * @param {string} coinId - The ID of the coin (e.g., 'btc-bitcoin').
 * @returns {Promise<object>} A summary object for the coin.
 */
async function getCoinSummary(coinId) {
    try {
        // 1) Fetch all ticker information in a single API call.
        const response = await axios.get(`${BASE}/tickers/${coinId}`);

        // 2) Check HTTP status code
        if (response.status !== 200) {
            throw new Error(`Failed to fetch ticker data for ${coinId}`);
        }

        // 3) Pull the data object and the USD quotes from the response
        const ticker = response.data;
        const quotes = ticker.quotes.USD;

        if (!quotes) {
            throw new Error(`USD quotes not available for ${coinId}`);
        }

        // 4) Calculate an approximate high/low for the last 24h.
        const price = quotes.price;
        const change24h = quotes.percent_change_24h;
        const price24hAgo = price / (1 + (change24h / 100));
        const high_24h = change24h >= 0 ? price : price24hAgo;
        const low_24h = change24h >= 0 ? price24hAgo : price;

        // 5) Return the structured summary.
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

            // The API provides All-Time High
            ath: quotes.ath_price,

            imageUrl: `${IMAGE_CDN}/${ticker.id}/logo.png`,
        };

    } catch (error) {
        console.error(`Error in getCoinSummary for ${coinId}:`, error.message);
        // In case of an error, return a null or a default error object
        // to prevent the service from crashing the application.
        return null;
    }
}

module.exports = { getCoinSummary };
