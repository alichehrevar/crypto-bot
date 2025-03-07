const sinon = require('sinon');

// Import the service, models, technical, and test utilities
const botService = require('../app/services/botService/BotService');
const Trade = require('../app/models/Trade');
const Bot = require('../app/models/Bot');
const { RSI, MACrossover, MACD } = require('../app/strategies/technical');
const { generateTestData } = require('./testUtils');

let expect;
before(async () => {
    // Dynamically import Chai to support ES modules
    const chai = await import('chai');
    expect = chai.expect;
});

describe('BotService with multiple technical', function () {
    let sandbox;
    let candles;

    // Create a fresh sandbox and test candles before each test
    beforeEach(function () {
        sandbox = sinon.createSandbox();
        // Generate test candles (assumed to be 40 candles with default close values)
        candles = generateTestData(40);

        // Stub default database calls
        sandbox.stub(Bot, 'find').resolves([]);
        sandbox.stub(Trade, 'countDocuments').resolves(0);

        // Stub executeOrder to track its calls (default resolves undefined)
        sandbox.stub(botService, 'executeOrder').resolves(undefined);
    });

    // Restore all stubs after each test
    afterEach(function () {
        sandbox.restore();
    });

    it('should process signals for multiple technical (RSI, MA Crossover, MACD)', async function () {
        // Create two Bot instances for testing.
        // IMPORTANT: Include the 'timeframe' property so that they match the candle data.
        const botRSI = new Bot({
            name: 'RSI Bot',
            symbol: 'BTC/USDT',
            timeframe: '1m', // added timeframe so processCandle matches the bot
            strategy: 'RSI',
            strategyParams: { period: 14, overbought: 70, oversold: 30 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        const botMACrossover = new Bot({
            name: 'MA Crossover Bot',
            symbol: 'BTC/USDT',
            timeframe: '1m', // added timeframe
            strategy: 'MA_Crossover',
            strategyParams: { shortPeriod: 5, longPeriod: 20 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        // Remove the default stub and set Bot.find to return our test bots
        Bot.find.restore();
        sandbox.stub(Bot, 'find').resolves([botRSI, botMACrossover]);

        // Stub the risk check to allow trading.
        sandbox.stub(botService, 'checkRisk').resolves({ canTrade: true });

        // Force the strategy signals by stubbing their calculateSignal methods
        sandbox.stub(RSI.prototype, 'calculateSignal').returns('BUY');
        sandbox.stub(MACrossover.prototype, 'calculateSignal').returns('SELL');

        // Register bots in the service (assuming addBot is used for this)
        botService.addBot(botRSI);
        botService.addBot(botMACrossover);

        // Re-stub executeOrder (restore the previous stub first)
        botService.executeOrder.restore();
        const executeOrderStub = sandbox
            .stub(botService, 'executeOrder')
            .resolves({ canTrade: false, reason: 'Max open trades reached' });

        // Simulate processing of candles for symbol 'BTC/USDT' with timeframe '1m'
        await botService.processCandle('BTC/USDT', '1m', candles);

        const lastCandleClose = candles[candles.length - 1].close;
        expect(executeOrderStub.calledWith(botRSI, 'BUY', lastCandleClose)).to.be.true;
        expect(executeOrderStub.calledWith(botMACrossover, 'SELL', lastCandleClose)).to.be.true;
    });

    it('should block a trade if maxOpenTrades is exceeded', async function () {
        const botRSI = new Bot({
            name: 'RSI Bot',
            symbol: 'BTC/USDT',
            timeframe: '1m', // include timeframe
            strategy: 'RSI',
            strategyParams: { period: 14, overbought: 70, oversold: 30 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        // Override the Bot.find stub to return our single test bot.
        Bot.find.restore();
        sandbox.stub(Bot, 'find').resolves([botRSI]);

        // Stub the RSI strategy signal so that it returns 'BUY'
        sandbox.stub(RSI.prototype, 'calculateSignal').returns('BUY');

        // Stub checkRisk to simulate the scenario where maxOpenTrades is exceeded.
        sandbox.stub(botService, 'checkRisk').resolves({
            canTrade: false,
            reason: 'Max open trades reached'
        });

        // Process the candle data.
        await botService.processCandle('BTC/USDT', '1m', candles);

        // Verify that executeOrder was never called because the trade was blocked.
        expect(botService.executeOrder.called).to.be.false;
    });
});
