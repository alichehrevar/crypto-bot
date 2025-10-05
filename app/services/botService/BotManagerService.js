const GridBotModel = require('../../models/GridBotModel');
const GridStrategyService = require('./GridStrategyService');
// const ExchangeService = require('./ExchangeService'); // Assumed to exist

/**
 * BotManagerService
 * A singleton service that manages the lifecycle of all active grid bot instances.
 * It initializes them on startup and routes exchange events to the correct instance.
 */
class BotManagerService {
    constructor() {
        // In-memory map to hold active bot strategy instances.
        // Key: botId (string), Value: GridStrategyService instance
        this.activeBots = new Map();
        // this.exchangeService = new ExchangeService(); // Initialize your exchange connection here
        this.exchangeService = this.getMockExchangeService(); // Using a mock for development
    }

    /**
     * Initializes the manager, loads all active bots from the DB,
     * and subscribes to necessary exchange data streams.
     */
    async initialize() {
        console.log('BotManagerService initializing...');

        // Subscribe to a centralized stream of user trade updates (fills)
        this.exchangeService.on('fill', (fillData) => {
            this.routeFillEvent(fillData);
        });

        const runningBots = await GridBotModel.find({ status: 'RUNNING' });
        console.log(`Found ${runningBots.length} bots to restart.`);

        for (const bot of runningBots) {
            await this.startBotInstance(bot._id.toString());
        }
        console.log('BotManagerService initialized successfully.');
    }

    /**
     * Creates a new bot in the database and starts its trading instance.
     * @param {object} botConfig - The configuration for the new bot.
     * @returns {GridStrategyService} The running instance.
     */
    async createAndStartBot(botConfig) {
        console.log(botConfig)
        const newBot = new GridBotModel(botConfig);
        await newBot.save();
        console.log(`New bot created with ID: ${newBot._id}`);

        return this.startBotInstance(newBot._id.toString());
    }

    /**
     * Stops a bot instance and updates its status in the database.
     * @param {string} botId - The ID of the bot to stop.
     */
    async stopBot(botId) {
        const botInstance = this.activeBots.get(botId);
        if (!botInstance) {
            console.warn(`Attempted to stop a bot that is not active: ${botId}`);
            // Ensure status is updated even if instance isn't in memory
            await GridBotModel.updateOne({ _id: botId }, { status: 'STOPPED' });
            return;
        }

        await botInstance.stop();
        this.activeBots.delete(botId);
        console.log(`Bot instance ${botId} stopped and removed from manager.`);
    }

    /**
     * Routes a fill event from the exchange to the correct bot instance.
     * @param {object} fillData - The fill data from the exchange.
     */
    routeFillEvent(fillData) {
        // In a real system, we'd map the orderId or a clientOrderId prefix
        // to a botId. Here, we'll need to look it up. This is inefficient
        // and should be optimized in a production environment.
        const botId = this.findBotIdForOrder(fillData.orderId);
        if (botId && this.activeBots.has(botId)) {
            const botInstance = this.activeBots.get(botId);
            console.log(`Routing fill for order ${fillData.orderId} to bot ${botId}`);
            botInstance.processFill(fillData);
        }
    }

    /**
     * Starts a managed instance of a GridStrategyService for a given botId.
     * @param {string} botId
     */
    async startBotInstance(botId) {
        if (this.activeBots.has(botId)) {
            console.warn(`Bot instance ${botId} is already running.`);
            return;
        }

        try {
            const botInstance = new GridStrategyService(botId, this.exchangeService);
            await botInstance.initialize();
            await botInstance.start();
            this.activeBots.set(botId, botInstance);
            console.log(`Successfully started and managing bot instance: ${botId}`);
            return botInstance;
        } catch (error) {
            console.error(`Failed to start bot instance ${botId}:`, error);
            await GridBotModel.updateOne({ _id: botId }, { status: 'ERROR' });
        }
    }

    // --- MOCK AND HELPER FUNCTIONS ---

    /**
     * Simulates an exchange service for development purposes.
     */
    getMockExchangeService() {
        const EventEmitter = require('events');
        class MockExchangeService extends EventEmitter {}
        const mockService = new MockExchangeService();

        // Simulate a fill event every 15 seconds
        setInterval(() => {
            const mockFill = {
                tradeId: `trade-${Date.now()}`,
                orderId: 'mock-order-id-123', // In reality, this would be a dynamic exchange ID
                symbol: 'BTC/USDT',
                price: 65100,
                quantity: 0.01,
                fee: 0.0651,
                feeCurrency: 'USDT',
                side: 'buy',
                timestamp: Date.now(),
            };
            mockService.emit('fill', mockFill);
        }, 15000);

        return mockService;
    }

    /**
     * Helper to find which bot an order belongs to.
     * NOTE: This is a placeholder. A production system should use a more
     * efficient mapping, like a Redis cache of `exchangeOrderId -> botId`.
     */
    findBotIdForOrder(exchangeOrderId) {
        // This is where you would query a mapping. For now, we hardcode it
        // to respond to the mock service's fill event.
        if (exchangeOrderId === 'mock-order-id-123' && this.activeBots.size > 0) {
            // Return the first active bot's ID for the demo
            return this.activeBots.keys().next().value;
        }
        return null;
    }
}

// Export a singleton instance of the manager
module.exports = new BotManagerService();
