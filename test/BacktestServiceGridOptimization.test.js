// test/BacktestServiceGridOptimization.test.js

const BacktestService = require('../app/services/backtestService/BacktestService');
const Candle = require('../app/models/Candle');

let expect;
before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
});

/**
 * generateCandles
 *
 * Generates dummy candle data with a slight upward trend.
 *
 * @param {number} n - Number of candles to generate.
 * @param {number} [startPrice=10000] - Starting close price.
 * @returns {Array<Object>} Array of candle objects.
 */
function generateCandles(n, startPrice = 10000) {
    const candles = [];
    let price = startPrice;
    for (let i = 0; i < n; i++) {
        // Increase price by 0.1% per candle.
        price = price * 1.001;
        candles.push({
            close: price,
            timestamp: new Date(Date.now() - (n - i) * 60000) // each candle 1 minute apart
        });
    }
    return candles;
}

describe('BacktestService - Grid Optimization', function () {
    // Allow extra time for asynchronous operations.
    this.timeout(15000);

    let originalCandleFind;

    before(() => {
        // Store original Candle.find.
        originalCandleFind = Candle.find;
    });

    after(() => {
        // Restore original Candle.find.
        Candle.find = originalCandleFind;
    });

    it('should run backtest with default grid optimization and return an optimized riskFraction', async function () {
        const options = {
            strategy: 'RSI',
            params: {
                period: 14,
                riskParams: {
                    positionSizingMethod: 'compound',
                    riskFraction: 0.02,
                    stopLossDistance: 0.02,
                    maxDailyLoss: 5000
                },
                stopLossDistance: 0.02,
                riskRewardRatio: 2,
                optimizationMethod: 'grid' // Use grid optimization.
            },
            symbol: 'BTC/USDT',
            timeframe: '1h',
            startDate: new Date(Date.now() - 24 * 60 * 60000), // 24 hours ago.
            endDate: new Date(),
            initialBalance: 10000,
            positionSize: 1.0
        };

        // Generate 100 dummy candles.
        const candles = generateCandles(100, 10000);

        // Monkey-patch Candle.find to return our dummy candles.
        Candle.find = () => ({
            sort: () => Promise.resolve(candles)
        });

        const summary = await BacktestService.run(options);
        expect(summary).to.have.property('optimizedParams');
        expect(summary.optimizedParams).to.have.property('riskFraction');
        expect(summary.optimizedParams.riskFraction).to.be.a('number');
        expect(summary.optimizedParams.riskFraction).to.be.within(0.01, 0.05);
    });
});
