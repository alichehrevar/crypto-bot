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
        // Map<botId, Array<{signal,weight}>>
        this.botSignals = new Map();
    }

    /** Load all active bots and register them */
    async initialize() {
        const bots = await Bot.find({ active: true });
        for (const bot of bots) this.addBot(bot);
    }

    /** Keep an in-memory list of bots per symbol/timeframe */
    addBot(bot) {
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) this.activeBots.set(key, []);
        this.activeBots.get(key).push(bot);
        this.botSignals.set(bot._id.toString(), []);
    }

    /**
     * Core entry point: called on every new candle (closed or updating).
     * - Updates marketInfo in DB
     * - On closed candles: computes signals, aggregates, risk-checks, orders, broadcasts
     *
     * @param {string} symbol   e.g. "BTC/USDT"
     * @param {string} timeframe e.g. "1m"
     * @param {object} candle    { timestamp, open, high, low, close, volume, isClosed }
     */
    async processCandle(symbol, timeframe, candle) {
        const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
        const bots = this.activeBots.get(key) || [];
        if (!bots.length) return;

        // 1) Update in-memory candles and DB marketInfo
        candleStore.updateCandle(symbol, timeframe, candle);
        for (const bot of bots) {
            const last = bot.marketInfo.lastCandle;
            const sameTs = last && new Date(last.timestamp).getTime() === new Date(candle.timestamp).getTime();

            if (sameTs) {
                // updating current open candle price
                bot.marketInfo.currentCandle = { price: candle.close };
            } else {
                // new closed candle arrives
                bot.marketInfo.lastCandle    = { ...candle };
                bot.marketInfo.currentCandle = { price: candle.close };
            }

            // persist every tick so clients see price updates
            await bot.save();

            // 2) only run full logic when candle just closed
            if (!candle.isClosed) continue;

            // 3) gather recent candles (period+1)
            const period = bot.strategyParams?.period || 50;
            const needed = period + 2;
            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);

            if (recent.length < needed) {
                // backfill missing from broker REST
                const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                recent = more.concat(recent);
            }

            // 4) compute each indicator’s raw signal
            let rawSignal = 'HOLD';
            try {
                const IndicatorClass = Indicators[bot.indicator.replace(/-/g,'')];
                const instance = new IndicatorClass(bot.strategyParams);
                rawSignal = instance.calculateSignal(recent);
            } catch (err) {
                console.error(`Signal error for ${bot.name}:`, err.message);
            }

            // store raw signals for aggregation
            const botId = bot._id.toString();
            const signals = this.botSignals.get(botId) || [];
            signals.push({ signal: rawSignal, weight: 1 });
            this.botSignals.set(botId, signals);

            // 5) aggregate
            const method = bot.tradeInfo?.signalProcessingMethod || 'consensus';
            const finalSignal = method === 'weighted'
                ? this._aggregateWeighted(signals)
                : this._aggregateConsensus(signals.map(s => s.signal));

            // clear stored signals after action
            if (finalSignal !== 'HOLD') this.botSignals.set(botId, []);

            // 6) update lastSignal + save
            bot.marketInfo.lastSignal = finalSignal;
            await bot.save();

            // 7) broadcast updated bot state
            wsServer.broadcastBotUpdate(bot.toObject());

            // 8) risk check + order execution
            const { canTrade, reason } = await RiskManagementService.checkRisk(bot);
            if (!canTrade) {
                console.log(`Bot "${bot.name}" blocked (<1h risk>): ${reason}`);
                continue;
            }
            if (finalSignal !== 'HOLD') {
                await OrderExecutionService.executeOrder(bot, finalSignal, candle.close);
            }
        }
    }

    /** Consensus: BUY if *all* “BUY”, SELL if *all* “SELL”, else HOLD */
    _aggregateConsensus(signals) {
        if (!signals.length) return 'HOLD';
        if (signals.every(s => s === 'BUY')) return 'BUY';
        if (signals.every(s => s === 'SELL')) return 'SELL';
        return 'HOLD';
    }

    /**
     * Weighted: map BUY=+1, SELL=-1, HOLD=0; compute weighted average;
     * >0.5 => BUY, < -0.5 => SELL, else HOLD
     */
    _aggregateWeighted(signObjs) {
        if (!signObjs.length) return 'HOLD';
        let sum=0, totalW=0;
        for (const {signal,weight} of signObjs) {
            totalW += weight;
            if (signal==='BUY')  sum += weight;
            if (signal==='SELL') sum -= weight;
        }
        const avg = sum/totalW;
        return avg>0.5 ? 'BUY' : avg< -0.5 ? 'SELL' : 'HOLD';
    }

    /** Fetch closed candles from Binance REST when memory not full */
    async _fetchHistorical(symbol, timeframe, count) {
        const resp = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: symbol.replace('/',''),
                interval: timeframe,
                limit: count
            }
        });
        return resp.data.map(k => ({
            timestamp: new Date(k[0]),
            open: +k[1], high: +k[2], low: +k[3],
            close: +k[4], volume: +k[5], isClosed: true
        }));
    }
}

module.exports = new BotService();
