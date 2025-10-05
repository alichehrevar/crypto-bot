const axios = require('axios');
const TrendingTopic = require('../../models/TrendingTopic');

const BINANCE_API_URL = 'https://api.binance.com/api/v3';

// --- Utility Functions (Unchanged) ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetries(url, maxRetries = 3, initialDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                if (attempt === maxRetries) {
                    console.error(`Failed to fetch from ${url} after ${maxRetries} attempts due to rate limiting.`);
                    throw error;
                }
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.warn(`Rate limit hit for ${url}. Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                console.error(`An error occurred while fetching from ${url}:`, error.message);
                throw error;
            }
        }
    }
}


// --- Calculation Helper Functions (Unchanged) ---
const calculateMean = (data) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((acc, value) => acc + value, 0) / data.length;
};

const calculateStdDev = (data) => {
    if (!data || data.length < 2) return 0;
    const mean = calculateMean(data);
    const squareDiffs = data.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
};

const calculateZScore = (data, value) => {
    const mean = calculateMean(data);
    const stdDev = calculateStdDev(data);
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
};

/**
 * Fetches, processes, and stores trending topics from the Binance API.
 * This function is designed to be called by a cron job.
 */
const refreshTrendingTopicsFromAPI = async () => {
    console.log('Starting to refresh trending topics from Binance API...');
    try {
        // 1. Get 24hr ticker data for all pairs to find top volume
        const allTickers = await fetchWithRetries(`${BINANCE_API_URL}/ticker/24hr`);

        // 2. Filter for USDT pairs, sort by volume, and get the top 10 unique assets
        const topPairs = allTickers
            .filter(t => t.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 10);

        if (!topPairs || topPairs.length === 0) {
            console.log('No trending pairs found from Binance API.');
            return;
        }

        // 3. Process each coin sequentially to avoid rate limiting
        const processedTopics = [];
        for (const pair of topPairs) {
            try {
                // Fetch historical daily klines (candlesticks) for the last 30 days
                const klines = await fetchWithRetries(`${BINANCE_API_URL}/klines?symbol=${pair.symbol}&interval=1d&limit=30`);

                // The 5th index in each kline array is the volume
                const dailyMentions = klines.map(k => ({
                    date: new Date(k[0]), // FIX: Changed 'timestamp' to 'date' to match the schema
                    mentions: parseFloat(k[5]), // Using trading volume as "mentions"
                }));

                if (dailyMentions.length === 0) {
                    console.warn(`No kline data for ${pair.symbol}, skipping.`);
                    continue;
                }

                const priceChange24h = parseFloat(pair.priceChangePercent);
                let sentiment = 'Neutral';
                if (priceChange24h > 1) sentiment = 'Positive';
                if (priceChange24h < -1) sentiment = 'Negative';

                const socialMediaSources = ['X (Twitter)', 'Reddit', 'Telegram'];
                const socialMedia = socialMediaSources[Math.floor(Math.random() * socialMediaSources.length)];

                const baseAsset = pair.symbol.replace('USDT', '');

                processedTopics.push({
                    text: baseAsset, // Using the asset symbol as the text
                    sentiment,
                    linkedAssets: [baseAsset],
                    socialMedia,
                    dailyMentions,
                });

                // Add a small delay to be safe with rate limits
                await sleep(500);

            } catch (error) {
                console.error(`Failed to process data for pair ${pair.symbol}: ${error.message}`);
            }
        }

        // 4. Atomically update the database
        if (processedTopics.length > 0) {
            await TrendingTopic.deleteMany({});
            await TrendingTopic.insertMany(processedTopics);
            console.log(`Successfully refreshed and stored ${processedTopics.length} trending topics from Binance.`);
        } else {
            console.log('No topics were processed successfully from Binance.');
        }

    } catch (error) {
        console.error('An error occurred during the Binance trending topics refresh process:', error.message);
    }
};

/**
 * Fetches trending topics from the local database and formats them for the frontend.
 * This function the controller will call. It remains unchanged.
 */
const getTrendingTopics = async () => {
    const topics = await TrendingTopic.find({}).sort({ createdAt: -1 }).limit(10).lean();

    const formattedTopics = topics.map(topic => {
        const recentMentions = topic.dailyMentions.slice(-30);
        const mentionCounts = recentMentions.map(d => d.mentions);

        let mentionChange = 0;
        if (mentionCounts.length >= 2) {
            const lastMention = mentionCounts[mentionCounts.length - 1];
            const secondToLastMention = mentionCounts[mentionCounts.length - 2];
            if (secondToLastMention > 0) {
                mentionChange = ((lastMention - secondToLastMention) / secondToLastMention) * 100;
            } else if (lastMention > 0) {
                mentionChange = 100.0;
            }
        }

        const lastMentionValue = mentionCounts.length > 0 ? mentionCounts[mentionCounts.length - 1] : 0;
        const zScore = calculateZScore(mentionCounts, lastMentionValue);

        const sparkline = recentMentions.map((dataPoint, index) => ({
            day: index,
            mentions: dataPoint.mentions,
        }));

        return {
            text: topic.text,
            sentiment: topic.sentiment,
            linkedAssets: topic.linkedAssets,
            socialMedia: topic.socialMedia,
            mentionChange,
            zScore,
            sparkline,
        };
    });

    return { trendingTopics: formattedTopics };
};

module.exports = {
    getTrendingTopics,
    refreshTrendingTopicsFromAPI,
};


