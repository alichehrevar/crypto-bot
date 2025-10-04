// app/services/sentimentService.js

const axios = require('axios')
const EconomicEvent = require('../../models/EconomicEvent');
const {investing} = require('investing-com-api');
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
 * Fetches crypto economic events from the CoinMarketCal API.
 */
async function getEconomicEventsFromCoinMarketCal() {
    try {
        // Retrieve your API key from environment variables
        const accessToken = process.env.COINMARKETCAL_API_KEY;
        if (!accessToken) {
            throw new Error('CoinMarketCal API key is not set.');
        }

        // Fetch events for the next 7 days (you can adjust the date range)
        const response = await axios.get('https://developers.coinmarketcal.com/v1/events', {
            params: {
                // Parameters are optional, but good for filtering
                max: 100, // Limit the number of results
                // You can also specify date ranges:
                // dateRangeStart: '30-09-2025',
                // dateRangeEnd: '07-10-2025',
            },
            headers: {
                'x-api-key': accessToken,
                'Accept': 'application/json',
            }
        });

        const events = response.data.body; // The events are in the 'body' property

        // Map over the API data to format it for your frontend
        return events.map(event => {
            // This is the full UTC timestamp, e.g., "2025-09-30T00:00:00Z"
            const eventDateUtc = new Date(event.date_event).toISOString();

            return {
                // 1. Spread all original properties from the API event object
                ...event,

                // 2. Overwrite the 'title' object with the English string for convenience
                title: event.title.en,

                // 3. Add our formatted UTC date for the frontend to use
                dateUtc: eventDateUtc,
            };
        });

    } catch (error) {
        // Better error handling for API calls
        if (error.response) {
            logger.error('API Error fetching CoinMarketCal events:', {
                status: error.response.status,
                data: error.response.data,
            });
        } else {
            console.log(error)
            logger.error('Error fetching economic events:', error.message);
        }
        throw new Error('Could not retrieve economic events.');
    }
}

/**
 * Fetches forex economic calendar events for the next 7 days using the investing-com-api library.
 * @returns {Promise<Array>} A promise that resolves to an array of event objects.
 */
async function getEconomicEvents() {
    const response1 = await investing('currencies/eur-usd');
    const response2 = await investing('currencies/eur-usd', 3600, 24, '1-day');

}


module.exports = {
    getFearAndGreedIndex,
    getEconomicEventsFromCoinMarketCal,
    getEconomicEvents
};
