// services/currencySeeder.js
const ccxt     = require('ccxt');
const Currency = require('../../models/Currency');

async function seedSymbols() {
    const exchange = new ccxt.binance();
    await exchange.loadMarkets();
    const ops = [];

    for (let market of Object.values(exchange.markets)) {
        // we only want spot USDT/USDC markets, adjust as needed
        if (!market.active || !market.symbol.endsWith('/USDT')) continue;

        ops.push({
            updateOne: {
                filter: { symbol: market.symbol },
                update: {
                    symbol:      market.symbol,
                    baseAsset:   market.base,
                    quoteAsset:  market.quote,
                    precision:   market.precision?.amount ?? 8,
                    lotSize: {
                        min:  market.limits.amount.min,
                        step: market.limits.amount.step
                    },
                    priceFilter: {
                        min:  market.limits.price.min,
                        tick: market.limits.price.step
                    },
                    minNotional: market.limits.cost.min,
                    exchange:    'binance',
                    active:      true
                },
                upsert: true
            }
        });
    }

    if (ops.length) {
        await Currency.bulkWrite(ops);
        console.log(`Seeded ${ops.length} symbols into currencies collection`);
    }
}

module.exports = seedSymbols;
