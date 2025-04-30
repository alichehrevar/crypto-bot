// app/services/botService/OrderExecutionService.js

const Trade = require('../../models/Trade');
const { createRiskStrategy } = require('./botFactory');
const RiskStrategy = require('../../strategies/moneyManagement/RiskManagement');
const BingxService = require('../bingXWS');
const BinanceService = require('../binanceWS');
const OkxService = require('../okxWS');

class OrderExecutionService {
    /**
     * Executes a trade based on the given signal.
     * Builds its own risk‐strategy instance from bot.riskStrategy / bot.riskParams.
     *
     * @param {Object} bot
     * @param {'BUY'|'SELL'} signal
     * @param {number} price
     */
    async executeOrder(bot, signal, price) {
        // 1) instantiate your money‐management strategy
        const riskStrategyInstance = createRiskStrategy(bot);

        // 2) look for an existing open trade
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        // 3) common order payload
        const orderDetails = {
            symbol: bot.symbol,
            orderType: 'MARKET',
            side: signal,
        };

        if (signal === 'BUY') {
            // if already long, skip
            if (openTrade) {
                console.log(`Bot "${bot.name}" attempted BUY but already has an open position.`);
                return;
            }

            // compute position size
            let quantity;
            if (typeof riskStrategyInstance.calculatePositionSize === 'function') {
                quantity = riskStrategyInstance.calculatePositionSize(
                    bot.paperBalance, price
                );
            } else {
                // fallback: 1% of balance
                quantity = (bot.paperBalance * 0.01) / price;
            }

            orderDetails.quantity = quantity;

            // send to broker
            try {
                const resp = await this.executeBotOrder(bot, orderDetails);
                console.log(`Broker BUY response:`, resp);
            } catch (err) {
                console.error(`Broker BUY error:`, err);
            }

            // compute TP/SL
            const { TP, SL } = RiskStrategy.calculateTPSL(bot.strategyParams, price);

            // record locally
            const trade = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: price,
                quantity,
                timestamp: new Date()
            });
            await trade.save();

            console.log(
                `BOT ${bot.name} BUY @${price} qty=${quantity} TP=${TP} SL=${SL}`
            );
        }
        else if (signal === 'SELL') {
            // no open trade ⇒ nothing to close
            if (!openTrade) {
                console.log(`Bot "${bot.name}" received SELL but no open trade.`);
                return;
            }

            // send market‐sell for the same qty
            orderDetails.quantity = openTrade.quantity;

            try {
                const resp = await this.executeBotOrder(bot, orderDetails);
                console.log(`Broker SELL response:`, resp);
            } catch (err) {
                console.error(`Broker SELL error:`, err);
            }

            // finalize local record
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();
            openTrade.profit = (price - openTrade.entryPrice) * openTrade.quantity;
            await openTrade.save();

            console.log(
                `BOT ${bot.name} SELL @${price} profit=${openTrade.profit}`
            );

            // paper balance PnL update
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += openTrade.profit;
            }
            bot.cumulativePnL = (bot.cumulativePnL || 0) + openTrade.profit;

            // check bot‐level TP/SL
            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) ||
                (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                console.log(`Bot "${bot.name}" reached PnL limit, deactivating.`);
                bot.active = false;
            }
            await bot.save();
        }
    }

    /**
     * Send the order to the correct broker service.
     * @param {Object} bot
     * @param {object} orderDetails
     */
    async executeBotOrder(bot, orderDetails) {
        let svc;
        switch (bot.accountType) {
            case 'binance':  svc = BinanceService; break;
            case 'okx':      svc = OkxService;     break;
            case 'bingx':    svc = BingxService;   break;
            default:
                throw new Error(`Unsupported broker: ${bot.accountType}`);
        }

        // assume bot.account is already populated with { apiKey, secretKey, … }
        return svc.executeOrder(orderDetails, bot.account);
    }
}

module.exports = new OrderExecutionService();
