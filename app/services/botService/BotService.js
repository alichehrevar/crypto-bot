// app/services/botService/BotService.js

const axios  = require('axios');
const BotBase    = require('../../models/BotBase');
// Import the N8nJobResponse model to fetch code
const { N8nJobResponse_CustomAiDB } = require('../../models/N8nJobResponse');
const Indicators = require('../../strategies/technical'); // Now includes N8NBotRunner
const candleStore = require('../../../utils/candleStore');
const wsServer     = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const botLogger = require('../../../logs/botLogger');
const BotLog    = require('../../models/BotLog'); // Import the Log Model

class BotService {
    constructor() {
        // Map<"SYMBOL-TIMEFRAME", BotDoc[]>
        this.activeBots = new Map();
        // promise-locks so each bot’s save is serialized
        this._locks     = new Map();

        // CACHE: Store N8n code strings in memory to avoid DB hits every candle
        // Map<jobId, codeString>
        this._n8nCodeCache = new Map();
    }

    /** Load all active bots at startup */
    async initialize() {
        const bots = await BotBase.find({ active: true });
        for (const bot of bots) this.registerBot(bot);
    }

    /** Register a brand-new bot in memory */
    registerBot(bot) {
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) this.activeBots.set(key, []);
        this.activeBots.get(key).push(bot);
    }

    /** Update an existing bot in memory after an edit or closeTrade */
    updateBot(updated) {
        const key = `${updated.symbol.toUpperCase()}-${updated.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) return;
        const arr = this.activeBots.get(key);
        // replace the doc with same _id
        this.activeBots.set(key,
            arr.map(b => b._id.equals(updated._id) ? updated : b)
        );
    }

    /** Deactivate a bot (on deactivate) */
    deactivateBot(bot) {
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) return;
        this.activeBots.set(
            key,
            this.activeBots.get(key).filter(b => !b._id.equals(bot._id))
        );
    }

    /** Consensus aggregation (all BUY → BUY, all SELL → SELL, else HOLD) */
    _aggregateConsensus(signals) {
        if (!signals.length)        return 'HOLD';
        if (signals.every(s => s==='BUY'))  return 'BUY';
        if (signals.every(s => s==='SELL')) return 'SELL';
        return 'HOLD';
    }

    /** Weighted aggregation (BUY=+1, SELL=-1, HOLD=0; avg>0.5 BUY, <-0.5 SELL) */
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
    }

    /** Helper: Fetch and Cache N8n Code */
    async _getN8nCode(jobId) {
        if (this._n8nCodeCache.has(jobId)) {
            return this._n8nCodeCache.get(jobId);
        }
        try {
            const job = await N8nJobResponse_CustomAiDB.findById(jobId);
            if (!job || !job.generatedCode || !job.generatedCode.fullCode) {
                console.error(`[BotService] N8n Job ${jobId} not found or has no code.`);
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

    /**
     * Helper: Log to both File (via Winston) and DB (via Mongoose)
     * @param {Object} logger - The winston logger instance
     * @param {String} level - 'info', 'warn', 'error'
     * @param {String} message - The message
     * @param {Object} bot - The bot object (for ID)
     * @param {Object} meta - Additional metadata
     */
    async _log(logger, level, message, bot, meta = {}) {
        // 1. Log to File/Console via Winston
        if (logger && logger[level]) {
            logger[level](message, meta);
        }

        // 2. Log to Database
        try {
            await BotLog.create({
                timestamp: new Date(),
                level: level,
                message: message,
                meta: {
                    botId: bot._id,
                    botName: bot.name,
                    ...meta
                }
            });
        } catch (err) {
            // If DB logging fails, just console error so we don't crash the bot logic
            console.error(`[BotService] Failed to write log to DB: ${err.message}`);
        }
    }

    /**
     * Invoked on every candle (closed or updating).
     * Serializes per-bot via a promise queue so no races on save().
     */
    async processCandle(symbol, timeframe, candle) {

        const key = `${symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;
        const bots = this.activeBots.get(key) || [];
        if (!bots.length) return;

        // update our in-memory candle store
        candleStore.updateCandle(symbol, timeframe, candle);
        for (const bot of bots) {

            const botId = bot._id.toString();
            const prev  = this._locks.get(botId) || Promise.resolve();

            const next = prev
                .catch(() => {})          // ignore prior errors
                .then(() => this._handleBot(bot, candle, symbol, timeframe));

            this._locks.set(botId, next);
        }
    }

    /** per-bot handler called by processCandle queue */
    async _handleBot(bot, candle, symbol, timeframe) {

        // dca tracks symbol price directly, no need to store candles
        if (bot.botType === 'dca') return;

        const logger = botLogger.getLogger(bot._id.toString());

        // ——— A) MarketInfo update ———
        const last    = bot.marketInfo.lastCandle;
        const sameTs  = last && new Date(last.timestamp).getTime() === candle.timestamp.getTime();
        if (sameTs) {
            // just update live price
            bot.marketInfo.currentCandle = { price: candle.close };
        } else {
            // new closed candle
            bot.marketInfo.lastCandle    = { ...candle };
            bot.marketInfo.currentCandle = { price: candle.close };
        }

        // if still building, just save + broadcast price
        if (!candle.isClosed) {
            await bot.save();
            wsServer.broadcastBotUpdate(bot.toObject());
            return;
        }

        // Log the start of processing for a closed candle
        await this._log(logger, 'info', `Processing closed candle. Price: ${candle.close}, Timestamp: ${candle.timestamp.toISOString()}`, bot, {
            price: candle.close,
            candleTimestamp: candle.timestamp
        });

        // ——— B) compute each indicator’s raw signal ———
        const signals = [];
        for (const cfg of bot.indicators || []) {
            if (!cfg.name || cfg.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
                signals.push('HOLD');
                continue;
            }

            // determine how many bars we need
            const p = cfg.params||{};
            let needed;

            // --- UPDATED SWITCH CASE ---
            switch (cfg.name) {
                case 'RSI':            needed = (p.period||14)+2; break;
                case 'MACD':           needed = (p.longPeriod||26)+(p.signalPeriod||9)+1; break;
                case 'MA_Crossover':   needed = Math.max(p.shortPeriod||5,p.longPeriod||20)+1; break;
                case 'Donchian':       needed = (p.period||20)+1; break;
                case 'Volume':         needed = (p.period||14)+1; break;
                case 'Heikin_Ashi':    needed = 2; break;
                case 'Combined_RSI_MACD': {
                    const    r = (p.period||14)+2;
                    const    m = (p.longPeriod||26)+(p.signalPeriod||9)+1;
                    needed      = Math.max(r,m);
                    break;
                }
                case 'Bollinger_Bands':needed = (p.period||20)+1; break;
                case 'Stochastic_RSI': {
                    const base = p.period||14, k = p.kPeriod||3, d = p.dPeriod||3;
                    needed      = base + k + d + 1;
                    break;
                }
                // N8N Strategies usually require more data for stability (ADF tests, etc.)
                case 'N8NBotRunner':
                case 'N8nStrategy':    needed = (p.windowSize || 100) + 20; break;
                default:               needed = 50;
            }

            // grab recent
            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);

            if (recent.length < needed) {
                const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                recent      = more.concat(recent);
            }

            // run it
            // MAPPING: Ensure 'N8nStrategy' maps to 'N8NBotRunner'
            let key = cfg.name.replace(/-/g,'');
            if (key === 'N8nStrategy') key = 'N8NBotRunner';

            const Cls = Indicators[key];
            if (!Cls) {
                await this._log(logger, 'error', `Unknown indicator "${cfg.name}"`, bot);
                signals.push('HOLD');
            } else {
                try {
                    // --- N8N SPECIFIC LOGIC ---
                    // If it is an N8n strategy, we must fetch/inject the code
                    if (key === 'N8NBotRunner') {
                        const jobId = cfg.params.jobId;
                        if (!jobId) throw new Error("Missing jobId in N8nStrategy params");

                        const code = await this._getN8nCode(jobId);
                        if (!code) throw new Error("Could not retrieve N8n code from DB");

                        // Inject generatedCode into params for the N8NBotRunner constructor
                        cfg.params.generatedCode = code;
                    }

                    const inst = new Cls(cfg.params);
                    const signal = inst.calculateSignal(recent);
                    signals.push(signal);

                    await this._log(logger, 'info', `Indicator '${cfg.name}' produced signal: ${signal}`, bot, { indicator: cfg.name, signal });

                } catch (err) {
                    await this._log(logger, 'error', `Signal error for ${cfg.name}: ${err.message}`, bot, { stack: err.stack });
                    signals.push('HOLD');
                }
            }
        }

        // ——— C) aggregate across them ———
        const method     = bot.tradeInfo?.signalProcessingMethod || 'consensus';
        const finalSignal = method === 'weighted'
            ? this._aggregateWeighted(signals)
            : this._aggregateConsensus(signals);

        await this._log(logger, 'info', `Aggregated signals [${signals.join(', ')}] to final signal: ${finalSignal} using '${method}' method.`, bot, {
            signals: signals,
            finalSignal: finalSignal,
            method: method
        });

        bot.marketInfo.lastSignal = finalSignal;

        // ——— D) risk check and order execution ———
        const { canTrade, reason } = await RiskManagementService.checkRisk(bot);
        if (!canTrade) {
            await this._log(logger, 'warn', `Trade blocked by Risk Management: ${reason}`, bot, { reason });
        } else if (finalSignal !== 'HOLD') {
            await this._log(logger, 'info', `Risk management passed. Executing '${finalSignal}' order.`, bot);
            await OrderExecutionService.executeOrder(bot, finalSignal, candle.close, null);
        }

        // ——— E) save & broadcast once ———
        await bot.save();
        wsServer.broadcastBotUpdate(bot.toObject());
    }
}

module.exports = new BotService();
