// app/services/botService/OrderExecutionService.js

const Trade          = require('../../models/Trade');
const RiskStrategy   = require('../../strategies/moneyManagement/RiskManagement');
const BinanceService = require('../binanceWS');
const OkxService     = require('../okxWS');
const BingxService   = require('../bingXWS');

// Models for fetching account credentials
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');

class OrderExecutionService {
    /**
     * Execute a BUY or SELL for a bot, either paper‐trade or via a broker API.
     *
     * @param {Document} bot                    Mongoose Bot document
     * @param {'BUY'|'SELL'} signal            Trading signal
     * @param {number} price                    Execution price
     * @param {Object} [riskStrategyInstance]   Instance with calculatePositionSize()
     */
    async executeOrder(bot, signal, price, riskStrategyInstance) {
        // 1) See if there's already an open trade
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        // 2) Determine quantity
        let quantity;
        if (signal === 'BUY') {
            if (openTrade) {
                console.log(`🔒 Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return;
            }
            // use custom risk strategy or default % of base fund
            if (riskStrategyInstance?.calculatePositionSize) {
                quantity = riskStrategyInstance.calculatePositionSize(
                    bot.paperBalance ?? bot.marketInfo.baseFund,
                    price
                );
            } else {
                const fund = bot.paperBalance ?? bot.marketInfo.baseFund;
                quantity = (fund * (bot.marketInfo.tradeFund / 100)) / price;
            }
        }
        else if (signal === 'SELL') {
            if (!openTrade) {
                console.log(`🔒 Bot "${bot.name}" received SELL but no open trade exists.`);
                return;
            }
            quantity = openTrade.quantity;
        }
        else {
            console.log(`⚪️ HOLD for "${bot.name}", skipping.`);
            return;
        }

        const isPaper = bot.mode === 'paper';
        const orderDetails = {
            symbol:   bot.symbol.replace('/', ''),  // e.g. "BTCUSDT"
            side:     signal,
            type:     'MARKET',
            quantity
        };

        // 3) Execute (paper or real)
        if (isPaper) {
            console.log(`✏️ Paper ${signal} for "${bot.name}" qty=${quantity} @${price}`);
        } else {
            // --- live execution path ---
            if (!bot.accountType || !bot.accountId) {
                console.warn(`⚠️ Bot "${bot.name}" missing accountType or accountId — falling back to paper.`);
            } else {
                let svcModel, brokerService;
                switch (bot.accountType) {
                    case 'binance':
                        svcModel      = BinanceAccount;
                        brokerService = BinanceService;
                        break;
                    case 'okx':
                        svcModel      = OkxAccount;
                        brokerService = OkxService;
                        break;
                    case 'bingx':
                        svcModel      = BingxAccount;
                        brokerService = BingxService;
                        break;
                    default:
                        console.error(`🚫 Unsupported broker type: ${bot.accountType}`);
                }

                if (brokerService && svcModel) {
                    // fetch the account document to get API keys, etc.
                    const account = await svcModel.findById(bot.accountId);
                    if (!account) {
                        console.warn(`⚠️ Bot "${bot.name}" has no credentials stored for ${bot.accountType} accountId ${bot.accountId}. Paper-trading instead.`);
                    } else {
                        try {
                            const resp = await brokerService.executeOrder(orderDetails, account);
                            console.log(`✅ Broker ${signal} response for "${bot.name}":`, resp);
                        } catch (err) {
                            console.error(`❌ Broker ${signal} error for "${bot.name}":`, err);
                        }
                    }
                }
            }
        }

        // 4) Record the trade in our DB
        if (signal === 'BUY') {
            // compute TP/SL levels
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
            console.log(`📝 Saved BUY trade for "${bot.name}" @${price} qty=${quantity}`);
        }
        else {  // SELL closes an open trade
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();
            openTrade.profit    = (price - openTrade.entryPrice) * openTrade.quantity;
            await openTrade.save();
            console.log(`📝 Closed trade for "${bot.name}" @${price}, profit=${openTrade.profit}`);

            // update balances & PnL
            if (bot.mode === 'paper')   bot.paperBalance += openTrade.profit;
            bot.cumulativePnL = (bot.cumulativePnL || 0) + openTrade.profit;

            // check bot‐level TP/SL thresholds
            if (
                (bot.botTP && bot.cumulativePnL >= bot.botTP) ||
                (bot.botSL && bot.cumulativePnL <= bot.botSL)
            ) {
                console.log(`🏁 Bot-level threshold reached for "${bot.name}", deactivating bot.`);
                bot.active = false;
            }
            await bot.save();
        }
    }
}

module.exports = new OrderExecutionService();
