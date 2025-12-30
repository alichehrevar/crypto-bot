// app/services/financeService.js

const axios = require("axios");

const UserInfo = require('../models/UserInfo');
const BotBase = require('../models/BotBase');
const Trade = require('../models/Trade');

const logger = require('../../logs/logger');

/**
 * Calculates the total value of accounts marked as Funding, Fund, or Earn.
 * @param {Object} snapshot - The AssetSnapshot document
 */
exports.calculateFundBalance = (snapshot) => {
    let fundBalance = 0;
    if (snapshot && snapshot.details) {
        snapshot.details.forEach(brokerDetail => {
            if (brokerDetail.accounts) {
                brokerDetail.accounts.forEach(account => {
                    // Check against the types
                    if (['funding', 'fund', 'earn'].includes(account.type.toLowerCase())) {
                        fundBalance += (account.value || 0);
                    }
                });
            }
        });
    }
    return fundBalance;
};

/**
 * Calculates the portfolio balance based on closed trades for the user's bots.
 * @param {String} userId
 */
exports.calculatePortfolioBalance = async (userId) => {
    const userBots = await BotBase.find({ userId }).select('_id').lean();
    const botIds = userBots.map(bot => bot._id);

    const closedTrades = await Trade.find({
        bot: { $in: botIds },
        exitPrice: { $ne: null, $gt: 0 }
    }).lean();

    return closedTrades.reduce((sum, trade) => {
        return sum + (trade.entryPrice * trade.quantity);
    }, 0);
};

/**
 * Fetches user currency preference and the current exchange rate.
 * @param {String} userId
 */
exports.getUserExchangeData = async (userId) => {
    const userInfo = await UserInfo.findOne({ userId });

    if (!userInfo) {
        throw new Error('User info not found');
    }

    const exchangeRateResponse = await fetchExchangeRate();
    let rate = 1;

    if (userInfo.currency === 'euro') {
        rate = exchangeRateResponse.EUR;
    } else if (userInfo.currency === 'dollar') {
        rate = exchangeRateResponse.USD;
    }

    return {
        currency: userInfo.currency,
        rate: rate
    };
};

/**
 * Helper to fetch Euro exchange rate
 */
async function fetchExchangeRate() {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USDT');
        return {
            EUR: response.data.rates.EUR,
            USD: response.data.rates.USD,
        };
    } catch (e) {
        logger.error('Error fetching exchange rate, defaulting to 1:', e.message);
        console.error('Error fetching exchange rate, defaulting to 1:', e.message);
        return 1;
    }
}
