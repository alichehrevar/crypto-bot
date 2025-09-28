const fs = require('fs');
const path = require('path');
require('dotenv').config();
const delay = require('../utils/delay');

/**
 * A resilient fetch wrapper that handles 429 rate-limiting errors automatically.
 * @param {string} url The URL to fetch.
 * @param {number} maxRetries The maximum number of times to retry.
 * @returns {Promise<Response>} The fetch response.
 */
async function fetchWithRetries(url, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(url);

        if (response.ok) {
            return response; // Success!
        }

        if (response.status === 429) {
            // CoinGecko provides Retry-After in seconds in the response body, not headers.
            const errorBody = await response.json();
            const retryAfter = errorBody.status?.error_message?.match(/Wait (\d+) seconds/)?.[1] || '30';
            const waitMs = parseInt(retryAfter, 10) * 1000 + 1000; // Add 1s buffer

            console.warn(`[API] Rate limit hit. Waiting for ${waitMs / 1000} seconds before retrying...`);
            await delay(waitMs);
            continue; // Retry the loop
        }

        // For other non-ok statuses, throw an error.
        throw new Error(`API call failed with status: ${response.status} ${await response.text()}`);
    }
    throw new Error(`API call failed after ${maxRetries} retries.`);
}


async function createSeedFile() {
    console.log('[Seed Generator] Starting...');
    const COINGECKO_API_BASE = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const API_DELAY = 2000; // A short, polite 2-second delay between successful calls.
    const perPage = 250;

    const tempFilePath = path.join(__dirname, '..', 'db', 'seeds', 'market-data.temp.json');
    const finalFilePath = path.join(__dirname, '..', 'db', 'seeds', 'market-data.json');

    let allCoins = [];
    let startPage = 1;

    if (fs.existsSync(tempFilePath)) {
        console.log('[Seed Generator] Resuming from temporary file...');
        const tempData = fs.readFileSync(tempFilePath, 'utf-8');
        const loadedCoins = JSON.parse(tempData);

        // **IMPROVEMENT 1: De-duplicate loaded data to be safe.**
        allCoins = [...new Map(loadedCoins.map(c => [c.id, c])).values()];

        startPage = Math.floor(allCoins.length / perPage) + 1;
        console.log(`[Seed Generator] Resuming from page ${startPage}. Already have ${allCoins.length} unique coins.`);
    }

    let currentPage = startPage;

    try {
        while (true) {
            // Only apply the polite delay if it's not the very first fetch of this run.
            if (currentPage > startPage) {
                await delay(API_DELAY);
            }
            console.log(`[Seed Generator] Fetching page ${currentPage}...`);
            const url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${currentPage}&sparkline=false&price_change_percentage=1h%2C24h%2C7d`;

            // **IMPROVEMENT 2: Use the resilient fetch function.**
            const marketRes = await fetchWithRetries(url);

            const marketData = await marketRes.json();
            if (marketData.length === 0) {
                console.log('[Seed Generator] Received empty array from API. Fetch is complete.');
                break;
            }

            console.log(`[Seed Generator] Fetched ${marketData.length} coins from page ${currentPage}.`);

            // **IMPROVEMENT 1 (cont.): Combine and de-duplicate the array.**
            const combined = [...allCoins, ...marketData];
            allCoins = [...new Map(combined.map(c => [c.id, c])).values()];

            fs.writeFileSync(tempFilePath, JSON.stringify(allCoins, null, 2));
            console.log(`[Seed Generator] Progress saved. Total unique coins: ${allCoins.length}`);

            currentPage++;
        }

        console.log(`[Seed Generator] ✅ Success! Total unique entries: ${allCoins.length}.`);
        fs.renameSync(tempFilePath, finalFilePath);
        console.log(`[Seed Generator] Final file created at: ${finalFilePath}`);

    } catch (error) {
        console.error('[Seed Generator] ❌ An error occurred. Run the script again to resume.', error.message);
    }
}

createSeedFile();
