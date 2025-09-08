// app/services/sentimentService.js

const axios = require('axios')
const EconomicEvent = require('../../models/EconomicEvent');
const logger = require('../../../logs/logger.js');

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


/**
 * Fetches all processed economic events directly from the database.
 * The data is kept up-to-date by background cron jobs.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of events.
 */
async function getEconomicEvents () {
    try {
        // Fetch all events and sort them by date in ascending order
        const allEvents = await EconomicEvent.find({}).sort({ date: 'asc' }).lean();

        const now = new Date();

        // Map over the raw data to format it for the frontend
        return allEvents.map(event => {
            const eventDate = new Date(event.date);
            const isPast = eventDate < now;
            const dateString = eventDate.toISOString().split('T')[0];

            return {
                ...event,
                date: dateString,
                isPast,
            };
        });
    } catch (error) {
        logger.error('Error fetching economic events from database:', error);
        throw new Error('Could not retrieve economic events.');
    }
}

module.exports = {
    getFearAndGreedIndex,
    getEconomicEvents
};
