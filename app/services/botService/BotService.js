// app/services/botService/BotService.js

const axios  = require('axios');
const BotBase    = require('../../models/BotBase');
const { N8nJobResponse_CustomAiDB } = require('../../models/N8nJobResponse');
const Indicators = require('../../strategies/technical');
const candleStore = require('../../../utils/candleStore');
const wsServer     = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const botLogger = require('../../../logs/botLogger');

class BotService {
    constructor() {
        // Map<"SYMBOL-TIMEFRAME", BotDoc[]>
        this.activeBots = new Map();
        // promise-locks so each bot’s save is serialized
        this._locks     = new Map();

        // CACHE: Store N8n code strings in memory to avoid DB hits every candle
        this._n8nCodeCache = new Map();

        // CACHE: Track the last processed candle timestamp per bot to prevent log spam
        // Map<botId, lastTimestamp>
        this._processedCandles = new Map();
    }

    /** Load all active bots at startup */
    async initialize() {
        console.log('[BotService] Initializing...');
        const bots = await BotBase.find({ active: true });
        console.log(`[BotService] Found ${bots.length} active bots.`);
        for (const bot of bots) this.registerBot(bot);
        console.log('[BotService] Initialization complete.');
    }

    /** Register a brand-new bot in memory */
    registerBot(bot) {
        const logger = botLogger.getLogger(bot._id.toString());
        this._log(logger, 'info', `Registering bot ${bot.name} (${bot.symbol})`, bot).catch(err => console.error(err));

        const key = `${bot.symbol.toUpperCase()}-${bot._id}`;
        if (!this.activeBots.has(key)) this.activeBots.set(key, []);
        this.activeBots.get(key).push(bot);
    }

    /** Update an existing bot in memory */
    updateBot(updated) {
        const logger = botLogger.getLogger(updated._id.toString());
        this._log(logger, 'info', `Updating bot ${updated.name} (${updated.symbol})`, updated).catch(err => console.error(err));

        const key = `${updated.symbol.toUpperCase()}-${updated.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) return;
        const arr = this.activeBots.get(key);
        this.activeBots.set(key,
            arr.map(b => b._id.equals(updated._id) ? updated : b)
        );
    }

    /** Deactivate a bot */
    deactivateBot(bot) {
        const logger = botLogger.getLogger(bot._id.toString());
        this._log(logger, 'info', `Deactivating bot ${bot.name} (${bot.symbol})`, bot).catch(err => console.error(err));

        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) return;
        this.activeBots.set(
            key,
            this.activeBots.get(key).filter(b => !b._id.equals(bot._id))
        );
        // Clear cache
        this._processedCandles.delete(bot._id.toString());
    }

    /** Consensus aggregation */
    _aggregateConsensus(signals) {
        if (!signals.length)        return 'HOLD';
        if (signals.every(s => s==='BUY'))  return 'BUY';
        if (signals.every(s => s==='SELL')) return 'SELL';
        return 'HOLD';
    }

    /** Weighted aggregation */
    _aggregateWeighted(signals) {
        if (!signals.length) return 'HOLD';
        let sum=0, totalW=0;
        for (const s of signals) {
            totalW += 1;
            if (s==='BUY')  sum += 1;
            if (s==='SELL') sum -= 1;
        }
        const avg = sum/totalW;
        return avg>0.5 ? 'BUY' : avg< -0.5 ? 'SELL' : 'HOLD';
    }

    /** Simple REST backfill via Binance */
    async _fetchHistorical(symbol, timeframe, count) {
        try {
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                    symbol:   symbol.replace('/',''),
                    interval: timeframe,
                    limit:    count
                }
            });

            return resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open:      +k[1],
                high:      +k[2],
                low:       +k[3],
                close:     +k[4],
                volume:    +k[5],
                isClosed:  true
            }));
        } catch (error) {
            console.error(`[BotService] Error fetching history: ${error.message}`);
            return [];
        }
    }

    /** Helper: Fetch and Cache N8n Code */
    async _getN8nCode(jobId) {
        if (this._n8nCodeCache.has(jobId)) {
            return this._n8nCodeCache.get(jobId);
        }
        try {
            const job = await N8nJobResponse_CustomAiDB.findById(jobId);
            if (!job || !job.generatedCode || !job.generatedCode.fullCode) {
                return null;
            }
            const code = job.generatedCode.fullCode;
            this._n8nCodeCache.set(jobId, code);
            return code;
        } catch (err) {
            console.error(`[BotService] Failed to fetch N8n Job ${jobId}:`, err);
            return null;
        }
    }

    async _log(mongoLogger, level, message, bot, meta = {}) {

        // Only log to Mongo if the logger exists
        if (mongoLogger) {
            mongoLogger.log({
                level,
                message,
                // --- FIX: Convert ObjectId to String for consistency ---
                botId: bot._id.toString(),
                ...meta
            });
        }
        // Optional: Keep console log for critical errors only to keep console clean
        if (level === 'error') {
            console.error(`[Bot ${bot.name}] ${message}`);
        }
    }

    async processCandle(symbol, timeframe, candle) {
        // Normalize Key
        const key = `${symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;
        const bots = this.activeBots.get(key) || [];

        if (!bots.length) return;

        // Update memory store
        candleStore.updateCandle(symbol, timeframe, candle);

        for (const bot of bots) {
            const botId = bot._id.toString();
            const prev  = this._locks.get(botId) || Promise.resolve();

            const next = prev
                .catch(() => {})
                .then(() => this._handleBot(bot, candle, symbol, timeframe));

            this._locks.set(botId, next);
        }
    }

    async _handleBot(bot, candle, symbol, timeframe) {
        const logger = botLogger.getLogger(bot._id.toString());
        const botIdStr = bot._id.toString();

        if (bot.botType === 'dca') return;

        console.log(bot, '48917328974013971')

        // ——— 1. CHECK IF NEW CANDLE (Log Once per Timeframe) ———
        const lastSeenTime = this._processedCandles.get(botIdStr);
        const currentCandleTime = new Date(candle.timestamp).getTime();
        const isNewCandleInterval = lastSeenTime !== currentCandleTime;

        // Update local memory for UI display (Live Price)
        bot.marketInfo = bot.marketInfo || {};
        bot.marketInfo.currentCandle = { price: candle.close };

        // ——— 2. LOGGING CONTROL ———
        if (isNewCandleInterval) {
            await this._log(logger, 'info', `📊 New ${timeframe} Candle Started. Open: ${candle.open}, Date: ${candle.timestamp.toISOString()}`, bot);
            this._processedCandles.set(botIdStr, currentCandleTime);
        }

        // ——— 3. IF CANDLE IS NOT CLOSED ———
        if (!candle.isClosed) {
            wsServer.broadcastBotUpdate(bot.toObject());
            return;
        }

        // ——— 4. CANDLE IS CLOSED (Process Logic Now) ———
        bot.marketInfo.lastCandle = { ...candle };

        await this._log(logger, 'info', `🏁 Candle Closed. Price: ${candle.close}. Calculating Indicators...`, bot, {
            price: candle.close,
            volume: candle.volume
        });

        // ——— Compute Indicators ———
        const signals = [];
        const indicatorResults = {}; // For detailed logging

        await this._log(logger, 'info', `Starting indicator calculations for ${bot.indicators?.length || 0} indicators`, bot);

        for (const cfg of bot.indicators || []) {
            if (!cfg.name || cfg.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
                signals.push('HOLD');
                continue;
            }

            await this._log(logger, 'debug', `Processing indicator: ${cfg.name}`, bot);

            const p = cfg.params||{};
            let needed = 50;

            // Determine needed history based on config
            switch (cfg.name) {
                case 'RSI':            needed = (p.period||14)+2; break;
                case 'MACD':           needed = (p.longPeriod||26)+(p.signalPeriod||9)+1; break;
                case 'MA_Crossover':   needed = Math.max(p.shortPeriod||5,p.longPeriod||20)+1; break;
                case 'Donchian':       needed = (p.period||20)+1; break;
                case 'Volume':         needed = (p.period||14)+1; break;
                case 'Heikin_Ashi':    needed = 2; break;
                case 'Combined_RSI_MACD': needed = 35; break;
                case 'Bollinger_Bands':needed = (p.period||20)+1; break;
                case 'Stochastic_RSI': needed = (p.period||14) + (p.kPeriod||3) + (p.dPeriod||3) + 1; break;
                case 'N8NBotRunner':
                case 'N8nStrategy':    needed = (p.windowSize || 100) + 20; break;
            }

            // Fetch Candles
            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);

            if (recent.length < needed) {
                await this._log(logger, 'debug', `Fetching historical data for ${cfg.name}. Needed: ${needed}, Available: ${recent.length}`, bot);
                // Fetch historical only if absolutely needed (expensive op)
                const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                recent = more.concat(recent);
            }

            // Run Calculation
            let key = cfg.name.replace(/-/g,'');
            if (key === 'N8nStrategy') key = 'N8NBotRunner';

            const Cls = Indicators[key];
            if (!Cls) {
                await this._log(logger, 'error', `Unknown indicator "${cfg.name}"`, bot);
                signals.push('HOLD');
                continue;
            }

            try {
                // N8N Code Injection
                if (key === 'N8NBotRunner') {
                    const jobId = cfg.params.jobId;
                    if (jobId) {
                        const code = await this._getN8nCode(jobId);
                        if (code) cfg.params.generatedCode = code;
                    }
                }

                const inst = new Cls(cfg.params);
                const signal = inst.calculateSignal(recent);
                signals.push(signal);

                indicatorResults[cfg.name] = signal;
                await this._log(logger, 'info', `Indicator ${cfg.name} result: ${signal}`, bot);

            } catch (err) {
                await this._log(logger, 'error', `Calc Error [${cfg.name}]: ${err.message}`, bot);
                signals.push('HOLD');
            }
        }

        // ——— Aggregation ———
        const method = bot.tradeInfo?.signalProcessingMethod || 'consensus';
        await this._log(logger, 'debug', `Aggregating signals using method: ${method}`, bot);

        const finalSignal = method === 'weighted'
            ? this._aggregateWeighted(signals)
            : this._aggregateConsensus(signals);

        bot.marketInfo.lastSignal = finalSignal;

        await this._log(logger, 'info', `Calculations Complete.`, bot, {
            indicators: indicatorResults,
            finalSignal: finalSignal,
            method: method
        });

        // ——— Execution ———
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

        // ——— E) SAVE TO DB (Only done on Candle Close) ———
        await bot.save();
        wsServer.broadcastBotUpdate(bot.toObject());
    }
}

module.exports = new BotService();
