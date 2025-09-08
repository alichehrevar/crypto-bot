const schedule = require('node-schedule');
const EconomicEvent = require('../app/models/EconomicEvent');
const { fetchCryptoEvents } = require('../app/services/api/coinGeckoService');
const logger = require('../logs/logger');

/**
 * Fetches events from CoinGecko and upserts them into the database.
 * 'Upsert' means it will update an existing event if found, or insert it if it's new.
 */
const syncCoinGeckoEvents = async () => {
    logger.info('CRON (CoinGecko): Starting event synchronization...');
    try {
        const eventsFromApi = await fetchCryptoEvents();
        if (!eventsFromApi || eventsFromApi.length === 0) {
            logger.info('CRON (CoinGecko): No events returned from the API.');
            return;
        }

        let successCount = 0;
        let failedCount = 0;

        for (const event of eventsFromApi) {
            // We use a combination of title and date to create a unique source ID.
            const sourceId = `coingecko-${event.title.replace(/\s+/g, '-')}-${event.start_date}`;

            const eventData = {
                date: event.start_date,
                time: event.start_date ? '00:00 UTC' : 'N/A', // CoinGecko often lacks specific times
                event: event.title,
                impact: 'Low', // Default impact for crypto events
                forecast: 'N/A',
                actual: 'TBD',
                description: event.description,
                organizer: event.organizer,
                eventType: event.type,
                source: 'CoinGecko',
                sourceId: sourceId,
            };

            try {
                // Find an event by its unique sourceId and update it, or insert if it doesn't exist.
                await EconomicEvent.findOneAndUpdate(
                    { sourceId: eventData.sourceId },
                    { $set: eventData },
                    { upsert: true, new: true, runValidators: true }
                );
                successCount++;
            } catch (upsertError) {
                logger.error(`CRON (CoinGecko): Failed to upsert event "${event.title}"`, { error: upsertError.message });
                failedCount++;
            }
        }
        logger.info(`CRON (CoinGecko): Synchronization complete. Success: ${successCount}, Failed: ${failedCount}.`);

    } catch (error) {
        logger.error('CRON (CoinGecko): A critical error occurred during the sync process.', { error: error.message });
    }
};


/**
 * Starts the recurring scheduler job for fetching CoinGecko events.
 */
const economicEventCron = () => {
    logger.info('CoinGecko event scheduler has been initialized.');

    // Run the scheduler once on startup to populate the DB immediately
    syncCoinGeckoEvents();

    // Schedule the job to run every 4 hours.
    // Cron expression: "at minute 0 past every 4th hour" -> 00:00, 04:00, 08:00, etc.
    schedule.scheduleJob('0 */4 * * *', syncCoinGeckoEvents);
};

module.exports = { economicEventCron };
