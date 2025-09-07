// File: app/services/sentimentService.js

const axios = require('axios')
const logger = require('../../logs/logger.js');

/**
 * Fetches the latest Fear & Greed Index from the alternative.me API.
 * @returns {Promise<number>} The Fear & Greed score (0-100).
 * @throws {Error} If the API request fails or the data is in an unexpected format.
 */
async function getFearAndGreedIndex() {
    try {
        const response = await axios.get('https://api.alternative.me/fng/?limit=1');

        if (response.data && response.data.data && response.data.data.length > 0) {
            return parseInt(response.data.data[0].value, 10);
        } else {
            throw new Error('Invalid data structure received from F&G API.');
        }
    } catch (error) {
        logger.error('Error fetching Fear & Greed data:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        // Re-throw the error to be handled by the controller
        throw new Error('Failed to fetch sentiment data from the external API.');
    }
}

module.exports = {
    getFearAndGreedIndex,
};
