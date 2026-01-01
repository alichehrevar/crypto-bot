const EventEmitter = require('events');
const BotBase = require('../../models/BotBase'); // We'll use a base model for polymorphism
const exchangeService = require('./ExchangeService'); // <--- Change this
const Order = require('../../models/Order');
const DcaBot  = require('../../models/DcaBot');
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
        this.exchangeService = exchangeService;
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
            let bot = await BotBase.findById(botId);
            if (!bot) {
                bot = await DcaBot.findById(botId); // fallback if DCA bots are stored separately
            }
            if (!bot) throw new Error('Bot not found');

            const StatusModel = bot.constructor.modelName === 'DcaBot' ? DcaBot : BotBase;

            let botInstance;

            // Strategy Factory: Instantiate the correct service based on the bot's type
            switch (bot.botType) {
                case 'dca':
                    botInstance = new DcaStrategyService(botId);
                    break;
                case 'grid':
                    botInstance = new GridStrategyService(botId, this.exchangeService);
                    break;
                default:
                    throw new Error(`Unknown bot type: ${bot.botType}`);
            }

            await botInstance.initialize();

            // Assuming strategy services have a start() method
            if (typeof botInstance.start === 'function') {
                await botInstance.start();
            } else if (bot.botType === 'dca' && !bot.activeDeal) {
                // For DCA, starting a new deal is the "start" action
                await botInstance.startNewDeal();
            }

            await StatusModel.updateOne({ _id: botId }, { status: 'RUNNING' });
            this.activeBots.set(botId, botInstance);
            logger.info(`Successfully started and managing bot instance: ${botId} of type ${bot.botType}`);
            return botInstance;

        } catch (error) {
            // FIX: Log the FULL error message and stack trace
            logger.error(`Failed to start bot ${botId}: ${error.message}`, { stack: error.stack });
            console.error(`❌ CRITICAL FAILURE starting bot ${botId}:`, error);

            await BotBase.updateOne({ _id: botId }, { status: 'ERROR' });
            // Also try updating DcaBot collection if it's separate
            await DcaBot.updateOne({ _id: botId }, { status: 'ERROR' });
        }
    }

    /**
     * Finds which bot an order belongs to by checking our order collections.
     */
    async findBotIdForOrder(exchangeOrderId) {
        // Check DCA orders first
        let order = await DcaOrder.findOne({ exchangeOrderId }).select('botId');

        // 3. UNCOMMENT AND FIX THIS for Grid Orders
        if (!order) {
            // Use the 'Order' model we imported, which GridStrategyService uses
            order = await Order.findOne({ exchangeOrderId }).select('botId');
        }

        if (order) {
            return order.botId.toString();
        }
        return null;
    }
}

module.exports = new BotManagerService();
