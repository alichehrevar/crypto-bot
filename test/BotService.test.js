const botService = require('../app/services/BotService');
const Trade = require('../app/models/Trade');
const Bot = require('../app/models/Bot');
const { RSI, MACrossover, MACD } = require('../app/strategies');
const {generateTestData} = require("./testUtils");

jest.mock('../app/models/Trade');
jest.mock('../app/models/Bot');

describe('BotService with multiple strategies', () => {
    let candles;

    beforeEach(() => {
        // generate candles for testing
        candles = generateTestData(40);

        // Mock dependencies properly
        Bot.find.mockResolvedValue([]);
        Trade.countDocuments.mockResolvedValue(0);

        // Mock `executeOrder` to track if it's called
        jest.spyOn(botService, 'executeOrder').mockResolvedValue(undefined); // Mock resolved value if needed
    });

    it('should process signals for multiple strategies (RSI, MA Crossover, MACD)', async () => {
        const botRSI = new Bot({
            name: 'RSI Bot',
            symbol: 'BTC/USDT',
            strategy: 'RSI',
            strategyParams: { period: 14, overbought: 70, oversold: 30 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        const botMACD = new Bot({
            name: 'MACD Bot',
            symbol: 'BTC/USDT',
            strategy: 'MA_Crossover',
            strategyParams: { shortPeriod: 5, longPeriod: 20 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        // Mock the database calls
        Bot.find = jest.fn().mockResolvedValue([botRSI, botMACD]);

        // Register strategies
        botService.addBot(botRSI);
        botService.addBot(botMACD);

        // Mock the signal generation
        const rsiStrategy = new RSI({ period: 14, overbought: 70, oversold: 30 });
        const maCrossoverStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 20 });

        jest.spyOn(rsiStrategy, 'calculateSignal').mockReturnValue('BUY');
        jest.spyOn(maCrossoverStrategy, 'calculateSignal').mockReturnValue('SELL');

        // Mock the execution of orders
        jest.spyOn(botService, 'executeOrder').mockResolvedValue({
            canTrade: false,
            reason: 'Max open trades reached'
        });

        // Simulate the arrival of candles
        await botService.processCandle('BTC/USDT', '1m', candles);

        // Check if the signals for both strategies are processed
        expect(rsiStrategy.calculateSignal).toHaveBeenCalled();
        expect(maCrossoverStrategy.calculateSignal).toHaveBeenCalled();
        expect(botService.executeOrder).toHaveBeenCalledWith(botRSI, 'BUY', candles[candles.length - 1].close);
        expect(botService.executeOrder).toHaveBeenCalledWith(botMACD, 'SELL', candles[candles.length - 1].close);
    });

    it('should block a trade if maxOpenTrades is exceeded', async () => {
        const botRSI = new Bot({
            name: 'RSI Bot',
            symbol: 'BTC/USDT',
            strategy: 'RSI',
            strategyParams: { period: 14, overbought: 70, oversold: 30 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        // Mock the database calls
        Bot.find = jest.fn().mockResolvedValue([botRSI]);

        // Mock the signal generation
        const rsiStrategy = new RSI({ period: 14, overbought: 70, oversold: 30 });
        jest.spyOn(rsiStrategy, 'calculateSignal').mockReturnValue('BUY');

        // Mock the checkRisk function to return maxOpenTrades exceeded
        jest.spyOn(botService, 'checkRisk').mockResolvedValue({
            canTrade: false,
            reason: 'Max open trades reached'
        });

        // Simulate the arrival of candles
        await botService.processCandle('BTC/USDT', '1m', candles);

        // Check if the trade was blocked due to risk
        expect(botService.executeOrder).not.toHaveBeenCalled();
    });
});
