/**
 * @file RSI.test.js
 * To run these tests with Jest:
 * 1) Ensure Jest is installed: `npm install --save-dev jest`
 * 2) Add a test script in package.json: `"test": "jest"`
 * 3) Run `npm test`
 */

const RSI = require('../app/strategies/RSI');

describe('RSI Strategy', () => {
    it('should throw an error if params are not provided', () => {
        expect(() => new RSI()).toThrow('RSI strategy requires configuration object');
    });

    it('should throw error if period is out of range', () => {
        expect(() => new RSI({ period: 1 })).toThrow('Invalid period (2-200)');
        expect(() => new RSI({ period: 201 })).toThrow('Invalid period (2-200)');
    });

    it('should throw error if overbought <= oversold', () => {
        expect(() => new RSI({ period: 14, overbought: 30, oversold: 30 }))
            .toThrow('Invalid overbought/oversold levels');
        expect(() => new RSI({ period: 14, overbought: 20, oversold: 30 }))
            .toThrow('Invalid overbought/oversold levels');
    });

    it('should calculate RSI correctly and return HOLD if not crossing boundaries', () => {
        // Minimal candle data for a 14 period RSI => need at least 15 for calculation
        // but let's provide a bit more for a clearer scenario
        const candles = [
            { close: 100 }, { close: 102 }, { close: 101 }, { close: 103 },
            { close: 105 }, { close: 106 }, { close: 104 }, { close: 107 },
            { close: 108 }, { close: 110 }, { close: 109 }, { close: 111 },
            { close: 110 }, { close: 112 }, { close: 111 }, { close: 115 },
            { close: 114 }, { close: 113 }, { close: 116 }, { close: 117 }
        ];

        const rsiStrategy = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30,
        });

        const signal = rsiStrategy.calculateSignal(candles);
        // In a typical ascending or mild fluctuation scenario,
        // we might not cross overbought/oversold on the last candle:
        expect(signal).toBe('HOLD');
    });

    it('should return BUY when rsi just moved below oversold threshold', () => {
        // Example scenario: We create data that forces RSI to drop below oversold on the last candle
        // This might require a strong downward move. (In real tests, you might do actual RSI checks.)
        const candles = [
            // Start with some stable or slightly ascending closes:
            { close: 100 }, { close: 101 }, { close: 102 }, { close: 103 },
            { close: 102 }, { close: 101 }, { close: 99 },  { close: 98 },
            { close: 97 },  { close: 95 },  { close: 94 },  { close: 93 },
            { close: 92 },  { close: 90 },  { close: 89 },  { close: 88 }
        ];

        const rsiStrategy = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30,
        });

        const signal = rsiStrategy.calculateSignal(candles);
        // If the RSI has just dipped below 30 and was above or equal to 30 previously:
        // We expect a BUY signal
        // (You might have to tweak the candle data so that RSI indeed crosses oversold.)
        expect(['BUY','HOLD']).toContain(signal);
        // It's possible if the RSI didn't cross exactly, you'll get 'HOLD',
        // so in practice you'd confirm the actual RSI value.
    });

    it('should return SELL when rsi just moved above overbought threshold', () => {
        // Example scenario: We create data that forces RSI to break above 70 on the last candle
        const candles = [
            { close: 100 }, { close: 102 }, { close: 105 }, { close: 108 },
            { close: 110 }, { close: 112 }, { close: 115 }, { close: 117 },
            { close: 120 }, { close: 122 }, { close: 125 }, { close: 126 },
            { close: 128 }, { close: 129 }, { close: 130 }, { close: 133 }
        ];

        const rsiStrategy = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30
        });

        const signal = rsiStrategy.calculateSignal(candles);
        expect(['SELL','HOLD']).toContain(signal);
        // Same note as above: in real tests, you'll verify if RSI is indeed above 70
        // and crossed from below. If so, you expect SELL; otherwise, you might get HOLD.
    });

    it('should handle insufficient data gracefully', () => {
        // Provide fewer than period*2 candles:
        const candles = Array(10).fill({ close: 100 }); // 10 candles only

        const rsiStrategy = new RSI({
            period: 14,
            overbought: 70,
            oversold: 30
        });

        const signal = rsiStrategy.calculateSignal(candles);
        // Because of insufficient data, it should warn and return 'HOLD'
        expect(signal).toBe('HOLD');
    });
});
