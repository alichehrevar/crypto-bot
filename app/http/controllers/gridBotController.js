const Bot = require('../../models/Bot');              // your Mongoose Bot schema
const Logger = require('../../../logs/gridLogger');
const { connectToDatabase } = require('../../strategies/grid/db');
const { createGridBot } = require('../../strategies/grid/gridBot');

exports.startGrid = async (req, res) => {
    try {
        const userId = req.user.id; // set by auth middleware
        const botId  = req.params.botId;
        const {
            type,       // 'standard', 'optimized', or 'infinite'
            apiKey,
            secretKey,
            symbol,
            gridSize,
            priceStep,
            lotSize,
            initialPrice
        } = req.body;

        // 1) Connect to DB (if not already connected)
        await connectToDatabase(process.env.MONGO_URI);

        // 2) (Optional) Save/Update a “Bot” document so you can track it
        //    e.g.: await Bot.findOneAndUpdate({ _id: botId, userId }, { /*…*/ }, { upsert:true })
        //    For now, assume the Bot document already exists or was created at registration.

        // 3) Create the bot instance
        const config = {
            botId,
            apiKey,
            secretKey,
            symbol,
            gridSize:    parseInt(gridSize),
            priceStep:   parseFloat(priceStep),
            lotSize:     parseFloat(lotSize),
            initialPrice: parseFloat(initialPrice),
        };

        const botInstance = createGridBot(type, config);

        // 4) Initialize (places the initial grid orders)
        await botInstance.initialize();

        // 5) Schedule runLoop() every 30 seconds (or your chosen interval)
        const intervalObj = setInterval(
            () => {
                botInstance.runLoop().catch(err => Logger.error(err.message));
            },
            30_000
        );

        // 6) Save the interval handle (so you can clear it when stopping)
        //    e.g. store it in a Map<botId, intervalObj>
        global.gridBotIntervals = global.gridBotIntervals || new Map();
        global.gridBotIntervals.set(botId, { instance: botInstance, interval: intervalObj });

        return res.json({ success: true, message: `Grid bot ${botId} started as ${type}` });
    } catch (err) {
        Logger.error(`startGrid error: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Example: POST /api/bots/:botId/grid/stop
exports.stopGrid = async (req, res) => {
    try {
        const userId = req.user.id; // from auth
        const botId  = req.params.botId;

        // Retrieve the running instance from our global map
        const record = global.gridBotIntervals && global.gridBotIntervals.get(botId);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Grid bot not running' });
        }

        const { instance, interval } = record;
        clearInterval(interval);             // stop the periodic runLoop
        await instance.stop();               // cancel all orders & clear state
        global.gridBotIntervals.delete(botId);

        return res.json({ success: true, message: `Grid bot ${botId} stopped.` });
    } catch (err) {
        Logger.error(`stopGrid error: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Example: GET /api/bots/:botId/grid/status
exports.getGridStatus = async (req, res) => {
    try {
        const botId = req.params.botId;
        // Fetch persisted state from Mongo
        const { fetchGridState } = require('../../strategies/grid/db');
        const state = await fetchGridState(botId);
        return res.json({ success: true, data: state });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
