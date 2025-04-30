// app/services/botService/BotService.js

const axios  = require('axios');
const Bot    = require('../../models/Bot');
const Indicators = require('../../strategies/technical');
const candleStore = require('../../../utils/candleStore');
const wsServer     = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');

class BotService {
    constructor() {
        // Map<"SYMBOL-TIMEFRAME", BotDoc[]>
        this.activeBots = new Map();
        // Map<botId, Promise> to serialize per-bot processing
        this._locks     = new Map();
    }

    /** Load all active bots at startup */
    async initialize() {
        const bots = await Bot.find({ active: true });
        for (const bot of bots) this.addBot(bot);
    }

    /** Register a bot in memory */
    addBot(bot) {
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) this.activeBots.set(key, []);
        this.activeBots.get(key).push(bot);
    }

    /** Remove a bot from memory */
    removeBot(bot) {
        const key = `${bot.symbol.toUpperCase()}-${bot.timeframe.toLowerCase()}`;
        if (!this.activeBots.has(key)) return;
        this.activeBots.set(
            key,
            this.activeBots.get(key).filter(b => !b._id.equals(bot._id))
        );
    }

    /** Consensus aggregation */
    _aggregateConsensus(signals) {
        if (!signals.length)   return 'HOLD';
        if (signals.every(s=>s==='BUY'))  return 'BUY';
        if (signals.every(s=>s==='SELL')) return 'SELL';
        return 'HOLD';
    }

    /** Weighted aggregation */
    _aggregateWeighted(signals) {
        if (!signals.length) return 'HOLD';
        let sum=0, totalW=0;
        signals.forEach(sig=>{
            totalW += 1;
            if (sig==='BUY')  sum += 1;
            if (sig==='SELL') sum -= 1;
        });
        const avg = sum/totalW;
        return avg>0.5 ? 'BUY' : avg< -0.5 ? 'SELL' : 'HOLD';
    }

    /** Backfill via Binance REST */
    async _fetchHistorical(symbol, timeframe, count) {
        const resp = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol:   symbol.replace('/',''),
                interval: timeframe,
                limit:    count
            }
        });
        return resp.data.map(k=>({
            timestamp: new Date(k[0]),
            open:+k[1], high:+k[2], low:+k[3],
            close:+k[4], volume:+k[5], isClosed:true
        }));
    }

    /**
     * Called on every candle update.
     * Serializes per-bot so no two saves ever race.
     */
    async processCandle(symbol, timeframe, candle) {
        const key = `${symbol.toUpperCase()}-${timeframe.toLowerCase()}`;
        const bots = this.activeBots.get(key) || [];
        if (!bots.length) return;

        // 1) update memory
        candleStore.updateCandle(symbol, timeframe, candle);

        for (const bot of bots) {
            // queue each bot on its own promise chain
            const botId = bot._id.toString();
            const prev  = this._locks.get(botId) || Promise.resolve();

            const next = prev
                .catch(()=>{})             // swallow any prior error
                .then(()=> this._handleBot(bot, candle, symbol, timeframe));

            this._locks.set(botId, next);
        }
    }

    /** internal per-bot handler */
    async _handleBot(bot, candle, symbol, timeframe) {
        // a) update marketInfo
        const last = bot.marketInfo.lastCandle;
        const isSameTs = last && new Date(last.timestamp).getTime() === candle.timestamp.getTime();
        if (isSameTs) {
            bot.marketInfo.currentCandle = { price: candle.close };
        } else {
            bot.marketInfo.lastCandle    = { ...candle };
            bot.marketInfo.currentCandle = { price: candle.close };
        }

        // if still open, just save price update + broadcast
        if (!candle.isClosed) {
            await bot.save();
            wsServer.broadcastBotUpdate(bot.toObject());
            return;
        }

        // b) gather signals for each configured indicator
        const signals = [];
        for (const cfg of bot.indicators || []) {
            // skip if mis-configured
            if (!cfg || !cfg.name) {
                console.error(`⚠️  Missing cfg.name on bot "${bot.name}"`);
                continue;
            }
            // only if indicator timeframe matches this candle
            if (cfg.timeframe.toLowerCase() !== timeframe.toLowerCase()) continue;

            // determine lookback
            const p = cfg.params||{};
            let needed;
            switch (cfg.name) {
                case 'RSI':            needed = (p.period||14)+2; break;
                case 'MACD':           needed = (p.longPeriod||26)+(p.signalPeriod||9)+1; break;
                case 'MA_Crossover':   needed = Math.max(p.shortPeriod||5,p.longPeriod||20)+1; break;
                case 'Donchian':       needed = (p.period||20)+1; break;
                case 'Volume':         needed = (p.period||14)+1; break;
                case 'Heikin_Ashi':    needed = 2; break;
                case 'Combined_RSI_MACD': {
                    const r=(p.period||14)+2;
                    const m=(p.longPeriod||26)+(p.signalPeriod||9)+1;
                    needed = Math.max(r,m);
                    break;
                }
                case 'Bollinger_Bands':needed = (p.period||20)+1; break;
                case 'Stochastic_RSI': {
                    const base=p.period||14, k=p.kPeriod||3, d=p.dPeriod||3;
                    needed = base + k + d + 1;
                    break;
                }
                default:               needed = 50;
            }

            // get recent
            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);
            if (recent.length < needed) {
                const more = await this._fetchHistorical(symbol, timeframe, needed-recent.length);
                recent = more.concat(recent);
            }

            // compute
            const key = cfg.name.replace(/-/g,'');
            const Cls = Indicators[key];
            if (!Cls) {
                console.error(`⚠️ Unknown indicator "${cfg.name}" on bot "${bot.name}"`);
                signals.push('HOLD');
            } else {
                try {
                    const inst = new Cls(cfg.params);
                    signals.push(inst.calculateSignal(recent));
                } catch(err) {
                    console.error(`Signal error for "${bot.name}" → ${cfg.name}:`, err.message);
                    signals.push('HOLD');
                }
            }
        }

        // c) aggregate
        const method = bot.tradeInfo?.signalProcessingMethod || 'consensus';
        const finalSignal = method==='weighted'
            ? this._aggregateWeighted(signals)
            : this._aggregateConsensus(signals);

        bot.marketInfo.lastSignal = finalSignal;

        // d) risk + order
        const { canTrade, reason } = await RiskManagementService.checkRisk(bot);
        if (!canTrade) {
            console.log(`🚫 Bot "${bot.name}" blocked:`, reason);
        } else if (finalSignal !== 'HOLD') {
            console.log(`▶️  ${finalSignal} for "${bot.name}" @${candle.close}`);
            await OrderExecutionService.executeOrder(bot, finalSignal, candle.close, null);
        }

        // e) save + broadcast exactly once
        await bot.save();
        wsServer.broadcastBotUpdate(bot.toObject());
    }
}

module.exports = new BotService();
