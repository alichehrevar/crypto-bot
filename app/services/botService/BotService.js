// app/services/botService/BotService.js

const axios  = require('axios');
const BotBase    = require('../../models/BotBase');
const Trade      = require('../../models/Trade'); // ADDED: Required for DB updates
const { CustomAIWorkflowJob_DefaultDB } = require('../../models/N8nWorkflowJob');
const Indicators = require('../../strategies/technical');
const candleStore = require('../../../utils/candleStore');
const wsServer     = require('../WebSocketServer');
const OrderExecutionService = require('./OrderExecutionService');
const RiskManagementService = require('./RiskManagementService');
const ExchangeService       = require('./ExchangeService'); // ADDED: To listen to fills
const botLogger = require('../../../logs/botLogger');

class BotService {
    constructor() {
        // Map<"SYMBOL-TIMEFRAME", BotDoc[]>
        this.activeBots = new Map();

        // promise-locks so each bot's save is serialized
        this._locks     = new Map();

        // CACHE: Store N8n code strings in memory to avoid DB hits every candle
        this._n8nCodeCache = new Map();

        // CACHE: Track the last processed candle timestamp per bot to prevent log spam
        // Map<botId, lastTimestamp>
        this._processedCandles = new Map();
    }

    /** Load all active bots at startup */
    async initialize() {
        const serviceLogger = botLogger.getLogger('BotService');
        await this._log(serviceLogger, 'info', 'Starting BotService initialization', null);

        console.log('[BotService] Initializing...');
        await this._log(serviceLogger, 'debug', 'Fetching active bots from database', null);

        const bots = await BotBase.find({ active: true });
        await this._log(serviceLogger, 'info', `Found ${bots.length} active bots in database`, null, {
            botCount: bots.length
        });

        console.log(`[BotService] Found ${bots.length} active bots.`);

        await this._log(serviceLogger, 'info', 'Starting bot registration process', null, {
            botsToRegister: bots.map(b => ({ id: b._id, name: b.name }))
        });

        for (const bot of bots) {
            await this._log(serviceLogger, 'debug', `Registering bot: ${bot.name} (${bot._id})`, null);
            this.registerBot(bot);
        }

        console.log('[BotService] Initialization complete.');
        await this._log(serviceLogger, 'info', 'BotService initialization completed successfully', null, {
            totalBotsRegistered: this.activeBots.size
        });
    }

    /** Register a brand-new bot in memory */
    registerBot(bot) {
        const logger = botLogger.getLogger(bot._id.toString());
        this._log(logger, 'info', `Starting registration for bot ${bot.name} (${bot.symbol})`, bot, {
            botType: bot.botType,
            timeframe: bot.timeframe
        }).catch(err => console.error(err));

        const timeframe = bot.timeframe || '1m';
        const key = `${bot.symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;
        this._log(logger, 'debug', `Generated bot key: ${key}`, bot);

        if (!this.activeBots.has(key)) {
            this._log(logger, 'debug', `Creating new array for key: ${key}`, bot);
            this.activeBots.set(key, []);
        }

        const botArray = this.activeBots.get(key);

        const exists = botArray.some(b => b._id.equals(bot._id));
        if (!exists) {
            botArray.push(bot);
            this._log(logger, 'info', `Bot ${bot.name} successfully registered`, bot, {
                totalBotsForKey: botArray.length,
                key: key
            });

            // ==============================================================
            // NEW: EXCHANGE LISTENER FOR LIVE BOTS (TP/SL Fills)
            // ==============================================================
            if (bot.mode === 'live') {
                this._log(logger, 'info', `📡 Attaching Exchange Fill listener for ${bot.symbol}`, bot);

                ExchangeService.subscribeOrderFills(
                    bot.userId.toString(),
                    bot.symbol,
                    async (tradeUpdate) => {
                        try {
                            // 1. Check if bot has an open trade
                            const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });
                            if (!openTrade) return;

                            // 2. Validate if the exchange action closes our direction
                            const isClosingTrade = (openTrade.type === 'BUY' && tradeUpdate.side.toUpperCase() === 'SELL') ||
                                (openTrade.type === 'SELL' && tradeUpdate.side.toUpperCase() === 'BUY');

                            if (isClosingTrade) {
                                await this._log(logger, 'info', `🔔 Exchange auto-closed trade for ${bot.name} via TP/SL!`, bot, { tradePrice: tradeUpdate.price });

                                // 3. Update Trade
                                openTrade.exitPrice = tradeUpdate.price;
                                openTrade.timestamp = new Date(tradeUpdate.timestamp || Date.now());

                                const multiplier = openTrade.type === 'BUY' ? 1 : -1;
                                openTrade.profit = (tradeUpdate.price - openTrade.entryPrice) * openTrade.quantity * multiplier;

                                await openTrade.save();

                                // 4. Update Bot PnL
                                bot.cumulativePnL = (bot.cumulativePnL || 0) + openTrade.profit;

                                // 5. Check Bot Hard Limits
                                if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                                    await this._log(logger, 'warn', `🏁 Bot PnL Limit Reached via Exchange Fill. Stopping.`, bot);
                                    bot.active = false;
                                    this.deactivateBot(bot); // Remove from memory mapping
                                }

                                await bot.save();
                                wsServer.broadcastBotUpdate(bot.toObject());
                            }
                        } catch (err) {
                            await this._log(logger, 'error', `Failed handling exchange fill callback: ${err.message}`, bot);
                        }
                    }
                );
            }
            // ==============================================================

        } else {
            this._log(logger, 'warn', `Bot ${bot.name} is already registered under key ${key}`, bot);
        }
    }

    /** Update an existing bot in memory */
    updateBot(updated) {
        const logger = botLogger.getLogger(updated._id.toString());
        this._log(logger, 'info', `Starting update for bot ${updated.name} (${updated.symbol})`, updated, {
            previousState: 'active in memory'
        }).catch(err => console.error(err));

        const timeframe = updated.timeframe || '1m';
        const key = `${updated.symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;
        this._log(logger, 'debug', `Looking for bot with key: ${key}`, updated);

        if (!this.activeBots.has(key)) {
            this._log(logger, 'warn', `Key ${key} not found in activeBots, bot may not be registered`, updated);
            return;
        }

        const arr = this.activeBots.get(key);
        this._log(logger, 'debug', `Found ${arr.length} bots for key ${key}`, updated);

        this.activeBots.set(key,
            arr.map(b => {
                if (b._id.equals(updated._id)) {
                    this._log(logger, 'debug', `Found matching bot to update: ${b.name}`, updated).catch(err => console.error(err));
                    return updated;
                }
                return b;
            })
        );

        this._log(logger, 'info', `Bot ${updated.name} successfully updated in memory`, updated);
    }

    /** Deactivate a bot */
    deactivateBot(bot) {
        const logger = botLogger.getLogger(bot._id.toString());
        this._log(logger, 'info', `Starting deactivation for bot ${bot.name} (${bot.symbol})`, bot, {
            reason: 'manual deactivation'
        }).catch(err => console.error(err));

        const timeframe = bot.timeframe || '1m';
        const key = `${bot.symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;

        if (!this.activeBots.has(key)) {
            return;
        }

        const arr = this.activeBots.get(key);
        const initialCount = arr.length;
        this._log(logger, 'debug', `Found ${initialCount} bots for key ${key} before deactivation`, bot);

        const filteredArr = arr.filter(b => !b._id.equals(bot._id));
        this.activeBots.set(key, filteredArr);

        // Clear cache
        this._processedCandles.delete(bot._id.toString());
        this._log(logger, 'debug', `Cleared processedCandles cache for bot ${bot._id}`, bot);

        this._log(logger, 'info', `Bot ${bot.name} successfully deactivated`, bot, {
            botsRemainingForKey: filteredArr.length,
            botsRemoved: initialCount - filteredArr.length
        });
    }

    /** Consensus aggregation */
    _aggregateConsensus(signals) {
        const serviceLogger = botLogger.getLogger('BotService');
        this._log(serviceLogger, 'debug', 'Starting consensus aggregation', null, {
            signals: signals,
            signalCount: signals.length
        }).catch(err => console.error(err));

        if (!signals.length) {
            this._log(serviceLogger, 'debug', 'No signals provided, returning HOLD', null).catch(err => console.error(err));
            return 'HOLD';
        }

        if (signals.every(s => s==='BUY')) {
            this._log(serviceLogger, 'debug', 'All signals are BUY, returning BUY', null).catch(err => console.error(err));
            return 'BUY';
        }

        if (signals.every(s => s==='SELL')) {
            this._log(serviceLogger, 'debug', 'All signals are SELL, returning SELL', null).catch(err => console.error(err));
            return 'SELL';
        }

        this._log(serviceLogger, 'debug', 'Mixed signals, returning HOLD', null).catch(err => console.error(err));
        return 'HOLD';
    }

    /** Weighted aggregation */
    _aggregateWeighted(signals) {
        const serviceLogger = botLogger.getLogger('BotService');
        this._log(serviceLogger, 'debug', 'Starting weighted aggregation', null, {
            signals: signals,
            signalCount: signals.length
        }).catch(err => console.error(err));

        if (!signals.length) {
            this._log(serviceLogger, 'debug', 'No signals provided, returning HOLD', null).catch(err => console.error(err));
            return 'HOLD';
        }

        let sum = 0, totalW = 0;
        this._log(serviceLogger, 'debug', 'Calculating weighted sum', null).catch(err => console.error(err));

        for (const s of signals) {
            totalW += 1;
            if (s==='BUY')  sum += 1;
            if (s==='SELL') sum -= 1;
        }

        const avg = sum/totalW;
        this._log(serviceLogger, 'debug', 'Weighted calculation complete', null, {
            sum: sum,
            totalWeight: totalW,
            average: avg
        }).catch(err => console.error(err));

        if (avg > 0.5) {
            this._log(serviceLogger, 'debug', `Average ${avg} > 0.5, returning BUY`, null).catch(err => console.error(err));
            return 'BUY';
        }

        if (avg < -0.5) {
            this._log(serviceLogger, 'debug', `Average ${avg} < -0.5, returning SELL`, null).catch(err => console.error(err));
            return 'SELL';
        }

        this._log(serviceLogger, 'debug', `Average ${avg} between -0.5 and 0.5, returning HOLD`, null).catch(err => console.error(err));
        return 'HOLD';
    }

    /** Simple REST backfill via Binance */
    async _fetchHistorical(symbol, timeframe, count) {
        const serviceLogger = botLogger.getLogger('BotService');
        await this._log(serviceLogger, 'info', 'Fetching historical candle data from Binance', null, {
            symbol: symbol,
            timeframe: timeframe,
            count: count
        });

        try {
            await this._log(serviceLogger, 'debug', 'Preparing API request to Binance', null);
            const resp = await axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                    symbol:   symbol.replace('/',''),
                    interval: timeframe,
                    limit:    count
                }
            });

            await this._log(serviceLogger, 'info', 'Successfully fetched historical data', null, {
                dataPointsReceived: resp.data.length,
                status: resp.status
            });

            const candles = resp.data.map(k => ({
                timestamp: new Date(k[0]),
                open:      +k[1],
                high:      +k[2],
                low:       +k[3],
                close:     +k[4],
                volume:    +k[5],
                isClosed:  true
            }));

            await this._log(serviceLogger, 'debug', 'Transformed API response to candle format', null, {
                firstCandle: candles[0]?.timestamp,
                lastCandle: candles[candles.length - 1]?.timestamp
            });

            return candles;
        } catch (error) {
            await this._log(serviceLogger, 'error', `Error fetching historical data from Binance: ${error.message}`, null, {
                symbol: symbol,
                timeframe: timeframe,
                error: error.message,
                stack: error.stack
            });
            console.error(`[BotService] Error fetching history: ${error.message}`);
            return [];
        }
    }

    /** Helper: Fetch and Cache N8n Code */
    async _getN8nCode(jobId) {
        const serviceLogger = botLogger.getLogger('BotService');
        await this._log(serviceLogger, 'info', 'Fetching N8N code from cache or database', null, { jobId });

        if (this._n8nCodeCache.has(jobId)) {
            return this._n8nCodeCache.get(jobId);
        }

        try {
            // 1. Fetch from the DEFAULT DB where dbSyncService saved it
            const job = await CustomAIWorkflowJob_DefaultDB.findById(jobId);

            if (!job) {
                await this._log(serviceLogger, 'warn', 'N8N job not found in Default DB', null, { jobId });
                return null;
            }

            // 2. Safely extract the code (Handling both 'code' and 'fullCode' keys)
            const generatedCode = job.responsePayload?.generatedCode;
            const code = generatedCode?.code || generatedCode?.fullCode;

            if (!code) {
                await this._log(serviceLogger, 'warn', 'Job found but no generated code available', null, { jobId });
                return null;
            }

            this._n8nCodeCache.set(jobId, code);
            await this._log(serviceLogger, 'info', 'N8N code successfully cached', null, { jobId });

            return code;
        } catch (err) {
            await this._log(serviceLogger, 'error', `Failed to fetch N8N Job ${jobId}: ${err.message}`);
            return null;
        }
    }

    async _log(mongoLogger, level, message, bot, meta = {}) {
        // Create service logger if none provided
        if (!mongoLogger) {
            mongoLogger = botLogger.getLogger('BotService');
        }

        // Only log to Mongo if the logger exists
        if (mongoLogger) {
            await this._logToDatabase(mongoLogger, level, message, bot, meta);
        }

        // Console logging based on level
        await this._logToConsole(level, message, bot);
    }

    async _logToDatabase(mongoLogger, level, message, bot, meta) {
        try {
            mongoLogger.log({
                level,
                message,
                // Convert ObjectId to String for consistency
                botId: bot ? bot._id.toString() : 'service',
                ...meta
            });
        } catch (dbError) {
            console.error(`[BotService] Failed to write log to database: ${dbError.message}`);
        }
    }

    async _logToConsole(level, message, bot) {
        const botName = bot ? bot.name : 'BotService';
        const logMessage = `[${botName}] ${message}`;

        switch (level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'info':
                console.log(logMessage);
                break;
            case 'debug':
                // Only log debug in development
                if (process.env.NODE_ENV === 'development') {
                    console.debug(logMessage);
                }
                break;
            default:
                console.log(logMessage);
        }
    }

    async processCandle(symbol, timeframe, candle) {
        const serviceLogger = botLogger.getLogger('BotService');
        await this._log(serviceLogger, 'info', 'Processing new candle update', null, {
            symbol: symbol,
            timeframe: timeframe,
            timestamp: candle.timestamp,
            price: candle.close,
            isClosed: candle.isClosed
        });

        // Normalize Key
        const key = `${symbol.toUpperCase().replaceAll('/USDT', '')}-${timeframe.toLowerCase()}`;
        await this._log(serviceLogger, 'debug', `Normalized key: ${key}`, null);

        const bots = this.activeBots.get(key) || [];
        await this._log(serviceLogger, 'info', `Found ${bots.length} active bots for key ${key}`, null);

        if (!bots.length) {
            await this._log(serviceLogger, 'debug', 'No active bots for this symbol-timeframe, skipping', null);
            return;
        }

        // Update memory store
        await this._log(serviceLogger, 'debug', 'Updating candle store with new candle', null);
        candleStore.updateCandle(symbol, timeframe, candle);
        await this._log(serviceLogger, 'debug', 'Candle store updated successfully', null);

        for (const bot of bots) {
            const botId = bot._id.toString();
            const prev  = this._locks.get(botId) || Promise.resolve();
            await this._log(serviceLogger, 'debug', `Setting up lock for bot ${bot.name} (${botId})`, null);

            const next = prev
                .catch(() => {
                    this._log(serviceLogger, 'warn', `Previous lock promise rejected for bot ${bot.name}`, bot).catch(err => console.error(err));
                })
                .then(() => this._handleBot(bot, candle, symbol, timeframe));

            this._locks.set(botId, next);
            await this._log(serviceLogger, 'debug', `Lock set for bot ${bot.name}, processing will proceed serially`, null);
        }

        await this._log(serviceLogger, 'info', 'Candle processing initiated for all bots', null, {
            botsProcessed: bots.length
        });
    }

    async _handleBot(bot, candle, symbol, timeframe) {
        const logger = botLogger.getLogger(bot._id.toString());
        const botIdStr = bot._id.toString();

        // Log method entry
        await this._log(logger, 'info', '🔄 Starting to process candle for bot', bot, {
            symbol: symbol,
            timeframe: timeframe,
            candleTimestamp: candle.timestamp,
            isClosed: candle.isClosed
        });

        if (bot.botType === 'dca') {
            await this._log(logger, 'info', 'Bot is DCA type, skipping indicator processing', bot);
            return;
        }

        // ——— 1. CHECK IF NEW CANDLE (Log Once per Timeframe) ———
        const lastSeenTime = this._processedCandles.get(botIdStr);
        const currentCandleTime = new Date(candle.timestamp).getTime();
        const isNewCandleInterval = lastSeenTime !== currentCandleTime;

        await this._log(logger, 'debug', 'Checking if new candle interval', bot, {
            lastSeenTime: lastSeenTime ? new Date(lastSeenTime).toISOString() : null,
            currentCandleTime: new Date(currentCandleTime).toISOString(),
            isNewCandleInterval: isNewCandleInterval
        });

        // Update local memory for UI display (Live Price)
        bot.marketInfo = bot.marketInfo || {};
        bot.marketInfo.currentCandle = { price: candle.close };

        await this._log(logger, 'debug', `Updated marketInfo.currentCandle with price: ${candle.close}`, bot);

        // ——— 2. LOGGING CONTROL ———
        if (isNewCandleInterval) {
            await this._log(logger, 'info', `📊 New ${timeframe} Candle Started. Open: ${candle.open}, Date: ${new Date(candle.timestamp).toISOString()}`, bot);
            this._processedCandles.set(botIdStr, currentCandleTime);

            await this._log(logger, 'debug', `Updated processedCandles cache for bot ${botIdStr}`, bot, {
                newTimestamp: currentCandleTime
            });
        }

        // ——— 3. IF CANDLE IS NOT CLOSED ———
        if (!candle.isClosed) {
            await this._log(logger, 'info', '⏳ Candle is still open, broadcasting update and exiting', bot);
            wsServer.broadcastBotUpdate(bot.toObject());
            await this._log(logger, 'debug', 'Broadcast sent via WebSocket', bot);
            return;
        }

        // ——— 4. CANDLE IS CLOSED (Process Logic Now) ———
        await this._log(logger, 'info', '🏁 Candle Closed - Processing logic started', bot, {
            closePrice: candle.close,
            volume: candle.volume
        });

        bot.marketInfo.lastCandle = { ...candle };
        await this._log(logger, 'debug', 'Updated marketInfo.lastCandle with closed candle data', bot);

        await this._log(logger, 'info', `🏁 Candle Closed. Price: ${candle.close}. Calculating Indicators...`, bot, {
            price: candle.close,
            volume: candle.volume
        });

        // ——— Compute Indicators ———
        const signals = [];
        const indicatorResults = {}; // For detailed logging

        const indicatorCount = bot.indicators?.length || 0;
        await this._log(logger, 'info', `Starting indicator calculations for ${indicatorCount} indicators`, bot, {
            indicatorNames: bot.indicators?.map(i => i.name) || []
        });

        for (const [index, cfg] of (bot.indicators || []).entries()) {
            await this._log(logger, 'debug', `Processing indicator ${index + 1}/${indicatorCount}: ${cfg.name || 'unnamed'}`, bot, {
                indicatorConfig: cfg
            });

            if (!cfg.name) {
                await this._log(logger, 'warn', 'Indicator has no name, skipping', bot);
                signals.push('HOLD');
                continue;
            }

            if (cfg.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
                await this._log(logger, 'debug', `Indicator timeframe (${cfg.timeframe}) doesn't match candle timeframe (${timeframe}), skipping`, bot);
                signals.push('HOLD');
                continue;
            }

            await this._log(logger, 'debug', `Processing indicator: ${cfg.name}`, bot, {
                params: cfg.params
            });

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
                default:
                    await this._log(logger, 'debug', `Using default needed candles (50) for ${cfg.name}`, bot);
            }

            await this._log(logger, 'debug', `Indicator ${cfg.name} requires ${needed} historical candles`, bot);

            // Fetch Candles
            let recent = candleStore.getLatestCandles(symbol, timeframe, needed);
            await this._log(logger, 'debug', `Retrieved ${recent.length} candles from candleStore`, bot, {
                needed: needed,
                available: recent.length
            });

            if (recent.length < needed) {
                await this._log(logger, 'debug', `Fetching historical data for ${cfg.name}. Needed: ${needed}, Available: ${recent.length}`, bot);
                // Fetch historical only if absolutely needed (expensive op)
                const more = await this._fetchHistorical(symbol, timeframe, needed - recent.length);
                await this._log(logger, 'debug', `Fetched ${more.length} historical candles`, bot);
                recent = more.concat(recent);
                await this._log(logger, 'debug', `Total candles after historical fetch: ${recent.length}`, bot);
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

            await this._log(logger, 'debug', `Found indicator class: ${key}`, bot);

            try {
                // N8N Code Injection
                if (key === 'N8NBotRunner') {
                    const jobId = cfg.params.jobId;
                    if (jobId) {
                        await this._log(logger, 'debug', `N8N indicator detected, fetching code for job ${jobId}`, bot);
                        const code = await this._getN8nCode(jobId);
                        if (code) {
                            cfg.params.generatedCode = code;
                            await this._log(logger, 'debug', `N8N code loaded (${code.length} chars)`, bot);
                        } else {
                            await this._log(logger, 'warn', `N8N code not found for job ${jobId}`, bot);
                        }
                    }
                }

                await this._log(logger, 'debug', `Instantiating ${key} indicator with params`, bot, {
                    params: cfg.params
                });
                const inst = new Cls(cfg.params);

                await this._log(logger, 'debug', `Calculating signal with ${recent.length} candles`, bot);
                const signal = inst.calculateSignal(recent);
                signals.push(signal);

                indicatorResults[cfg.name] = signal;
                await this._log(logger, 'info', `Indicator ${cfg.name} result: ${signal}`, bot, {
                    signal: signal,
                    indicatorIndex: index
                });

            } catch (err) {
                await this._log(logger, 'error', `Calc Error [${cfg.name}]: ${err.message}`, bot, {
                    error: err.message,
                    stack: err.stack
                });
                signals.push('HOLD');
            }
        }

        await this._log(logger, 'info', 'All indicators calculated', bot, {
            signals: signals,
            indicatorResults: indicatorResults
        });

        // ——— Aggregation ———
        const method = bot.tradeInfo?.signalProcessingMethod || 'consensus';
        await this._log(logger, 'debug', `Aggregating signals using method: ${method}`, bot, {
            availableMethods: ['consensus', 'weighted'],
            selectedMethod: method
        });

        const finalSignal = method === 'weighted'
            ? this._aggregateWeighted(signals)
            : this._aggregateConsensus(signals);

        bot.marketInfo.lastSignal = finalSignal;
        await this._log(logger, 'debug', `Final signal stored in marketInfo: ${finalSignal}`, bot);

        await this._log(logger, 'info', `Calculations Complete.`, bot, {
            indicators: indicatorResults,
            finalSignal: finalSignal,
            method: method,
            signalCount: signals.length
        });

        // ——— Execution ———
        if (finalSignal !== 'HOLD') {
            await this._log(logger, 'info', `🚀 ${finalSignal} signal detected, checking risk management`, bot);
            const { canTrade, reason } = await RiskManagementService.checkRisk(bot);

            if (!canTrade) {
                await this._log(logger, 'warn', `🚫 Blocked by Risk: ${reason}`, bot, {
                    riskCheckResult: { canTrade, reason }
                });
            } else {
                await this._log(logger, 'info', `🚀 Risk check passed, executing ${finalSignal} order`, bot, {
                    price: candle.close
                });
                await OrderExecutionService.executeOrder(bot, finalSignal, candle.close, null);
                await this._log(logger, 'info', `Order execution initiated for ${finalSignal}`, bot);
            }
        } else {
            await this._log(logger, 'info', `Signal is HOLD. No action taken.`, bot);
        }

        // ——— E) SAVE TO DB (Only done on Candle Close) ———
        await this._log(logger, 'info', 'Saving bot state to database', bot);
        await bot.save();
        await this._log(logger, 'debug', 'Bot state saved successfully', bot);

        await this._log(logger, 'info', 'Broadcasting bot update via WebSocket', bot);
        wsServer.broadcastBotUpdate(bot.toObject());
        await this._log(logger, 'debug', 'WebSocket broadcast complete', bot);

        await this._log(logger, 'info', 'Candle processing complete for bot', bot, {
            finalSignal: finalSignal,
            processingTime: new Date().toISOString()
        });
    }
}

module.exports = new BotService();
