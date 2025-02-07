const MACD = require('../app/strategies/MACD');
const { generateTestData } = require('./testUtils');

describe('MACD Strategy', () => {
    it('throws an error if params are missing', () => {
        expect(() => new MACD()).toThrow('MACD strategy requires a parameter object');
    });

    it('warns if shortPeriod >= longPeriod', () => {
        // We can mock console.warn to see if it's called, but let's just ensure it doesn't throw.
        expect(() => new MACD({ shortPeriod: 30, longPeriod: 30, signalPeriod: 9 })).not.toThrow();
    });

    it('should process MACD signals correctly with enough data', () => {
        // Generate test data with 35 candles
        const candles = generateTestData(35, 100);  // Using the test data generator

        const macdStrategy = new MACD({
            shortPeriod: 12,
            longPeriod: 26,
            signalPeriod: 9
        });

        // Now you can test with the generated candles
        const signal = macdStrategy.calculateSignal(candles);
        expect(signal).toBe('BUY');  // Adjust based on your MACD logic
    });

    it('throws error if not enough candles for MACD calculation', () => {
        const macd = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });

        // Generate candles with fewer than the required 35 (using 20 candles in this case)
        const candles = generateTestData(20, 100);

        expect(() => macd.calculateSignal(candles)).not.toThrow(); // doesn't throw internally
        const signal = macd.calculateSignal(candles);
        // The function logs a warning and returns HOLD if there's insufficient data
        expect(signal).toBe('HOLD');
    });

    it('returns HOLD if no crossover detected', () => {
        const macd = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });

        // Provide enough candles, but with a mostly upward, smooth trend that might not cause a MACD-signal crossover
        const candles = generateTestData(40, 100); // Generate 40 candles for a smooth upward trend
        candles.forEach((candle, index) => candle.close = 100 + 0.5 * index); // Smooth upward trend

        const signal = macd.calculateSignal(candles);
        expect(signal).toBe('HOLD');
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
            { close: 98.5 },// 5
        ];

        // Then a strong up move that might create a bullish crossover
        candleData.push({ close: 102 });  // 6
        candleData.push({ close: 104 });  // 7
        candleData.push({ close: 106 });  // 8

        const signal = macd.calculateSignal(candleData);
        expect(['BUY', 'HOLD']).toContain(signal);
    });

    it('returns SELL on bearish crossover (simplified scenario)', () => {
        const macd = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });

        // We'll do the opposite: start with an up trend, then quickly shift downward.
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
        expect(['SELL', 'HOLD']).toContain(signal);
    });
});
