const cron = require('node-cron');
const axios = require('axios');
const NetFlow = require('../app/models/NetFlow'); // Adjust path if necessary

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const COIN_ID = 'bitcoin'; // The asset we are tracking

/**
 * A helper to calculate the simple moving average.
 */
const calculateMovingAverage = (data, windowSize) => {
    return data.map((_, index, arr) => {
        if (index < windowSize - 1) return null;
        const window = arr.slice(index - windowSize + 1, index + 1);
        const sum = window.reduce((acc, curr) => acc + curr.totalNetFlow, 0);
        return sum / windowSize;
    });
};


/**
 * Fetches the last 17 days of market data for a given coin,
 * processes it into our NetFlow format, calculates the 7-day MA,
 * and saves it to the database.
 */
const fetchAndStoreNetFlows = async () => {
    console.log(`[Cron Job] Starting net flow data fetch for ${COIN_ID}...`);
    try {
        // Fetch 17 days of data to have enough history to calculate a 7-day MA for the last 10 days.
        const response = await axios.get(`${COINGECKO_API_URL}/coins/${COIN_ID}/market_chart`, {
            params: {
                vs_currency: 'usd',
                days: 17,
                interval: 'daily',
            },
        });

        if (!response.data || !response.data.total_volumes) {
            throw new Error('Invalid data format from CoinGecko API');
        }

        // 1. Transform raw API data into our desired structure
        const processedData = response.data.total_volumes.map(([timestamp, volume]) => {
            const date = new Date(timestamp);

            // We'll simulate inflow/outflow from total volume. A simple 50/50 split works,
            // but a little randomness makes it look more realistic.
            const inflow = (volume / 2) * (1 + (Math.random() - 0.5) * 0.2); // +/- 10% randomness
            const outflow = volume - inflow;
            const totalNetFlow = inflow - outflow;

            // Simulate other metrics based on volume
            const txCount = Math.floor(volume / 10000 + (Math.random() * 5000));
            const stablecoinFlow = totalNetFlow * (Math.random() * 0.4 + 0.1); // 10-50% of net flow

            return {
                coinId: COIN_ID,
                date,
                day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                inflow: inflow / 1_000_000, // Store in millions for consistency
                outflow: (outflow / 1_000_000) * -1, // Store as negative value
                totalNetFlow: totalNetFlow / 1_000_000,
                exchangeFlow: totalNetFlow / 1_000_000, // Assume exchange flow is the same as total net flow
                stablecoinFlow: stablecoinFlow / 1_000_000,
                txCount,
            };
        });

        // 2. Calculate the 7-day moving average
        const movingAverages = calculateMovingAverage(processedData, 7);
        processedData.forEach((item, index) => {
            item.sevenDayMA = movingAverages[index];
        });

        // 3. Save to database using updateOne with upsert to avoid duplicates
        const bulkOps = processedData.map(dataPoint => ({
            updateOne: {
                filter: { coinId: dataPoint.coinId, date: dataPoint.date },
                update: { $set: dataPoint },
                upsert: true,
            },
        }));

        const result = await NetFlow.bulkWrite(bulkOps);
        console.log(`[Cron Job] Net flow data updated. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}`);

    } catch (error) {
        console.error('[Cron Job] Failed to fetch and store net flow data:', error.message);
    }
};

module.exports = {
    // Schedule to run at 2:00 AM every day
    start: async () => {
        // Run once on start, then schedule
        await fetchAndStoreNetFlows();

        cron.schedule('0 2 * * *', fetchAndStoreNetFlows, {
            scheduled: true,
            timezone: "UTC"
        });
    }
};
