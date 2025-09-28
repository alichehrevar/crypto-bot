// db/seeds/marketSeeder.js

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const MarketSnapshot = require('../../app/models/MarketSnapshot');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const marketData = JSON.parse(fs.readFileSync(path.join(__dirname, 'market-data.json'), 'utf-8'));

const seedMarketDataFromFile = async () => {
    console.log('[Market Seeder] Connected to MongoDB.');

    try {
        console.log('[Market Seeder] Clearing existing data from MarketSnapshot collection...');
        await MarketSnapshot.deleteMany({});
        console.log('[Market Seeder] Collection cleared.');

        if (marketData.length === 0) {
            console.log('[Market Seeder] No data found in seed file. Exiting.');
            return;
        }

        console.log(`[Market Seeder] Preparing to insert ${marketData.length} documents...`);

        // Transform data to match your schema
        const documentsToInsert = marketData.map(coin => ({
            id:                 coin.id,
            name:               coin.name,
            symbol:             coin.symbol,
            rank:               coin.market_cap_rank,
            type:               coin.asset_platform_id ? 'token' : 'coin',
            circulating_supply: coin.circulating_supply,
            total_supply:       coin.total_supply,
            max_supply:         coin.max_supply,
            first_data_at:      coin.atl_date,
            last_updated:       coin.last_updated,
            quotes: {
                USD: {
                    price:                 coin.current_price,
                    market_cap:            coin.market_cap,
                    fully_diluted_valuation: coin.fully_diluted_valuation,
                    total_volume:          coin.total_volume,
                    percent_change_1h:     coin.price_change_percentage_1h_in_currency,
                    percent_change_24h:    coin.price_change_percentage_24h_in_currency,
                    percent_change_7d:     coin.price_change_percentage_7d_in_currency,
                }
            },
            imageUrl:           coin.image
        }));

        await MarketSnapshot.insertMany(documentsToInsert, { ordered: false });

        console.log(`[Market Seeder] ✅ Database seeded successfully with ${documentsToInsert.length} documents!`);

    } catch (error) {
        console.error('[Market Seeder] ❌ Error during database seeding:', error);
    } finally {
        await mongoose.disconnect();
        console.log('[Market Seeder] Disconnected from MongoDB.');
    }
};

module.exports = { seedMarketDataFromFile };
