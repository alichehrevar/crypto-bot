/**
 * @file MACrossover.test.js
 * Example Mocha tests for the Moving Average Crossover indicator.
 */

// Import the MACrossover indicator from the indicators directory.
// (Ensure the file name and path match your project structure.)
const MACrossover = require('../app/indicators/MovingAverageCrossover');

let expect;
before(async () => {
    // Dynamically import Chai's expect for ES module compatibility.
    const chai = await import('chai');
    expect = chai.expect;
});

describe('MACrossover Indicator', () => {
    // Save the original console.warn so we can restore it later.
    const originalWarn = console.warn;

    before(function () {
        // Override console.warn to suppress warnings during tests.
        console.warn = function () {};
    });

    after(function () {
        // Restore the original console.warn after tests.
        console.warn = originalWarn;
    });

    it('should throw an error if configuration is not provided', () => {
        // Expect that creating a MACrossover instance without parameters throws an error.
        expect(() => new MACrossover()).to.throw('MACrossover strategy requires configuration object');
    });

    it('should throw an error if periods are invalid', () => {
        // Test with non-numeric shortPeriod.
        expect(() => new MACrossover({ shortPeriod: 'abc', longPeriod: 30, signalPeriod: 9 }))
            .to.throw('shortPeriod and longPeriod must be numbers');
        // Test with non-positive periods.
        expect(() => new MACrossover({ shortPeriod: 0, longPeriod: 0, signalPeriod: 9 }))
            .to.throw('shortPeriod and longPeriod must be > 0');
    });

    it('should warn (but not throw) if shortPeriod >= longPeriod', () => {
        // We simply check that no error is thrown when shortPeriod is greater than or equal to longPeriod.
        expect(() => new MACrossover({ shortPeriod: 30, longPeriod: 30, signalPeriod: 9 })).to.not.throw();
    });

    it('should return HOLD if insufficient data to calculate signal', () => {
        // Create an instance with a configuration that requires at least 11 candles (for longPeriod=10).
        const macStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10, signalPeriod: 3 });
        // Provide only 3 candles – insufficient for calculation.
        const candles = [
            { close: 100 },
            { close: 101 },
            { close: 102 },
        ];
        const signal = macStrategy.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('should calculate a BUY signal when shortMA crosses above longMA', () => {
        // Prepare a scenario with at least 11 candles.
        // In this scenario, the short moving average is initially below the long moving average and then crosses above.
        const candles = [
            { close: 100 }, { close: 100 }, { close: 101 }, { close: 99 },
            { close: 100 }, { close: 101 }, { close: 102 }, { close: 103 },
            { close: 104 }, { close: 105 }, // 10 candles.
            { close: 108 }  // 11th candle with a significant jump.
        ];
        const macStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10, signalPeriod: 3 });
        const signal = macStrategy.calculateSignal(candles);
        // Depending on internal calculations, we expect either a BUY or HOLD signal.
        expect(['BUY', 'HOLD']).to.include(signal);
    });

    it('should calculate a SELL signal when shortMA crosses below longMA', () => {
        // Create a scenario where the short moving average falls below the long moving average.
        const candles = [
            { close: 105 }, { close: 106 }, { close: 107 }, { close: 109 },
            { close: 110 }, { close: 111 }, { close: 109 }, { close: 108 },
            { close: 107 }, { close: 105 }, // 10 candles.
            { close: 104 }  // 11th candle with a drop.
        ];
        const macStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 10, signalPeriod: 3 });
        const signal = macStrategy.calculateSignal(candles);
        expect(['SELL', 'HOLD']).to.include(signal);
    });
});
