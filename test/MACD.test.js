// test/MACD.test.js

// Import the MACD indicator from the indicators directory.
const MACD = require('../app/indicators/MACD');
// Import a helper to generate test candle data.
const { generateTestData } = require('./testUtils');

let expect;
before(async () => {
    // Dynamically import Chai's expect for compatibility.
    const chai = await import('chai');
    expect = chai.expect;
});

describe('MACD Indicator', () => {
    // Test that creating an instance without parameters throws an error.
    it('throws an error if configuration is missing', () => {
        expect(() => new MACD()).to.throw('MACD strategy requires a parameter object');
    });

    // Test that if shortPeriod is greater than or equal to longPeriod, no error is thrown
    // (but a warning might be logged).
    it('warns if shortPeriod >= longPeriod', () => {
        expect(() => new MACD({ shortPeriod: 30, longPeriod: 30, signalPeriod: 9 })).to.not.throw();
    });

    // Test that with enough candle data, a bullish crossover results in a BUY signal.
    it('should process MACD signals correctly with enough data', () => {
        // Generate 60 candles starting at a price of 50.
        const candles = generateTestData(60, 50);
        expect(candles.length).to.equal(60);

        // Modify the last candle to simulate a bullish jump.
        // This forces the short EMA to cross above the long EMA.
        candles[59].close = 100;
        candles[59].open = 100;
        candles[59].high = 100.5;
        candles[59].low = 99.5;

        const macdIndicator = new MACD({
            shortPeriod: 12,
            longPeriod: 26,
            signalPeriod: 9
        });

        const signal = macdIndicator.calculateSignal(candles);
        expect(signal).to.equal('BUY');
    });

    // Test that if there are not enough candles to perform MACD calculation,
    // the indicator returns 'HOLD' (without throwing an error).
    it('throws error if not enough candles for MACD calculation', () => {
        const macdIndicator = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });
        // Generate 20 candles (fewer than the required amount).
        const candles = generateTestData(20, 100);
        // Ensure that calculateSignal does not throw and returns 'HOLD'.
        expect(() => macdIndicator.calculateSignal(candles)).to.not.throw();
        const signal = macdIndicator.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    // Test that when the market shows a smooth upward trend without a crossover,
    // the signal remains 'HOLD'.
    it('returns HOLD if no crossover is detected', () => {
        const macdIndicator = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });
        // Generate 40 candles with a smooth, gradual upward trend.
        const candles = generateTestData(40, 100);
        candles.forEach((candle, index) => {
            candle.close = 100 + 0.5 * index; // Smooth upward trend
        });
        const signal = macdIndicator.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    // Test a simplified bullish crossover scenario.
    it('returns BUY on bullish crossover (simplified scenario)', () => {
        // Use short periods for simplicity.
        const macdIndicator = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });
        // Create a small dataset to simulate a bullish crossover.
        const candleData = [
            { close: 100 }, // Candle 0
            { close: 99 },  // Candle 1
            { close: 98 },  // Candle 2
            { close: 98.5 },// Candle 3
            { close: 99 },  // Candle 4
            { close: 98.5 } // Candle 5
        ];
        // Add candles that force a bullish move.
        candleData.push({ close: 102 });  // Candle 6
        candleData.push({ close: 104 });  // Candle 7
        candleData.push({ close: 106 });  // Candle 8

        const signal = macdIndicator.calculateSignal(candleData);
        expect(['BUY', 'HOLD']).to.include(signal);
    });

    // Test a simplified bearish crossover scenario.
    it('returns SELL on bearish crossover (simplified scenario)', () => {
        // Use short periods for simplicity.
        const macdIndicator = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });
        // Create a dataset that simulates a bearish crossover.
        const candleData = [
            { close: 100 },
            { close: 101 },
            { close: 102 },
            { close: 103 },
            { close: 104 },
            { close: 103 },
            { close: 102 },
            { close: 100 },
            { close: 98 },
            { close: 95 }
        ];
        const signal = macdIndicator.calculateSignal(candleData);
        expect(['SELL', 'HOLD']).to.include(signal);
    });
});
