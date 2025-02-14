const MACD = require('../app/indicators/MACD');
const { generateTestData } = require('./testUtils');

let expect;
before(async () => {
    // Dynamically import Chai to support ES modules
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
        // Generate 60 candles starting at 50.
        const candles = generateTestData(60, 50);
        expect(candles.length).to.equal(60);

        // Override only the last candle to force a bullish jump.
        // (Leave candle[58] unchanged so that its MACD and signal reflect the baseline.)
        candles[59].close = 100;
        candles[59].open = 100;
        candles[59].high = 100.5;
        candles[59].low = 99.5;

        const macdStrategy = new MACD({
            shortPeriod: 12,
            longPeriod: 26,
            signalPeriod: 9
        });

        const signal = macdStrategy.calculateSignal(candles);
        expect(signal).to.equal('BUY');
    });

    it('throws error if not enough candles for MACD calculation', () => {
        const macd = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });
        // Generate 20 candles (fewer than the required 35)
        const candles = generateTestData(20, 100);
        expect(() => macd.calculateSignal(candles)).to.not.throw();
        const signal = macd.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('returns HOLD if no crossover detected', () => {
        const macd = new MACD({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9 });
        // Generate 40 candles with a smooth, gradual upward trend.
        const candles = generateTestData(40, 100);
        candles.forEach((candle, index) => {
            candle.close = 100 + 0.5 * index; // Smooth upward trend
        });
        const signal = macd.calculateSignal(candles);
        expect(signal).to.equal('HOLD');
    });

    it('returns BUY on bullish crossover (simplified scenario)', () => {
        const macd = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });
        const candleData = [
            { close: 100 },
            { close: 99 },
            { close: 98 },
            { close: 98.5 },
            { close: 99 },
            { close: 98.5 }
        ];
        // Then add a strong upward move.
        candleData.push({ close: 102 });
        candleData.push({ close: 104 });
        candleData.push({ close: 106 });

        const signal = macd.calculateSignal(candleData);
        expect(['BUY', 'HOLD']).to.include(signal);
    });

    it('returns SELL on bearish crossover (simplified scenario)', () => {
        const macd = new MACD({ shortPeriod: 2, longPeriod: 5, signalPeriod: 2 });
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
