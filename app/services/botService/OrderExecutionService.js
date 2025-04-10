const Trade = require('../../models/Trade');
const RiskStrategy = require('../../strategies/moneyManagement/RiskManagement'); // For calculating TP/SL
const BingxService = require('../bingXWS');
const BinanceService = require('../binanceWS');
const OkxService = require('../okxWS');

class OrderExecutionService {
    /**
     * Executes a trade based on the given signal.
     * When a signal occurs (BUY/SELL), in addition to updating local trade records,
     * it calls executeBotOrder to send an order to the broker.
     *
     * @param {Object} bot - The bot document.
     * @param {string} signal - 'BUY' or 'SELL'
     * @param {number} price - The current market price.
     * @param {Object} riskStrategyInstance - Instance for risk management strategy (if available).
     */
    async executeOrder(bot, signal, price, riskStrategyInstance) {
        // Check if there is an open trade for the bot.
        const openTrade = await Trade.findOne({ bot: bot._id, exitPrice: null });

        // Determine order details common to both BUY and SELL signals.
        let orderDetails = {
            symbol: bot.symbol,
            // You can extend these details as required by the broker's API.
            orderType: 'MARKET',
        };

        // ----- BUY Signal Logic -----
        if (signal === 'BUY') {
            if (openTrade) {
                console.log(`Bot "${bot.name}" tried to BUY but already has an open trade.`);
                return;
            }
            // Calculate quantity based on risk strategy; fallback to a default calculation.
            let quantity = riskStrategyInstance.calculatePositionSize
                ? riskStrategyInstance.calculatePositionSize(bot.paperBalance, price)
                : (bot.paperBalance * 0.01) / price;

            // Extend order details for a BUY order.
            orderDetails = {
                ...orderDetails,
                side: 'BUY',
                quantity,
            };

            // Call the broker-specific order execution.
            try {
                const brokerResponse = await this.executeBotOrder(bot, orderDetails);
                console.log(`Broker response for BUY:`, brokerResponse);
            } catch (error) {
                console.error(`Error executing BUY order via broker:`, error);
            }

            // Compute TP/SL levels using your risk management module.
            const { TP, SL } = RiskStrategy.calculateTPSL(bot.strategyParams, price);

            // Create and save the trade locally.
            const newTrade = new Trade({
                bot: bot._id,
                symbol: bot.symbol,
                type: 'BUY',
                entryPrice: price,
                quantity,
                timestamp: new Date()
            });
            await newTrade.save();
            console.log(`Bot "${bot.name}" opened BUY at ${price} with quantity ${quantity}, TP: ${TP}, SL: ${SL}`);
        }
        // ----- SELL Signal Logic -----
        else if (signal === 'SELL') {
            if (!openTrade) {
                console.log(`Bot "${bot.name}" received SELL signal but no open trade exists.`);
                return;
            }

            // Extend order details for a SELL order.
            orderDetails = {
                ...orderDetails,
                side: 'SELL',
                quantity: openTrade.quantity,
            };

            // Call the broker-specific order execution.
            try {
                const brokerResponse = await this.executeBotOrder(bot, orderDetails);
                console.log(`Broker response for SELL:`, brokerResponse);
            } catch (error) {
                console.error(`Error executing SELL order via broker:`, error);
            }

            // Update the open trade locally.
            openTrade.exitPrice = price;
            openTrade.timestamp = new Date();
            openTrade.profit = (price - openTrade.entryPrice) * openTrade.quantity;
            await openTrade.save();
            console.log(`Bot "${bot.name}" closed trade at ${price}. Profit: ${openTrade.profit}`);

            // Update paper balance for paper trading bots.
            if (bot.mode === 'paper' && typeof bot.paperBalance === 'number') {
                bot.paperBalance += openTrade.profit;
            }
            // Update cumulative PnL.
            bot.cumulativePnL = (bot.cumulativePnL || 0) + openTrade.profit;

            // Check bot-level take profit and stop loss thresholds.
            if ((bot.botTP && bot.cumulativePnL >= bot.botTP) || (bot.botSL && bot.cumulativePnL <= bot.botSL)) {
                console.log(`Bot "${bot.name}" has reached its bot-level TP/SL threshold. Stopping further trading.`);
                bot.active = false;
            }
            await bot.save();
        }
    }

    /**
     * Executes an order via the appropriate broker service.
     * @param {Object} bot - The bot document including account info (accountId, accountType, and account details).
     * @param {Object} orderDetails - An object containing order details (symbol, side, quantity, orderType, etc.).
     * @returns {Promise<Object>} The response from the broker's API.
     */
    async executeBotOrder(bot, orderDetails) {
        // Determine which account type the bot is using.
        let service;
        if (bot.accountType === 'bingx') {
            service = BingxService;
        } else if (bot.accountType === 'binance') {
            service = BinanceService;
        } else if (bot.accountType === 'okx') {
            service = OkxService;
        } else {
            throw new Error('Unsupported account type');
        }

        // Retrieve the account details.
        // Assumes that the bot document either has a populated account field or you can query it separately.
        const account = bot.account;

        // Call the executeOrder method from the appropriate broker service.
        return await service.executeOrder(orderDetails, account);
    }
}

module.exports = new OrderExecutionService();
