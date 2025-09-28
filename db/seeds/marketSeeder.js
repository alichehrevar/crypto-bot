// db/seeds/marketSeeder.js

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const MarketSnapshot = require('../../app/models/MarketSnapshot');
const connectDB = require('../../config/db');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log('[Market Seeder] Connected to MongoDB.');

        const marketDataPath = path.join(__dirname, 'market-data.json');
        if (!fs.existsSync(marketDataPath)) {
            throw new Error('market-data.json not found in seeds directory!');
        }

        const marketData = JSON.parse(fs.readFileSync(marketDataPath, 'utf-8'));
        if (marketData.length === 0) {
            console.log('[Market Seeder] No data in seed file. Exiting.');
            return;
        }

        console.log('[Market Seeder] Clearing MarketSnapshot collection...');
        await MarketSnapshot.deleteMany({});
        console.log('[Market Seeder] Collection cleared.');

        console.log(`[Market Seeder] Preparing to insert ${marketData.length} documents...`);

        // Transform data to match your new, expanded schema
        const documentsToInsert = marketData.map(coin => ({
            id:                 coin.id,
            name:               coin.name,
            symbol:             coin.symbol,
            rank:               coin.market_cap_rank,
            type:               coin.asset_platform_id ? 'token' : 'coin',
            circulating_supply: coin.circulating_supply,
            total_supply:       coin.total_supply,
            max_supply:         coin.max_supply,
            ath:                coin.ath,
            ath_change_percentage: coin.ath_change_percentage,
            ath_date:           coin.ath_date,
            atl:                coin.atl,
            atl_change_percentage: coin.atl_change_percentage,
            first_data_at:      coin.atl_date, // Mapping atl_date to first_data_at
            last_updated:       coin.last_updated,
            roi:                coin.roi,
            quotes: {
                USD: {
                    price:                 coin.current_price,
                    high_24h:              coin.high_24h,
                    low_24h:               coin.low_24h,
                    price_change_24h:      coin.price_change_24h,
                    market_cap:            coin.market_cap,
                    market_cap_change_24h: coin.market_cap_change_24h,
                    market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
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

// Run the seeder
seedDatabase();
