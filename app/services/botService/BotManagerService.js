const EventEmitter = require('events');
const BotBase = require('../../models/BotBase'); // We'll use a base model for polymorphism
const DcaOrder = require('../../models/DcaOrder');
const GridStrategyService = require('./GridStrategyService');
const DcaStrategyService = require('./DcaStrategyService');
const logger = require('../../../logs/logger');

/**
 * BotManagerService
 * A singleton service that manages the lifecycle of all active bot instances (Grid, DCA, etc.).
 * It initializes them on startup and routes exchange events to the correct instance.
 */
class BotManagerService {
    constructor() {
        this.activeBots = new Map();
        this.exchangeService = this.getMockExchangeService(); // Using a mock for now
    }

    /**
     * Initializes the manager, loads all active bots from the DB,
     * and subscribes to necessary exchange data streams.
     */
    async initialize() {
        logger.info('BotManagerService initializing...');

        this.exchangeService.on('fill', (fillData) => {
            this.routeFillEvent(fillData);
        });

        const runningBots = await BotBase.find({ status: 'RUNNING' });
        logger.info(`Found ${runningBots.length} running bots to restart.`);

        for (const bot of runningBots) {
            await this.startBotInstance(bot._id.toString());
        }
        logger.info('BotManagerService initialized successfully.');
    }

    /**
     * Stops a bot instance, cleans up, and updates its status in the database.
     * @param {string} botId - The ID of the bot to stop.
     */
    async stopBotInstance(botId) {
        const botInstance = this.activeBots.get(botId);
        if (!botInstance) {
            logger.warn(`Attempted to stop a bot that is not active: ${botId}`);
            await BotBase.updateOne({ _id: botId }, { status: 'DISABLED' });
            return;
        }

        // Assuming strategy services have a stop() method for cleanup
        if (typeof botInstance.stop === 'function') {
            await botInstance.stop();
        }

        this.activeBots.delete(botId);
        await BotBase.updateOne({ _id: botId }, { status: 'DISABLED' });

        logger.info(`Bot instance ${botId} stopped and removed from manager.`);
    }

    /**
     * Routes a fill event from the exchange to the correct bot instance.
     * @param {object} fillData - The fill data from the exchange.
     */
    async routeFillEvent(fillData) {
        // Efficiently find the botId associated with the filled order
        const botId = await this.findBotIdForOrder(fillData.orderId);

        if (botId && this.activeBots.has(botId)) {
            const botInstance = this.activeBots.get(botId);
            logger.info(`Routing fill for order ${fillData.orderId} to bot ${botId}`);

            // Assuming strategy services have a processFill() method
            if(typeof botInstance.processFill === 'function') {
                botInstance.processFill(fillData);
            }
        } else {
            logger.warn({ orderId: fillData.orderId }, 'Could not route fill event to an active bot.');
        }
    }

    /**
     * Starts a managed instance of the correct StrategyService based on botType.
     * @param {string} botId
     */
    async startBotInstance(botId) {
        if (this.activeBots.has(botId)) {
            logger.warn(`Bot instance ${botId} is already running.`);
            return this.activeBots.get(botId);
        }

        try {
            const bot = await BotBase.findById(botId);
            if (!bot) throw new Error('Bot not found');

            let botInstance;

            // Strategy Factory: Instantiate the correct service based on the bot's type
            switch (bot.botType) {
                case 'DcaBot':
                    botInstance = new DcaStrategyService(botId);
                    break;
                case 'GridBot':
                    botInstance = new GridStrategyService(botId, this.exchangeService);
                    break;
                default:
                    throw new Error(`Unknown bot type: ${bot.botType}`);
            }

            await botInstance.initialize();

            // Assuming strategy services have a start() method
            if (typeof botInstance.start === 'function') {
                await botInstance.start();
            } else if (bot.botType === 'DcaBot' && !bot.activeDeal) {
                // For DCA, starting a new deal is the "start" action
                await botInstance.startNewDeal();
            }

            await BotBase.updateOne({ _id: botId }, { status: 'RUNNING' });
            this.activeBots.set(botId, botInstance);
            logger.info(`Successfully started and managing bot instance: ${botId} of type ${bot.botType}`);
            return botInstance;

        } catch (error) {
            logger.error({ botId, error: error.message, stack: error.stack }, `Failed to start bot instance`);
            await BotBase.updateOne({ _id: botId }, { status: 'ERROR' });
        }
    }

    // --- MOCK AND HELPER FUNCTIONS ---

    getMockExchangeService() {
        class MockExchangeService extends EventEmitter {}
        const mockService = new MockExchangeService();

        setInterval(() => {
            const mockFill = {
                tradeId: `trade-${Date.now()}`,
                orderId: 'mock-dca-order-id-456', // A dynamic exchange ID
                symbol: 'BTC/USDT',
                price: 65150,
                quantity: 0.005,
                fee: 0.0325,
                feeCurrency: 'USDT',
                side: 'buy',
                timestamp: Date.now(),
            };
            mockService.emit('fill', mockFill);
        }, 15000);

        return mockService;
    }

    /**
     * Finds which bot an order belongs to by checking our order collections.
     */
    async findBotIdForOrder(exchangeOrderId) {
        // Check DCA orders first
        let order = await DcaOrder.findOne({ exchangeOrderId }).select('botId');

        // If not found, check Grid orders (assuming a GridOrder model exists)
        // if (!order) {
        //     order = await GridOrder.findOne({ exchangeOrderId }).select('botId');
        // }

        if (order) {
            return order.botId.toString();
        }

        // Fallback for mock testing
        if (exchangeOrderId === 'mock-dca-order-id-456' && this.activeBots.size > 0) {
            return this.activeBots.keys().next().value;
        }

        return null;
    }
}

module.exports = new BotManagerService();
