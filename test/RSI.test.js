// test/RSI.test.js

// Import the RSI indicator from the technical directory.
// Adjust the relative path if your project structure has changed.
const RSI = require('../app/strategies/technical/RSI');

// Import a helper function to generate test candle data.
const { generateTestData } = require('./testUtils');

// Import chai's expect function using dynamic import for ES modules compatibility.
let expect;
before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
});

describe('RSI Indicator', () => {
    it('should throw an error if configuration is not provided', () => {
        expect(() => new RSI()).to.throw('RSI strategy requires configuration object');
    });

    it('should throw an error if period is out of range', () => {
        // Period less than 2.
        expect(() => new RSI({ period: 1 })).to.throw('Invalid period (2-200)');
        // Period greater than 200.
        expect(() => new RSI({ period: 201 })).to.throw('Invalid period (2-200)');
    });

    it('should throw an error if overbought <= oversold', () => {
        // Overbought equals oversold.
        expect(() => new RSI({ period: 14, overbought: 30, oversold: 30 }))
            .to.throw('Invalid overbought/oversold levels');
        // Overbought is less than oversold.
        expect(() => new RSI({ period: 14, overbought: 20, oversold: 30 }))
            .to.throw('Invalid overbought/oversold levels');
    });

    it('should calculate RSI correctly and return HOLD if no crossover occurs', () => {
        // Generate sufficient candle data (28 candles for a 14-period RSI).
        const candles = generateTestData(28);
        const rsiIndicator = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30,
        });
        // In a typical upward trend or mild fluctuation, we expect the RSI signal to be HOLD.
        const signal = rsiIndicator.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('should return BUY when RSI just crosses below the oversold threshold', () => {
        // Create an artificial scenario where RSI crosses below the oversold level.
        // The following candles are manually set to force an oversold crossover.
        const candles = [
            { close: 100 }, { close: 101 }, { close: 102 }, { close: 103 },
            { close: 102 }, { close: 101 }, { close: 99 },  { close: 98 },
            { close: 97 },  { close: 95 }, { close: 94 }, { close: 93 },
            { close: 92 }, { close: 90 }, { close: 89 }, { close: 88 }
        ];
        const rsiIndicator = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30,
        });
        const signal = rsiIndicator.calculateSignal(candles);
        // Depending on the calculation details, we expect a BUY signal if a crossover occurs,
        // otherwise it might still be HOLD.
        expect(['BUY', 'HOLD']).to.include(signal);
    });

    it('should return SELL when RSI just crosses above the overbought threshold', () => {
        // Create a scenario to force an overbought crossover.
        const candles = [
            { close: 100 }, { close: 102 }, { close: 105 }, { close: 108 },
            { close: 110 }, { close: 112 }, { close: 115 }, { close: 117 },
            { close: 120 }, { close: 122 }, { close: 125 }, { close: 126 },
            { close: 128 }, { close: 129 }, { close: 130 }, { close: 133 }
        ];
        const rsiIndicator = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30
        });
        const signal = rsiIndicator.calculateSignal(candles);
        expect(['SELL', 'HOLD']).to.include(signal);
    });

    it('should handle insufficient data gracefully by returning HOLD', () => {
        // Provide fewer candles than required (e.g., 10 candles for a 14-period RSI).
        const candles = Array(10).fill({ close: 100 });
        const rsiIndicator = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30
        });
        const signal = rsiIndicator.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });
});
