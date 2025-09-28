const schedule = require('node-schedule');
const EconomicEvent = require('../app/models/EconomicEvent');
const { fetchCryptoEventsFromCMC } = require('../app/services/api/coinGeckoService');
const logger = require('../logs/logger');

/**
 * Fetches events from CoinGecko and upserts them into the database.
 * 'Upsert' means it will update an existing event if found, or insert it if it's new.
 */
const syncCoinGeckoEvents = async () => {
    // CHANGED: Updated log context
    logger.info('CRON (CoinMarketCal): Starting event synchronization...');
    try {
        // FIXED: Renamed function call to reflect its purpose
        const eventsFromApi = await fetchCryptoEventsFromCMC();

        if (!eventsFromApi || eventsFromApi.length === 0) {
            logger.info('CRON (CoinMarketCal): No new events returned from the API.');
            return;
        }

        let successCount = 0;
        let failedCount = 0;

        for (const event of eventsFromApi) {
            // FIXED: Use the formatted 'event' and 'date' fields for the ID
            const sourceId = `coinmarketcal-${event.event.replace(/\s+/g, '-')}-${event.date}`;

            // This object now maps the fields from the formatted API response
            const eventData = {
                date: event.date,
                time: event.time,
                event: event.event, // FIXED: Use 'event.event' from formatted object
                impact: event.impact, // FIXED: Use dynamic impact from service
                forecast: event.forecast,
                actual: event.actual,
                source: 'CoinMarketCal', // CHANGED: Correct source name
                sourceId: sourceId,
                source_link: event.source_link, // NEW: Storing the source link
            };

            try {
                // Upsert logic remains the same, it's solid
                await EconomicEvent.findOneAndUpdate(
                    { sourceId: eventData.sourceId },
                    { $set: eventData },
                    { upsert: true, new: true, runValidators: true }
                );
                successCount++;
            } catch (upsertError) {
                logger.error(`CRON (CoinMarketCal): Failed to upsert event "${event.event}"`, { error: upsertError.message });
                failedCount++;
            }
        }
        logger.info(`CRON (CoinMarketCal): Synchronization complete. Success: ${successCount}, Failed: ${failedCount}.`);

    } catch (error) {
        // The detailed error logging you added is great
        logger.error('CRON (CoinMarketCal): A critical error occurred during the sync process.', {
            errorMessage: error.message,
            errorStack: error.stack,
        });
    }
};

/**
 * Starts the recurring scheduler job for fetching CoinGecko events.
 */
const economicEventCron = async () => {
    logger.info('CoinGecko event scheduler has been initialized.');

    // Run the scheduler once on startup to populate the DB immediately
    await syncCoinGeckoEvents();

    // Schedule the job to run every 4 hours.
    // Cron expression: "at minute 0 past every 4th hour" -> 00:00, 04:00, 08:00, etc.
    schedule.scheduleJob('0 */4 * * *', syncCoinGeckoEvents);
};

module.exports = { economicEventCron };
