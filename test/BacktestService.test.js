// test/BacktestService.test.js

const BacktestService = require('../app/services/backtestService/BacktestService');
const Candle = require('../app/models/Candle');

let expect;
before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
});

// Helper: Generate dummy candle data with a simple upward trend.
function generateCandles(n, startPrice = 10000) {
    const candles = [];
    let price = startPrice;
    for (let i = 0; i < n; i++) {
        // Increase price slightly to simulate upward movement.
        price = price * (1 + 0.001);
        candles.push({
            close: price,
            timestamp: new Date(Date.now() - (n - i) * 60000) // spaced 1 minute apart
        });
    }
    return candles;
}

describe('BacktestService', function() {
    // Increase timeout in case simulation takes longer.
    this.timeout(10000);

    let originalCandleFind;

    // Before tests, store the original Candle.find
    before(() => {
        originalCandleFind = Candle.find;
    });

    // After tests, restore the original Candle.find
    after(() => {
        Candle.find = originalCandleFind;
    });

    it('should run backtest with default grid optimization', async function() {
        // Set up options for backtesting using RSI indicator.
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
                optimizationMethod: 'grid'  // Use grid optimization
            },
            symbol: 'BTC/USDT',
            timeframe: '1h',
            startDate: new Date(Date.now() - 24 * 60 * 60000), // 24 hours ago
            endDate: new Date(),
            initialBalance: 10000,
            positionSize: 1.0
        };

        // Generate 100 dummy candles.
        const candles = generateCandles(100, 10000);

        // Monkey-patch Candle.find to return our generated candles.
        Candle.find = () => ({
            sort: () => Promise.resolve(candles)
        });

        const summary = await BacktestService.run(options);
        expect(summary).to.have.property('finalBalance');
        expect(summary).to.have.property('trades');
        expect(summary.metrics).to.have.property('totalPnL');
        expect(summary.trades).to.be.an('array');
    });

    it('should run backtest with bayesian optimization', async function() {
        // Set up options for backtesting using MACD indicator.
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
                optimizationMethod: 'bayesian'  // Use Bayesian optimization
            },
            symbol: 'ETH/USDT',
            timeframe: '1h',
            startDate: new Date(Date.now() - 24 * 60 * 60000), // 24 hours ago
            endDate: new Date(),
            initialBalance: 10000,
            positionSize: 1.0
        };

        // Generate 100 dummy candles for ETH/USDT.
        const candles = generateCandles(100, 2000);

        // Monkey-patch Candle.find to return our generated candles.
        Candle.find = () => ({
            sort: () => Promise.resolve(candles)
        });

        const summary = await BacktestService.run(options);
        expect(summary).to.have.property('finalBalance');
        expect(summary).to.have.property('trades');
        expect(summary.metrics).to.have.property('totalPnL');
        expect(summary.trades).to.be.an('array');
    });
});
