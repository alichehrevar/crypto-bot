// app/services/botService/OrderExecutionService.js

const Trade          = require('../../models/Trade');
const RiskStrategy   = require('../../strategies/moneyManagement/RiskManagement');
const BinanceService = require('../binanceWS');
const OkxService     = require('../okxWS');
const BingxService   = require('../bingXWS');

const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');

const botLogger = require('../../../logs/botLogger');

class OrderExecutionService {

    async executeOrder(bot, signal, price, riskStrategyInstance) {
        const logger = botLogger.getLogger(bot._id.toString());

        await this._log(logger, 'info', `🏁 Starting Execution Phase: ${signal} @ ${price}`, bot);

        // 1) See if there's already an open trade
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        // 2) Determine quantity (CALCULATION TRACKING)
        let quantity;
        if (signal === 'BUY') {
            if (openTrade) {
                await this._log(logger, 'warn', `Block: Already has open trade during BUY signal`, bot);
                return;
            }

            // --- TRACK CALCULATION ---
            const fund = bot.paperBalance ?? bot.marketInfo.baseFund;

            if (riskStrategyInstance?.calculatePositionSize) {
                await this._log(logger, 'info', `🧮 Calculating Position Size (Custom Strategy)`, bot, { fund, price });
                quantity = riskStrategyInstance.calculatePositionSize(fund, price);
            } else {
                const pct = bot.marketInfo.tradeFund || 100;
                await this._log(logger, 'info', `🧮 Calculating Position Size (Fixed %)`, bot, { fund, percent: pct, price });
                quantity = (fund * (pct / 100)) / price;
            }

            await this._log(logger, 'info', `🧮 Calculation Result: Qty = ${quantity}`, bot, { quantity });
        }
        else if (signal === 'SELL') {
            if (!openTrade) {
                await this._log(logger, 'warn', `Block: Received SELL but no open trade exists`, bot);
                return;
            }
            quantity = openTrade.quantity;
            await this._log(logger, 'info', `Closing Position: Qty = ${quantity}`, bot);
        }
        else {
            await this._log(logger, 'info', `Signal is HOLD. Skipping execution.`, bot);
            return;
        }

        const isPaper = bot.mode === 'paper';
        const orderDetails = {
            symbol:   bot.symbol.replace('/', ''),
            side:     signal,
            type:     'MARKET',
            quantity
        };

        // 3) Execute (paper or real)
        if (isPaper) {
            await this._log(logger, 'info', `📝 Executing PAPER ${signal}`, bot, orderDetails);
        } else {
            // --- LIVE EXECUTION PATH ---
            if (!bot.accountType || !bot.accountId) {
                await this._log(logger, 'error', `Missing Account Config. Falling back to paper.`, bot);
            } else {
                let svcModel, brokerService;
                switch (bot.accountType) {
                    case 'binance': svcModel = BinanceAccount; brokerService = BinanceService; break;
                    case 'okx':     svcModel = OkxAccount;     brokerService = OkxService;     break;
                    case 'bingx':   svcModel = BingxAccount;   brokerService = BingxService;   break;
                    default:
                        await this._log(logger, 'error', `Unsupported broker: ${bot.accountType}`, bot);
                }

                if (brokerService && svcModel) {
                    const account = await svcModel.findById(bot.accountId);
                    if (!account) {
                        await this._log(logger, 'error', `Credentials not found for ${bot.accountType}`, bot);
                    } else {
                        try {
                            // LOG REQUEST
                            await this._log(logger, 'info', `🚀 Sending Order to Broker...`, bot, orderDetails);

                            const resp = await brokerService.executeOrder(orderDetails, account);

                            // LOG RESPONSE
                            await this._log(logger, 'info', `✅ Broker Response Success`, bot, { response: resp });
                        } catch (err) {
                            await this._log(logger, 'error', `❌ Broker Execution Failed`, bot, { error: err.message });
                        }
                    }
                }
            }
        }

        // 4) Record the trade in our DB
        if (signal === 'BUY') {
            const { TP, SL } = RiskStrategy.calculateTPSL(bot.strategyParams, price);
            const t = new Trade({
                bot:        bot._id,
                symbol:     bot.symbol,
                type:       'BUY',
                entryPrice: price,
                quantity,
                TP,
                SL,
                timestamp:  new Date()
            });
            await t.save();
            await this._log(logger, 'info', `💾 DB: Saved BUY Trade`, bot, { price, qty: quantity, TP, SL });
        }
        else {  // SELL
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();
            openTrade.profit    = (price - openTrade.entryPrice) * openTrade.quantity;
            await openTrade.save();

            await this._log(logger, 'info', `💾 DB: Closed Trade`, bot, {
                entry: openTrade.entryPrice,
                exit: price,
                profit: openTrade.profit
            });

            // update balances & PnL
            if (bot.mode === 'paper')   bot.paperBalance += openTrade.profit;
            bot.cumulativePnL = (bot.cumulativePnL || 0) + openTrade.profit;

            // check bot‐level TP/SL thresholds
            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                await this._log(logger, 'warn', `🏁 Bot-level PnL threshold reached. Deactivating bot.`, bot, {
                    cumulativePnL: bot.cumulativePnL,
                    tp: bot.botTP,
                    sl: bot.botSL
                });
                bot.active = false;
            }
            await bot.save();
        }
    }

    async _log(logger, level, message, bot, meta = {}) {
        if (logger && logger[level]) {
            logger[level](message, meta);
        }
    }
}

module.exports = new OrderExecutionService();
