const axios = require('axios');
const Currency = require('../../app/models/Currency');
const logger = require("../../logs/logger");

async function seedSymbols() {
    const COINS_API = 'https://api.coinpaprika.com/v1/coins';
    const IMAGE_CDN = 'https://static.coinpaprika.com/coin';

    try {
        const { data: coins } = await axios.get(COINS_API);

        const ops = coins
            .map(coin => ({
                updateOne: {
                    filter: { id: coin.id },
                    update: {
                        id:         coin.id,
                        name:       coin.name,
                        symbol:     coin.symbol,
                        rank:       coin.rank,
                        is_new:     coin.is_new,
                        is_active:  coin.is_active,
                        type:       coin.type,
                        imageUrl:   `${IMAGE_CDN}/${coin.id}/logo.png`
                    },
                    upsert: true
                }
            }));

        if (ops.length) {
            await Currency.syncIndexes();
            await Currency.bulkWrite(ops);
            console.log(`✅ Seeded ${ops.length} currencies from CoinPaprika`);
        } else {
            console.log('⚠️ No currencies found to seed.');
        }
    } catch (err) {
        logger.error('❌ Error seeding currencies:', err.message || err);
        console.error('❌ Error seeding currencies:', err.message || err);
    }
}

module.exports = seedSymbols;
