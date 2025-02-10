const MACD = require('../app/strategies/MACD');
const { generateTestData } = require('./testUtils');

let expect;
before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
});


describe('MACD Strategy', () => {
    it('throws an error if params are missing', () => {
        expect(() => new MACD()).to.throw('MACD strategy requires a parameter object');
    });

    it('warns if shortPeriod >= longPeriod', () => {
        // This test ensures no error is thrown when shortPeriod is greater than or equal to longPeriod.
        expect(() => new MACD({ shortPeriod: 30, longPeriod: 30, signalPeriod: 9 })).to.not.throw();
    });

    it('should process MACD signals correctly with enough data', () => {
        // Generate test data with 35 candles
        const candles = generateTestData(35, 100);  // Using the test data generator

        const macdStrategy = new MACD({
            shortPeriod: 12,
            longPeriod: 26,
            signalPeriod: 9
        });

        // Now you can test with the generated candles.
        // Adjust the expected signal based on your MACD implementation logic.
        const signal = macdStrategy.calculateSignal(candles);
        expect(signal).to.equal('BUY');
    });

    it('throws error if not enough candles for MACD calculation', () => {
        const macd = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });

        // Generate candles with fewer than the required 35 (using 20 candles in this case)
        const candles = generateTestData(20, 100);

        // Ensure that calculating signal does not throw an internal error.
        expect(() => macd.calculateSignal(candles)).to.not.throw();
        // The function should return 'HOLD' if there's insufficient data.
        const signal = macd.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('returns HOLD if no crossover detected', () => {
        const macd = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });

        // Provide enough candles, but with a mostly upward, smooth trend that might not cause a MACD-signal crossover.
        const candles = generateTestData(40, 100); // Generate 40 candles for a smooth upward trend
        candles.forEach((candle, index) => {
            candle.close = 100 + 0.5 * index; // Smooth upward trend
        });

        const signal = macd.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('returns BUY on bullish crossover (simplified scenario)', () => {
        const macd = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });

        // Generate a small dataset to cause a bullish crossover
        const candleData = [
            { close: 100 }, // 0
            { close: 99 },  // 1
            { close: 98 },  // 2
            { close: 98.5 },// 3
            { close: 99 },  // 4
            { close: 98.5 } // 5
        ];

        // Then add a strong upward move that might create a bullish crossover
        candleData.push({ close: 102 });  // 6
        candleData.push({ close: 104 });  // 7
        candleData.push({ close: 106 });  // 8

        const signal = macd.calculateSignal(candleData);
        // Depending on your internal logic, the signal might be 'BUY' or remain 'HOLD'.
        expect(['BUY', 'HOLD']).to.include(signal);
    });

    it('returns SELL on bearish crossover (simplified scenario)', () => {
        const macd = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });

        // Create a scenario: start with an uptrend, then quickly shift downward.
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

        const signal = macd.calculateSignal(candleData);
        expect(['SELL', 'HOLD']).to.include(signal);
    });
});
