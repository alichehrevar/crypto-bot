// test/botModel.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const chai = require('chai');
const expect = chai.expect;

// Import the Bot model (adjust the path according to your project structure)
const Bot = require('../app/models/Bot');

describe('Bot Model Test', function () {
    let mongoServer;

    // Increase timeout for setting up in-memory MongoDB
    this.timeout(10000);

    // Connect to in-memory MongoDB before running tests
    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    // Disconnect and stop in-memory MongoDB after tests complete
    after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    // Clear Bot collection before each test to ensure isolation
    beforeEach(async () => {
        await Bot.deleteMany({});
    });

    it('should create and save a bot successfully', async () => {
        // Create a valid Bot instance with all required fields and nested objects
        const validBot = new Bot({
            name: 'Test Bot',
            symbol: 'BTC/USDT',
            timeframe: '1h',
            strategy: 'RSI',
            strategyParams: { /* Optional parameters, leave empty or set values if needed */ },
            riskParams: {
                maxDrawdown: 10,
                dailyLossLimit: 100,
                positionSizeType: 'percentage',
                positionSizeValue: 5,
                maxOpenTrades: 3,
            },
            marketInfo: {
                state: 'active',
                baseFund: 5000,
                tradeFund: 5000,
            },
            tradeInfo: {
                takeProfit: 2,
                stopLoss: 1,
                leverage: 10,
                side: 'buy',
                positionSide: 'long',
                winProbability: 0.7,
                payoffRatio: 2,
                lastTradeOutcome: 'win',
                positionSizingMethod: 'compound',
                tradingStrategy: 'optimized',
                optimizationMethod: 'bayesian',
                minimumTrade: 100,
                minimumWinRatio: 0.5,
                minimumAccuracy: 0.6,
                configId: 'config123',
                signalProcessingMethod: 'consensus',
            },
            userId: new mongoose.Types.ObjectId(),
            botType: 'hedge',
            fundMode: 'isolated',
            userLevel: 2,
            active: true,
            mode: 'live',
            paperBalance: 15000,
        });

        // Save the Bot instance and assert that it has been saved correctly
        const savedBot = await validBot.save();
        expect(savedBot._id).to.exist;
        expect(savedBot.createdAt).to.exist;
        expect(savedBot.updatedAt).to.exist;
        expect(savedBot.name).to.equal('Test Bot');
        expect(savedBot.symbol).to.equal('BTC/USDT');
        expect(savedBot.tradeInfo.takeProfit).to.equal(2);
        expect(savedBot.tradeInfo.stopLoss).to.equal(1);
    });

    it('should throw a validation error if required fields are missing', async () => {
        // Create a Bot instance missing required fields: name, symbol, timeframe, and strategy
        const botWithoutRequiredFields = new Bot({
            tradeInfo: {
                takeProfit: 2,
                stopLoss: 1,
                leverage: 10,
                side: 'buy',
                positionSide: 'long',
                winProbability: 0.7,
                payoffRatio: 2,
                lastTradeOutcome: 'win',
                positionSizingMethod: 'compound',
                tradingStrategy: 'optimized',
                optimizationMethod: 'bayesian',
                minimumTrade: 100,
                minimumWinRatio: 0.5,
                minimumAccuracy: 0.6,
                configId: 'config123',
                signalProcessingMethod: 'consensus',
            },
        });

        let err;
        try {
            await botWithoutRequiredFields.save();
        } catch (error) {
            err = error;
        }
        // Assert that validation errors exist for the required fields
        expect(err).to.exist;
        expect(err.errors.name).to.exist;
        expect(err.errors.symbol).to.exist;
        expect(err.errors.timeframe).to.exist;
        expect(err.errors.strategy).to.exist;
    });

    it('should validate the symbol format correctly', async () => {
        // Create a Bot instance with an invalid symbol format (should be BASE/QUOTE)
        const botWithInvalidSymbol = new Bot({
            name: 'Invalid Bot',
            symbol: 'BTC-USD', // Incorrect format; valid format: BTC/USDT
            timeframe: '1h',
            strategy: 'RSI',
        });

        let err;
        try {
            // Use .validate() to run validations without saving to the database
            await botWithInvalidSymbol.validate();
        } catch (error) {
            err = error;
        }
        // Assert that a validation error is thrown for the symbol field
        expect(err).to.exist;
        expect(err.errors.symbol).to.exist;
        expect(err.errors.symbol.message).to.equal('Use format: BASE/QUOTE (e.g. BTC/USDT)');
    });
});
