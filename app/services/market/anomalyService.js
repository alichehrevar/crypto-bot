const Anomaly = require('../../models/Anomaly');
const logger = require('../../../logs/logger');

/**
 * Fetches the most recent market anomalies from the database.
 * @param {number} limit - The maximum number of anomalies to return.
 * @returns {Promise<Array>} A promise that resolves to an array of anomaly documents.
 */
async function getLatestAnomalies(limit = 15) {
    try {
        return await Anomaly.find().sort({ createdAt: -1 }).limit(limit).exec();
    } catch (error) {
        logger.error('Error fetching anomalies from database:', error);
        throw error; // Re-throw to be caught by the controller
    }
}

/**
 * SIMULATED: Detects and stores a new random anomaly.
 * In a real-world scenario, this logic would be replaced by actual market data
 * analysis from your WebSocket streams or other data sources.
 */
async function detectAndStoreAnomaly() {
    const severities = ['High', 'Medium', 'Low'];
    const types = ['Volume', 'Funding', 'On-Chain', 'OI', 'Price'];
    const assets = ['BTC', 'ETH', 'SOL', 'RNDR', 'AVAX', 'LINK'];

    // --- Mock Data Generation ---
    const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];

    let detail = '';
    switch (randomType) {
        case 'Volume':
            const volumeMultiplier = (Math.random() * 5 + 2).toFixed(1);
            detail = `${randomAsset} spot volume is ${volumeMultiplier}× above 24h average.`;
            break;
        case 'Funding':
            const direction = Math.random() > 0.5 ? 'negative' : 'positive';
            detail = `${randomAsset} perp funding flipped ${direction} across major venues.`;
            break;
        case 'OI':
            const oiPercentage = (Math.random() * 25 + 5).toFixed(0);
            detail = `${randomAsset} open interest jumped +${oiPercentage}% in the last hour.`;
            break;
        case 'On-Chain':
            const amount = Math.floor(Math.random() * 200 + 50);
            detail = `USDT treasury transfer of ${amount}M to a known ${randomAsset} whale wallet.`;
            break;
        case 'Price':
            const wickPercentage = (Math.random() * 4 + 1.5).toFixed(1);
            const wickDirection = Math.random() > 0.5 ? '+' : '−';
            detail = `${randomAsset} printed a ${wickDirection}${wickPercentage}% 1-min wick; spreads widened.`;
            break;
    }
    // --- End Mock Data Generation ---

    try {
        const newAnomaly = new Anomaly({
            type: randomType,
            asset: randomAsset,
            detail,
            severity: randomSeverity,
        });
        await newAnomaly.save();
        logger.info(`New anomaly detected and stored: ${detail}`);
        return newAnomaly;
    } catch (error) {
        logger.error('Error storing new anomaly:', error);
    }
}

module.exports = {
    getLatestAnomalies,
    detectAndStoreAnomaly,
};
