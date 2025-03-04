// test/BacktestServiceBayesianOptimization.test.js

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
 * @param {number} [startPrice=2000] - Starting close price.
 * @returns {Array<Object>} Array of candle objects.
 */
function generateCandles(n, startPrice = 2000) {
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

describe('BacktestService - Bayesian Optimization', function () {
    // Allow extra time for asynchronous operations.
    this.timeout(15000);

    let originalCandleFind;

    before(() => {
        // Save the original Candle.find.
        originalCandleFind = Candle.find;
    });

    after(() => {
        // Restore the original Candle.find.
        Candle.find = originalCandleFind;
    });

    it('should run backtest with Bayesian optimization and return an optimized riskFraction', async function () {
        const options = {
            strategy: 'MACD',
            params: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                riskParams: {
                    positionSizingMethod: 'compound',
                    riskFraction: 0.02,
                    stopLossDistance: 0.02,
                    maxDailyLoss: 5000
                },
                stopLossDistance: 0.02,
                riskRewardRatio: 2,
                optimizationMethod: 'bayesian' // Use Bayesian optimization.
            },
            symbol: 'ETH/USDT',
            timeframe: '1h',
            startDate: new Date(Date.now() - 24 * 60 * 60000), // 24 hours ago.
            endDate: new Date(),
            initialBalance: 10000,
            positionSize: 1.0
        };

        // Generate 100 dummy candles.
        const candles = generateCandles(100, 2000);

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
