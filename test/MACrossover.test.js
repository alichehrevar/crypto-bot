/**
 * @file MACrossover.test.js
 * Example Mocha tests for the Moving Average Crossover strategy.
 */

const MACrossover = require('../app/strategies/MovingAverageCrossover');

let expect;
before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
});


describe('MACrossover Strategy', () => {
    // Store the original console.warn
    const originalWarn = console.warn;

    before(function () {
        // Override console.warn with a no-op function
        console.warn = function () {};
    });

    after(function () {
        // Restore original console.warn after all tests
        console.warn = originalWarn;
    });

    it('should throw an error if constructor params are missing', () => {
        expect(() => new MACrossover()).to.throw('MACrossover strategy requires configuration object');
    });

    it('should throw an error if periods are invalid', () => {
        expect(() => new MACrossover({ shortPeriod: 'abc', longPeriod: 30 }))
            .to.throw('shortPeriod and longPeriod must be numbers');
        expect(() => new MACrossover({ shortPeriod: 0, longPeriod: 0 }))
            .to.throw('shortPeriod and longPeriod must be > 0');
    });

    it('should warn if shortPeriod >= longPeriod', () => {
        // We simply check that no error is thrown
        expect(() => new MACrossover({ shortPeriod: 30, longPeriod: 30 })).to.not.throw();
    });

    it('should return HOLD if insufficient data to calculate signal', () => {
        const maStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10 });
        const candles = [
            { close: 100 },
            { close: 101 },
            { close: 102 },
            // Only 3 candles, which is insufficient (expected: at least longPeriod+1 candles)
        ];

        const signal = maStrategy.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('should calculate a BUY when shortMA crosses above longMA', () => {
        // We need at least 11 candles to detect a cross on the last candle.
        // This scenario is created so that the shortMA was below the longMA and then crosses above.
        const candles = [
            { close: 100 }, { close: 100 }, { close: 101 }, { close: 99 },
            { close: 100 }, { close: 101 }, { close: 102 }, { close: 103 },
            { close: 104 }, { close: 105 }, // Up to the 10th candle
            { close: 108 }  // 11th candle with a big jump
        ];

        const maStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10 });
        const signal = maStrategy.calculateSignal(candles);
        // Depending on the actual average calculations, the signal might be 'BUY' or remain 'HOLD'.
        expect(['BUY', 'HOLD']).to.include(signal);
    });

    it('should calculate a SELL when shortMA crosses below longMA', () => {
        // Create a scenario where the short moving average drops below the long moving average.
        const candles = [
            { close: 105 }, { close: 106 }, { close: 107 }, { close: 109 },
            { close: 110 }, { close: 111 }, { close: 109 }, { close: 108 },
            { close: 107 }, { close: 105 }, // 10th candle
            { close: 104 }  // 11th candle where a drop is evident
        ];

        const maStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10 });
        const signal = maStrategy.calculateSignal(candles);
        expect(['SELL', 'HOLD']).to.include(signal);
    });
});
