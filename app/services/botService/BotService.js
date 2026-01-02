// app/services/botService/BotService.js

const axios = require('axios');
const BotBase = require('../../models/BotBase');
const { N8nJobResponse_CustomAiDB } = require('../../models/N8nJobResponse');
const Indicators = require('../../strategies/technical');
const candleStore = require('../../../utils/candleStore');
const wsServer = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const botLogger = require('../../../logs/botLogger');

// --- IMPORT STRATEGY SERVICES ---
// These handle the event-driven logic for Grid and DCA bots
const GridStrategyService = require('./GridStrategyService');
const DcaStrategyService = require('./DcaStrategyService');

class BotService {
    constructor() {
        // 1. INDICATOR BOTS
        // Map<"SYMBOL-TIMEFRAME", BotDoc[]>
        // Used for the "Tick Loop" (processCandle)
        this.activeBots = new Map();

        // 2. STRATEGY BOTS (Grid / DCA)
        // Map<botIdString, ServiceInstance>
        // Used to keep the class instance alive so we can call .stop() later
        this.activeStrategies = new Map();

        // UTILS
        this._locks = new Map(); // Promise locks for saving
        this._n8nCodeCache = new Map(); // Cache for N8N code
        this._processedCandles = new Map(); // Prevent log spam
    }

    /** * Load all active bots at startup
     */
    async initialize() {
        try {
            const bots = await BotBase.find({ active: true });
            console.log(`[BotService] Found ${bots.length} active bots. Initializing...`);
            for (const bot of bots) {
                await this.registerBot(bot);
            }
        } catch (err) {
            console.error('[BotService] Initialization failed:', err);
        }
    }

    /** * Register and START a bot
     * This directs the bot to the correct handler based on its type.
     */
    async registerBot(bot) {
        const botIdStr = bot._id.toString();
        const logger = botLogger.getLogger(botIdStr);

        try {
            // --- A. GRID BOTS ---
            if (bot.botType === 'grid') {
                if (this.activeStrategies.has(botIdStr)) return; // Already running

                console.log(`[BotService] Starting GRID Strategy for ${bot.name}...`);
                const strategy = new GridStrategyService(botIdStr);

                // Start the strategy (Seeds orders, connects WS, etc.)
                await strategy.start();

                // Save instance so we can stop it later
                this.activeStrategies.set(botIdStr, strategy);
                return;
            }

            // --- B. DCA BOTS ---
            if (bot.botType === 'dca') {
                if (this.activeStrategies.has(botIdStr)) return; // Already running

                console.log(`[BotService] Starting DCA Strategy for ${bot.name}...`);
                const strategy = new DcaStrategyService(botIdStr);

                await strategy.start();

                this.activeStrategies.set(botIdStr, strategy);
                return;
            }

            // --- C. INDICATOR BOTS (Standard Loop) ---
            // These rely on processCandle(), so we add them to the activeBots map.
            const tf = bot.timeframe || '1m';
            const sym = bot.symbol ? bot.symbol.toUpperCase() : null;

            if (!sym) {
                console.warn(`[BotService] Bot ${bot.name} (${bot._id}) has no symbol. Skipping.`);
                return;
            }

            const key = `${sym}-${tf.toLowerCase()}`;
            if (!this.activeBots.has(key)) this.activeBots.set(key, []);

            const list = this.activeBots.get(key);
            // Prevent duplicates
            if (!list.find(b => b._id.toString() === botIdStr)) {
                list.push(bot);
                console.log(`[BotService] Registered INDICATOR Bot ${bot.name} on ${key}`);
            }

        } catch (err) {
            console.error(`[BotService] Failed to register/start bot ${bot.name}:`, err);
            await this._log(logger, 'error', `Startup Failed: ${err.message}`, bot, { stack: err.stack });
        }
    }

    /** * Stop and Unregister a bot
     */
    async unregisterBot(botId) {
        const botIdStr = botId.toString();

        // 1. Check if it's a Strategy Bot (Grid/DCA)
        if (this.activeStrategies.has(botIdStr)) {
            const strategy = this.activeStrategies.get(botIdStr);
            console.log(`[BotService] Stopping Strategy for ${botIdStr}...`);

            // Graceful shutdown (cancel orders, etc.)
            if (strategy.stop) {
                await strategy.stop();
            }

            this.activeStrategies.delete(botIdStr);
            this._cleanupCaches(botIdStr);
            return;
        }

        // 2. Check if it's an Indicator Bot
        for (const [key, list] of this.activeBots.entries()) {
            const idx = list.findIndex(b => b._id.toString() === botIdStr);
            if (idx !== -1) {
                list.splice(idx, 1);
                if (list.length === 0) this.activeBots.delete(key);

                console.log(`[BotService] Unregistered Indicator Bot ${botIdStr}`);
                this._cleanupCaches(botIdStr);
                return;
            }
        }
    }

    _cleanupCaches(botIdStr) {
        this._processedCandles.delete(botIdStr);
        this._n8nCodeCache.delete(botIdStr);
    }

    // --- ALIASES FOR CONTROLLER COMPATIBILITY ---
    deactivateBot(bot) { return this.unregisterBot(bot._id); }
    updateBot(bot) { this.unregisterBot(bot._id); this.registerBot(bot); }
    removeBot(bot) { this.unregisterBot(bot._id); }


    // =========================================================================
    //  SECTION: INDICATOR BOT LOOP (processCandle)
    //  This logic only applies to bots in 'this.activeBots' (Indicator Type)
    // =========================================================================

    /**
     * Called by WebSocketServer when a new ticker/candle arrives.
     * Only processes Indicator Bots. Grid/DCA bots handle their own streams.
     */
    async processCandle(symbol, timeframe, candle) {
        // Normalize Key: "BTC/USDT" -> "BTC-1m"
        const key = `${symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;
        const bots = this.activeBots.get(key) || [];

        if (!bots.length) return;

        // Update central candle store
        candleStore.updateCandle(symbol, timeframe, candle);

        // Run logic for each bot in parallel (with lock protection)
        for (const bot of bots) {
            // DOUBLE CHECK: Ensure no Grid/DCA bots slipped into this list
            if (bot.botType === 'grid' || bot.botType === 'dca') continue;

            const botId = bot._id.toString();
            const prev = this._locks.get(botId) || Promise.resolve();

            const next = prev
                .catch(() => {}) // Ignore previous errors
                .then(() => this._handleIndicatorBot(bot, candle, symbol, timeframe));

            this._locks.set(botId, next);
        }
    }

    /**
     * The Logic Loop for Indicator Bots
     */
    async _handleIndicatorBot(bot, candle, symbol, timeframe) {
        const logger = botLogger.getLogger(bot._id.toString());
        const botIdStr = bot._id.toString();

        // --- 1. NEW CANDLE DETECTION (Log Once per Timeframe) ---
        const lastSeenTime = this._processedCandles.get(botIdStr);
        const currentCandleTime = new Date(candle.timestamp).getTime();
        const isNewCandleInterval = lastSeenTime !== currentCandleTime;

        // Update UI Memory
        bot.marketInfo = bot.marketInfo || {};
        bot.marketInfo.currentCandle = { price: candle.close };

        if (isNewCandleInterval) {
            await this._log(logger, 'info', `📊 New ${timeframe} Candle Started. Open: ${candle.open}, Date: ${candle.timestamp.toISOString()}`, bot);
            this._processedCandles.set(botIdStr, currentCandleTime);
        }

        // --- 2. WAIT FOR CANDLE CLOSE ---
        if (!candle.isClosed) {
            // Just broadcast live price to UI
            wsServer.broadcastBotUpdate(bot.toObject());
            return;
        }

        // --- 3. EXECUTE STRATEGY (On Close) ---
        bot.marketInfo.lastCandle = { ...candle };
        await this._log(logger, 'info', `🏁 Candle Closed. Price: ${candle.close}. Calculating Indicators...`, bot, {
            price: candle.close,
            volume: candle.volume
        });

        // Compute Indicators
        const signals = [];
        const indicatorResults = {};

        for (const cfg of bot.indicators || []) {
            if (!cfg.name || cfg.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
                signals.push('HOLD');
                continue;
            }

            const p = cfg.params || {};
            let needed = 50;

            // Simple lookback logic
            if (cfg.name === 'N8nStrategy' || cfg.name === 'N8NBotRunner') {
                needed = (p.windowSize || 100) + 20;
            } else {
                needed = 100; // Safe default
            }

            // Fetch History
            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);
            if (recent.length < needed) {
                const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                recent = more.concat(recent);
            }

            // Indicator Calculation
            let key = cfg.name.replace(/-/g, '');
            if (key === 'N8nStrategy') key = 'N8NBotRunner';

            const Cls = Indicators[key];
            if (!Cls) {
                await this._log(logger, 'error', `Unknown indicator "${cfg.name}"`, bot);
                signals.push('HOLD');
                continue;
            }

            try {
                // N8N Code Handling
                if (key === 'N8NBotRunner' && cfg.params.jobId) {
                    const code = await this._getN8nCode(cfg.params.jobId);
                    if (code) cfg.params.generatedCode = code;
                }

                const inst = new Cls(cfg.params);
                const signal = inst.calculateSignal(recent);
                signals.push(signal);
                indicatorResults[cfg.name] = signal;

            } catch (err) {
                await this._log(logger, 'error', `Calc Error [${cfg.name}]: ${err.message}`, bot);
                signals.push('HOLD');
            }
        }

        // Aggregation
        const method = bot.tradeInfo?.signalProcessingMethod || 'consensus';
        const finalSignal = method === 'weighted'
            ? this._aggregateWeighted(signals)
            : this._aggregateConsensus(signals);

        bot.marketInfo.lastSignal = finalSignal;

        await this._log(logger, 'info', `Calculations Complete.`, bot, {
            indicators: indicatorResults,
            finalSignal: finalSignal,
            method: method
        });

        // Execution
        if (finalSignal !== 'HOLD') {
            const { canTrade, reason } = await RiskManagementService.checkRisk(bot);
            if (!canTrade) {
                await this._log(logger, 'warn', `🚫 Blocked by Risk: ${reason}`, bot);
            } else {
                await this._log(logger, 'info', `🚀 Executing ${finalSignal}`, bot);
                await OrderExecutionService.executeOrder(bot, finalSignal, candle.close, null);
            }
        } else {
            await this._log(logger, 'info', `Signal is HOLD. No action taken.`, bot);
        }

        // Save & Update UI
        await bot.save();
        wsServer.broadcastBotUpdate(bot.toObject());
    }

    // --- HELPERS ---

    async _log(mongoLogger, level, message, bot, meta = {}) {
        if (mongoLogger && mongoLogger[level]) {
            mongoLogger[level](message, { botId: bot._id, ...meta });
        } else if (level === 'error') {
            console.error(`[Bot ${bot.name}] ${message}`);
        }
    }

    _aggregateConsensus(signals) {
        if (!signals.length) return 'HOLD';
        if (signals.every(s => s === 'BUY')) return 'BUY';
        if (signals.every(s => s === 'SELL')) return 'SELL';
        return 'HOLD';
    }

    _aggregateWeighted(signals) {
        if (!signals.length) return 'HOLD';
        let sum = 0, totalW = 0;
        for (const s of signals) {
            totalW += 1;
            if (s === 'BUY') sum += 1;
            if (s === 'SELL') sum -= 1;
        }
        const avg = sum / totalW;
        return avg > 0.5 ? 'BUY' : avg < -0.5 ? 'SELL' : 'HOLD';
    }

    async _fetchHistorical(symbol, timeframe, count) {
        try {
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                    symbol: symbol.replace('/', ''),
                    interval: timeframe,
                    limit: count
                }
            });
            return resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
                isClosed: true
            }));
        } catch (error) {
            console.error(`[BotService] Error fetching history: ${error.message}`);
            return [];
        }
    }

    async _getN8nCode(jobId) {
        if (this._n8nCodeCache.has(jobId)) {
            return this._n8nCodeCache.get(jobId);
        }
        try {
            const job = await N8nJobResponse_CustomAiDB.findById(jobId);
            if (job && job.generatedCode && job.generatedCode.fullCode) {
                const code = job.generatedCode.fullCode;
                this._n8nCodeCache.set(jobId, code);
                return code;
            }
            return null;
        } catch (err) {
            console.error(`[BotService] Failed to fetch N8n Job ${jobId}:`, err);
            return null;
        }
    }
}

module.exports = new BotService();
