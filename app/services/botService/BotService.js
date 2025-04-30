// app/services/botService/BotService.js
const axios = require('axios');
const Bot = require('../../models/Bot');
const Indicators = require('../../strategies/technical');
const candleStore = require('../../../utils/candleStore');
const wsServer = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');

class BotService {
    constructor() {
        // Map<"SYMBOL-TIMEFRAME", BotDocument[]>
        this.activeBots = new Map();
    }

    /** Load all active bots at startup */
    async initialize() {
        const bots = await Bot.find({ active: true });
        bots.forEach(bot => this.registerBot(bot));
    }

    /**
     * Register a single bot in our in-memory map, keyed by each of its indicators/timeframes.
     * Expects: bot.indicators = [{ name, timeframe, params }, …]
     */
    registerBot(bot) {
        if (!Array.isArray(bot.indicators)) return;
        for (const { name, timeframe } of bot.indicators) {
            const key = `${bot.symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
            if (!this.activeBots.has(key)) this.activeBots.set(key, []);
            this.activeBots.get(key).push(bot);
        }
    }

    /**
     * Called for every incoming candle update.
     * - Keeps an in-memory store of recent candles
     * - Updates bot.marketInfo in the DB
     * - When a candle closes, computes signals, aggregates, risk-checks, executes orders
     */
    async processCandle(symbol, timeframe, candle) {
        const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
        const bots = this.activeBots.get(key) || [];
        if (!bots.length) return;

        // 1) update our in-memory candle cache & bot.marketInfo
        candleStore.updateCandle(symbol, timeframe, candle);
        for (const bot of bots) {
            const last = bot.marketInfo.lastCandle;
            const isSameTs = last && new Date(last.timestamp).getTime() === candle.timestamp.getTime();

            if (isSameTs) {
                bot.marketInfo.currentCandle = { price: candle.close };
            } else {
                bot.marketInfo.lastCandle = { ...candle };
                bot.marketInfo.currentCandle = { price: candle.close };
            }
            await bot.save();

            // 2) only on closed candles do we run the full strategy
            if (!candle.isClosed) continue;
            console.log(`[BotService] Candle closed for ${symbol} ${timeframe}`);

            // 3) for each indicator, fetch exactly as many bars as it needs
            const rawSignals = [];
            for (const { name, params } of bot.indicators) {
                // determine look-back count
                let needed;
                switch (name) {
                    case 'RSI':
                        needed = (params.period ?? 14) + 2; break;
                    case 'MACD':
                        needed = (params.longPeriod ?? 26) + (params.signalPeriod ?? 9) + 1; break;
                    case 'MA_Crossover':
                        needed = Math.max(params.shortPeriod ?? 5, params.longPeriod ?? 20) + 1; break;
                    case 'Donchian':
                        needed = (params.period ?? 20) + 1; break;
                    case 'Volume':
                        needed = (params.period ?? 14) + 1; break;
                    case 'Heikin_Ashi':
                        needed = 2; break;
                    case 'Combined_RSI_MACD': {
                        const r = (params.period ?? 14) + 2;
                        const m = (params.longPeriod ?? 26) + (params.signalPeriod ?? 9) + 1;
                        needed = Math.max(r, m);
                        break;
                    }
                    case 'Bollinger_Bands':
                        needed = (params.period ?? 20) + 1; break;
                    case 'Stochastic_RSI': {
                        const base = params.period ?? 14;
                        const k = params.kPeriod ?? 3;
                        const d = params.dPeriod ?? 3;
                        needed = base + k + d + 1;
                        break;
                    }
                    default:
                        needed = 50;
                }

                // pull from in-memory, backfill via REST if needed
                let recent = candleStore.getLatestCandles(symbol, timeframe, needed);
                if (recent.length < needed) {
                    const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                    recent = more.concat(recent);
                }

                // instantiate and calculate
                try {
                    const Cls = Indicators[name.replace(/-/g, '')];
                    const instance = new Cls(params);
                    const sig = instance.calculateSignal(recent);
                    rawSignals.push(sig);
                    console.log(`[BotService]  ${bot.name} → ${name} → ${sig}`);
                } catch (e) {
                    console.error(`[BotService]  signal error ${bot.name}/${name}:`, e.message);
                    rawSignals.push('HOLD');
                }
            }

            // 4) aggregate just these signals
            const method = bot.tradeInfo.signalProcessingMethod || 'consensus';
            const finalSignal = method === 'weighted'
                ? this._aggregateWeighted(rawSignals.map(s => ({ signal: s, weight: 1 })))
                : this._aggregateConsensus(rawSignals);
            console.log(`[BotService]  ${bot.name} aggregated (${method}):`, finalSignal);

            // 5) persist & broadcast
            bot.marketInfo.lastSignal = finalSignal;
            await bot.save();
            wsServer.broadcastBotUpdate(bot.toObject());

            // 6) risk check & order
            const { canTrade, reason } = await RiskManagementService.checkRisk(bot);
            if (!canTrade) {
                console.log(`[BotService]  ${bot.name} blocked: ${reason}`);
            } else if (finalSignal !== 'HOLD') {
                console.log(`[BotService]  executing ${finalSignal} for ${bot.name}`);
                await OrderExecutionService.executeOrder(bot, finalSignal, candle.close);
            }
        }
    }

    /** BUY if all BUY, SELL if all SELL, else HOLD */
    _aggregateConsensus(signals) {
        if (!signals.length) return 'HOLD';
        if (signals.every(s => s === 'BUY'))  return 'BUY';
        if (signals.every(s => s === 'SELL')) return 'SELL';
        return 'HOLD';
    }

    /**
     * Weighted: BUY=+1, SELL=-1, HOLD=0 → average;
     * >0.5=>BUY, < -0.5=>SELL, else HOLD
     */
    _aggregateWeighted(signObjs) {
        if (!signObjs.length) return 'HOLD';
        let sum = 0, total = 0;
        for (const { signal, weight } of signObjs) {
            total += weight;
            if (signal === 'BUY')  sum += weight;
            if (signal === 'SELL') sum -= weight;
        }
        const avg = sum / total;
        return avg > 0.5 ? 'BUY' : avg < -0.5 ? 'SELL' : 'HOLD';
    }

    /** backfill via Binance REST if memory is short */
    async _fetchHistorical(symbol, timeframe, count) {
        const resp = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: symbol.replace('/', ''),
                interval: timeframe,
                limit: count
            }
        });
        return resp.data.map(k => ({
            timestamp: new Date(k[0]),
            open:  +k[1],
            high:  +k[2],
            low:   +k[3],
            close: +k[4],
            volume:+k[5],
            isClosed: true
        }));
    }
}

module.exports = new BotService();
