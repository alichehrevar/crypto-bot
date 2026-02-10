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

class BotService {
    constructor() {
        // Map<"SYMBOL-TIMEFRAME", BotDoc[]>
        this.activeBots = new Map();
        // promise-locks so each bot’s save is serialized
        this._locks = new Map();
        // CACHE: Store N8n code strings
        this._n8nCodeCache = new Map();
        // Track the last processed candle timestamp per bot
        this._processedCandles = new Map();
    }

    /** * CENTRALIZED KEY GENERATION
     * Ensures consistent lookup between registration and candle processing.
     */
    _getBotKey(symbol, timeframe) {
        const normalizedSymbol = symbol.toUpperCase().replace(/[\/-]/g, '');
        return `${normalizedSymbol}-${timeframe.toLowerCase()}`;
    }

    /** Load all active bots at startup */
    async initialize() {
        const bots = await BotBase.find({ active: true });
        for (const bot of bots) this.registerBot(bot);
    }

    registerBot(bot) {
        const key = this._getBotKey(bot.symbol, bot.timeframe);
        if (!this.activeBots.has(key)) this.activeBots.set(key, []);
        this.activeBots.get(key).push(bot);
    }

    updateBot(updated) {
        const key = this._getBotKey(updated.symbol, updated.timeframe);
        if (!this.activeBots.has(key)) return;
        const arr = this.activeBots.get(key);
        this.activeBots.set(key,
            arr.map(b => b._id.equals(updated._id) ? updated : b)
        );
    }

    deactivateBot(bot) {
        const key = this._getBotKey(bot.symbol, bot.timeframe);
        const botIdStr = bot._id.toString();

        if (this.activeBots.has(key)) {
            this.activeBots.set(
                key,
                this.activeBots.get(key).filter(b => !b._id.equals(bot._id))
            );
        }

        // --- FIX: Cleanup Memory Leaks ---
        this._processedCandles.delete(botIdStr);
        this._locks.delete(botIdStr);
    }

    /** Consensus aggregation */
    _aggregateConsensus(signals) {
        if (!signals.length) return 'HOLD';
        if (signals.every(s => s === 'BUY')) return 'BUY';
        if (signals.every(s => s === 'SELL')) return 'SELL';
        return 'HOLD';
    }

    /** Weighted aggregation: avg > 0.5 = BUY, avg < -0.5 = SELL */
    _aggregateWeighted(signals) {
        if (!signals.length) return 'HOLD';
        let sum = 0;
        for (const s of signals) {
            if (s === 'BUY') sum += 1;
            if (s === 'SELL') sum -= 1;
        }
        const avg = sum / signals.length;
        return avg > 0.5 ? 'BUY' : avg < -0.5 ? 'SELL' : 'HOLD';
    }

    async _fetchHistorical(symbol, timeframe, count) {
        try {
            const cleanSymbol = symbol.replace(/[\/-]/g, '');
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: cleanSymbol, interval: timeframe, limit: count }
            });

            return resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open: +k[1],
                high: +k[2],
                low: +k[3],
                close: +k[4],
                volume: +k[5],
                isClosed: true
            }));
        } catch (error) {
            console.error(`[BotService] History Fetch Error: ${error.message}`);
            return [];
        }
    }

    async _getN8nCode(jobId) {
        if (this._n8nCodeCache.has(jobId)) return this._n8nCodeCache.get(jobId);
        try {
            const job = await N8nJobResponse_CustomAiDB.findById(jobId);
            const code = job?.generatedCode?.fullCode;
            if (code) this._n8nCodeCache.set(jobId, code);
            return code;
        } catch (err) {
            return null;
        }
    }

    async _log(mongoLogger, level, message, bot, meta = {}) {
        if (mongoLogger) {
            mongoLogger.log({
                level,
                message,
                botId: bot._id.toString(),
                ...meta
            });
        }
    }

    async processCandle(symbol, timeframe, candle) {
        // --- FIX: Standardized Key Lookup ---
        const key = this._getBotKey(symbol, timeframe);
        const bots = this.activeBots.get(key) || [];

        if (!bots.length) return;

        // Update central store
        candleStore.updateCandle(symbol, timeframe, candle);

        for (const bot of bots) {
            const botId = bot._id.toString();
            const prev = this._locks.get(botId) || Promise.resolve();

            const next = prev
                .catch(() => {}) // Prevent one bot failure from blocking the chain
                .then(() => this._handleBot(bot, candle, symbol, timeframe));

            this._locks.set(botId, next);
        }
    }

    async _handleBot(bot, candle, symbol, timeframe) {
        const logger = botLogger.getLogger(bot._id.toString());
        const botIdStr = bot._id.toString();

        if (bot.botType === 'dca') return;

        const lastSeenTime = this._processedCandles.get(botIdStr);
        const currentCandleTime = new Date(candle.timestamp).getTime();
        const isNewCandleInterval = lastSeenTime !== currentCandleTime;

        // Update UI Info
        bot.marketInfo = bot.marketInfo || {};
        bot.marketInfo.currentCandle = { price: candle.close };

        if (isNewCandleInterval) {
            this._processedCandles.set(botIdStr, currentCandleTime);
        }

        // Logic only triggers on close
        if (!candle.isClosed) {
            wsServer.broadcastBotUpdate(bot.toObject());
            return;
        }

        bot.marketInfo.lastCandle = { ...candle };

        await this._log(logger, 'info', `🏁 Candle Closed @ ${candle.close}.`, bot);

        const signals = [];
        const indicatorResults = {};

        for (const cfg of bot.indicators || []) {
            if (!cfg.name || cfg.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
                signals.push('HOLD');
                continue;
            }

            // Determine historical requirements
            const p = cfg.params || {};
            let needed = 50;
            switch (cfg.name) {
                case 'RSI':            needed = (p.period || 14) + 2; break;
                case 'MACD':           needed = (p.longPeriod || 26) + (p.signalPeriod || 9) + 5; break;
                case 'Bollinger_Bands':needed = (p.period || 20) + 1; break;
                case 'N8NBotRunner':   needed = (p.windowSize || 100) + 10; break;
                default:               needed = 50;
            }

            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);

            if (recent.length < needed) {
                const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                recent = more.concat(recent);
            }

            let strategyKey = cfg.name.replace(/-/g, '');
            if (strategyKey === 'N8nStrategy') strategyKey = 'N8NBotRunner';

            const Cls = Indicators[strategyKey];
            if (!Cls) {
                signals.push('HOLD');
                continue;
            }

            try {
                // --- FIX: Use a copy of params to avoid mutating the bot in memory ---
                const activeParams = { ...cfg.params };

                if (strategyKey === 'N8NBotRunner' && activeParams.jobId) {
                    const code = await this._getN8nCode(activeParams.jobId);
                    if (code) activeParams.generatedCode = code;
                }

                const inst = new Cls(activeParams);
                const signal = inst.calculateSignal(recent);
                signals.push(signal);
                indicatorResults[cfg.name] = signal;
            } catch (err) {
                await this._log(logger, 'error', `Calc Error [${cfg.name}]: ${err.message}`, bot);
                signals.push('HOLD');
            }
        }

        const method = bot.tradeInfo?.signalProcessingMethod || 'consensus';
        const finalSignal = method === 'weighted'
            ? this._aggregateWeighted(signals)
            : this._aggregateConsensus(signals);

        bot.marketInfo.lastSignal = finalSignal;

        // Risk & Execution
        if (finalSignal !== 'HOLD') {
            const { canTrade, reason } = await RiskManagementService.checkRisk(bot);
            if (!canTrade) {
                await this._log(logger, 'warn', `🚫 Blocked: ${reason}`, bot);
            } else {
                await this._log(logger, 'info', `🚀 ${finalSignal} triggered`, bot);
                await OrderExecutionService.executeOrder(bot, finalSignal, candle.close, null);
            }
        }

        await bot.save();
        wsServer.broadcastBotUpdate(bot.toObject());
    }
}

module.exports = new BotService();
