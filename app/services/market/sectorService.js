// app/services/market/sectorService.js

const axios = require('axios');
const logger = require('../../../logs/logger');

// Simple in-memory cache to store results and avoid hitting API rate limits.
// For production, consider using a more robust solution like Redis.
const cache = {
    data: null,
    lastFetch: 0,
    ttl: 10 * 60 * 1000, // Cache for 10 minutes
};

// --- CoinGecko API Configuration ---
const coingeckoApi = axios.create({
    baseURL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
});

// Map your frontend display names to CoinGecko's official category IDs.
// You can find IDs by exploring https://api.coingecko.com/api/v3/coins/categories/list
const SECTOR_CATEGORY_MAPPING = {
    'Layer 1 protocols': 'layer-1',
    'DeFi 2.0': 'decentralized-finance-defi', // Note: CG doesn't have a "DeFi 2.0", so we use the main one.
    'Layer 2 scaling': 'layer-2-scaling',
    'Gaming & metaverse': 'gaming', // Combines gaming and metaverse for simplicity
    'AI & big data': 'artificial-intelligence',
    'Infrastructure': 'infrastructure',
    'Real world assets (RWA)': 'real-world-assets-rwa',
};


class SectorPerformanceService {

    /**
     * Fetches market data for a single category from CoinGecko.
     * @param {string} categoryId - The CoinGecko category ID.
     * @returns {Promise<Array>} A promise that resolves to an array of coin market data.
     */
    async fetchCoinsForCategory(categoryId) {
        try {
            const response = await coingeckoApi.get('/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    category: categoryId,
                    order: 'market_cap_desc',
                    per_page: 50, // Get top 50 coins to represent the sector
                    page: 1,
                    sparkline: false,
                },
            });
            return response.data;
        } catch (error) {
            logger.error(`Failed to fetch coin data for category ${categoryId}:`, error.message);
            return []; // Return empty array on failure to not break the entire process
        }
    }

    /**
     * Calculates the 24-hour performance of market sectors using live CoinGecko data.
     * @returns {Promise<object>} An object containing the performance data for the frontend component.
     */
    async calculatePerformance() {
        const now = Date.now();
        // 1. Check if we have valid, recent data in the cache
        if (cache.data && (now - cache.lastFetch < cache.ttl)) {
            logger.info('Returning sector performance from cache.');
            return cache.data;
        }

        logger.info('Fetching fresh sector performance data from CoinGecko.');

        // 2. Create an array of promises to fetch all categories in parallel
        const promises = Object.entries(SECTOR_CATEGORY_MAPPING).map(async ([sectorName, categoryId]) => {
            const coins = await this.fetchCoinsForCategory(categoryId);

            if (coins.length === 0) {
                return { sector: sectorName, performance1D: 0 };
            }

            // 3. Calculate the weighted average performance for the sector
            let totalMarketCap = 0;
            let weightedPerformanceSum = 0;

            coins.forEach(coin => {
                const perf24h = coin.price_change_percentage_24h;
                const marketCap = coin.market_cap;

                if (typeof perf24h === 'number' && marketCap > 0) {
                    totalMarketCap += marketCap;
                    weightedPerformanceSum += perf24h * marketCap;
                }
            });

            const averagePerformance = totalMarketCap > 0 ? weightedPerformanceSum / totalMarketCap : 0;

            return {
                sector: sectorName,
                performance1D: parseFloat(averagePerformance.toFixed(2)),
            };
        });

        // 4. Wait for all API calls and calculations to complete
        const performanceData = await Promise.all(promises);

        // 5. Sort the data descending by performance
        performanceData.sort((a, b) => b.performance1D - a.performance1D);

        const result = { performance: performanceData };

        // 6. Update the cache
        cache.data = result;
        cache.lastFetch = now;

        return result;
    }
}

module.exports = new SectorPerformanceService();
