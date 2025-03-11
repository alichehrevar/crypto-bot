// test/Hurst.test.js

const Hurst = require('../app/metrics/Hurst');
const { generateTestData } = require('./testUtils');

let expect;
before(async () => {
    // Dynamically import Chai for assertions.
    const chai = await import('chai');
    expect = chai.expect;
});

describe('Hurst Indicator', () => {
    it('should return HOLD if insufficient candles are provided', () => {
        // Create an instance of Hurst with some default parameters.
        // Note: The computeHurst method requires at least 20 data points.
        const hurstIndicator = new Hurst({ period: 14, overbought: 70, oversold: 30 });
        // Generate fewer than 20 candles (e.g., 15 candles).
        const candles = generateTestData(15, 100);
        // Our implementation catches the error and returns 'HOLD' if insufficient data.
        const signal = hurstIndicator.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('should return BUY in a trending upward market', () => {
        // Generate 30 candles with steadily increasing close prices.
        let candles = generateTestData(30, 100);
        // Overwrite close prices to simulate an upward trend: 100, 101, 102, ..., 129.
        candles = candles.map((c, i) => ({ ...c, close: 100 + i }));
        const hurstIndicator = new Hurst({ period: 14, overbought: 70, oversold: 30 });
        const signal = hurstIndicator.calculateSignal(candles);
        // In a trending upward market, our logic should return 'BUY'.
        expect(signal).to.equal('BUY');
    });

    it('should return SELL in a trending downward market', () => {
        // Generate 30 candles with steadily decreasing close prices.
        let candles = generateTestData(30, 130);
        // Overwrite close prices to simulate a downward trend: 130, 129, ..., 101.
        candles = candles.map((c, i) => ({ ...c, close: 130 - i }));
        const hurstIndicator = new Hurst({ period: 14, overbought: 70, oversold: 30 });
        const signal = hurstIndicator.calculateSignal(candles);
        // In a trending downward market, our logic should return 'SELL'.
        expect(signal).to.equal('SELL');
    });

    it('should return HOLD when market shows no clear trend', () => {
        // Generate 30 candles with near-constant close prices with slight random fluctuations.
        let candles = generateTestData(30, 100);
        candles = candles.map((c) => ({
            ...c,
            close: 100 + (Math.random() * 0.5 - 0.25) // Fluctuates slightly around 100.
        }));
        const hurstIndicator = new Hurst({ period: 14, overbought: 70, oversold: 30 });
        const signal = hurstIndicator.calculateSignal(candles);
        // With no clear trend, our logic should return 'HOLD'.
        expect(signal).to.equal('HOLD');
    });
});
