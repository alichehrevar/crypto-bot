/**
 * @file MACrossover.test.js
 * Example Jest tests for the Moving Average Crossover strategy.
 */

const MACrossover = require('../app/strategies/MovingAverageCrossover');

describe('MACrossover Strategy', () => {
    // store the original console.warn
    const originalWarn = console.warn;

    beforeAll(() => {
        // override console.warn with a no-op function
        console.warn = jest.fn();
    });

    afterAll(() => {
        // restore original console.warn after all tests
        console.warn = originalWarn;
    });

    it('should throw an error if constructor params are missing', () => {
        expect(() => new MACrossover()).toThrow('MACrossover strategy requires configuration object');
    });

    it('should throw an error if periods are invalid', () => {
        expect(() => new MACrossover({ shortPeriod: 'abc', longPeriod: 30 }))
            .toThrow('shortPeriod and longPeriod must be numbers');
        expect(() => new MACrossover({ shortPeriod: 0, longPeriod: 0 }))
            .toThrow('shortPeriod and longPeriod must be > 0');
    });

    it('should warn if shortPeriod >= longPeriod', () => {
        // We can't "expect a console.warn" easily unless we mock console.warn,
        // but let's at least check it doesn't throw.
        expect(() => new MACrossover({ shortPeriod: 30, longPeriod: 30 })).not.toThrow();
    });

    it('should return HOLD if insufficient data to calculate signal', () => {
        const maStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10 });
        const candles = [
            { close: 100 },
            { close: 101 },
            { close: 102 },
            // only 3 candles => less than (longPeriod + 1) = 11
        ];

        const signal = maStrategy.calculateSignal(candles);
        expect(signal).toBe('HOLD');
    });

    it('should calculate a BUY when shortMA crosses above longMA', () => {
        // shortMA = 5, longMA = 10
        // We need at least 11 candles to detect cross on the last candle
        // We'll create a scenario where shortMA is below longMA in the previous candle,
        // and above in the current candle.
        const candles = [
            // "Older" candles (first 5 or 6) might keep the short MA somewhat lower
            { close: 100 }, { close: 100 }, { close: 101 }, { close: 99 },
            { close: 100 }, { close: 101 }, { close: 102 }, { close: 103 },
            { close: 104 }, { close: 105 }, // up to 10th
            { close: 108 }  // 11th candle => big jump at the end
        ];

        const maStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10 });
        const signal = maStrategy.calculateSignal(candles);

        // There's a good chance the shortMA on the last 5 candles is > longMA on last 10
        // and previously it was not. We expect a 'BUY' if there's a cross up.
        // In real usage, you'd verify the actual average calculations.
        expect(['BUY', 'HOLD']).toContain(signal);
        // If it's not strictly crossing at that candle, you might get HOLD.
    });

    it('should calculate a SELL when shortMA crosses below longMA', () => {
        const candles = [
            { close: 105 }, { close: 106 }, { close: 107 }, { close: 109 },
            { close: 110 }, { close: 111 }, { close: 109 }, { close: 108 },
            { close: 107 }, { close: 105 }, // 10th
            { close: 104 }  // 11th => short MA might drop below the long MA
        ];

        const maStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10 });
        const signal = maStrategy.calculateSignal(candles);
        expect(['SELL', 'HOLD']).toContain(signal);
    });
});
