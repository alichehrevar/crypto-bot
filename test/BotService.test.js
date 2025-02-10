const sinon = require('sinon');

// Import the service, models, strategies, and test utilities
const botService = require('../app/services/BotService');
const Trade = require('../app/models/Trade');
const Bot = require('../app/models/Bot');
const { RSI, MACrossover, MACD } = require('../app/strategies');
const { generateTestData } = require('./testUtils');

let expect;
before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
});


describe('BotService with multiple strategies', function() {
    let sandbox;
    let candles;

    // Create a fresh sandbox and test candles before each test
    beforeEach(function() {
        sandbox = sinon.createSandbox();
        candles = generateTestData(40);

        // Stub default database calls
        sandbox.stub(Bot, 'find').resolves([]);
        sandbox.stub(Trade, 'countDocuments').resolves(0);

        // Stub executeOrder to track its calls (default resolves undefined)
        sandbox.stub(botService, 'executeOrder').resolves(undefined);
    });

    // Restore all stubs after each test
    afterEach(function() {
        sandbox.restore();
    });

    it('should process signals for multiple strategies (RSI, MA Crossover, MACD)', async function() {
        // Create two Bot instances for testing
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

        // Override the Bot.find stub to return our test bots
        Bot.find.restore(); // Remove the stub created in beforeEach
        sandbox.stub(Bot, 'find').resolves([botRSI, botMACD]);

        // Register bots in the service (assume addBot is used for this purpose)
        botService.addBot(botRSI);
        botService.addBot(botMACD);

        // Create strategy instances and stub their signal generation
        const rsiStrategy = new RSI({ period: 14, overbought: 70, oversold: 30 });
        const maCrossoverStrategy = new MACrossover({ shortPeriod: 5, longPeriod: 20 });

        const rsiSignalStub = sandbox.stub(rsiStrategy, 'calculateSignal').returns('BUY');
        const maCrossoverSignalStub = sandbox.stub(maCrossoverStrategy, 'calculateSignal').returns('SELL');

        // Re-stub executeOrder with a custom resolved value (if needed)
        botService.executeOrder.restore();
        const executeOrderStub = sandbox
            .stub(botService, 'executeOrder')
            .resolves({ canTrade: false, reason: 'Max open trades reached' });

        // Simulate processing of candles
        await botService.processCandle('BTC/USDT', '1m', candles);

        // Verify that the calculateSignal methods were called
        expect(rsiSignalStub.called).to.be.true;
        expect(maCrossoverSignalStub.called).to.be.true;

        // Verify that executeOrder was called with the expected parameters
        const lastCandleClose = candles[candles.length - 1].close;
        expect(executeOrderStub.calledWith(botRSI, 'BUY', lastCandleClose)).to.be.true;
        expect(executeOrderStub.calledWith(botMACD, 'SELL', lastCandleClose)).to.be.true;
    });

    it('should block a trade if maxOpenTrades is exceeded', async function() {
        const botRSI = new Bot({
            name: 'RSI Bot',
            symbol: 'BTC/USDT',
            strategy: 'RSI',
            strategyParams: { period: 14, overbought: 70, oversold: 30 },
            riskParams: { maxOpenTrades: 1 },
            active: true
        });

        // Override the Bot.find stub to return our single test bot
        Bot.find.restore();
        sandbox.stub(Bot, 'find').resolves([botRSI]);

        // Create a strategy instance and stub its signal generation
        const rsiStrategy = new RSI({ period: 14, overbought: 70, oversold: 30 });
        const rsiSignalStub = sandbox.stub(rsiStrategy, 'calculateSignal').returns('BUY');

        // Stub checkRisk to simulate the scenario where maxOpenTrades is exceeded
        sandbox.stub(botService, 'checkRisk').resolves({
            canTrade: false,
            reason: 'Max open trades reached'
        });

        // Process the candle data
        await botService.processCandle('BTC/USDT', '1m', candles);

        // Verify that executeOrder was never called because the trade was blocked
        expect(botService.executeOrder.called).to.be.false;
    });
});
