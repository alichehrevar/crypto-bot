// app/services/botService/ExchangeService.js

const EventEmitter = require('events'); // 1. Import EventEmitter
const ccxt = require('ccxt');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');
const Account        = require('../../models/Account');

// 2. Extend EventEmitter
class ExchangeService extends EventEmitter {
    constructor() {
        super(); // 3. Must call super() in constructor
        this.exchanges = new Map();
    }

    /**
     * AUTO-LOGIN: Fetches keys from DB and connects if not already connected.
     */
    async _getExchange(userId, accountType, accountId) {
        const cacheKey = `${userId}-${accountType}`;
        if (this.exchanges.has(cacheKey)) {
            return this.exchanges.get(cacheKey);
        }

        let AccountModel;
        const exchangeId = accountType.toLowerCase();

        if (exchangeId === 'binance') AccountModel = BinanceAccount;
        else if (exchangeId === 'okx') AccountModel = OkxAccount;
        else if (exchangeId === 'bingx') AccountModel = BingxAccount;
        else AccountModel = Account;

        // 1. Try finding with specific model (Strict Discriminator)
        let account = await AccountModel.findById(accountId);

        // 2. Fallback: Try generic Account model (if specific failed)
        if (!account && AccountModel !== Account) {
            // console.warn(`[ExchangeService] Specific model lookup failed for ${accountId}, trying generic Account model.`);
            account = await Account.findById(accountId);
        }

        if (!account) {
            throw new Error(`Account credentials not found for ${accountType} (ID: ${accountId})`);
        }

        // Check if CCXT supports this exchange
        const ExchangeClass = ccxt[exchangeId];
        if (!ExchangeClass) {
            throw new Error(`CCXT does not support exchange: ${exchangeId}`);
        }

        // Initialize Connection
        const exchange = new ExchangeClass({
            apiKey: account.apiKey,
            secret: account.secret || account.secretKey,
            password: account.passphrase, // OKX specific
            enableRateLimit: true,
            options: { defaultType: 'spot' }
        });

        this.exchanges.set(cacheKey, exchange);
        console.log(`🔌 Connected to ${accountType} for User ${userId}`);
        return exchange;
    }

    // --- Public Methods ---

    /**
     * Helper to bridge WebSocket data to BotManager
     * Call this from binanceWS/okxWS when a user stream order update arrives.
     */
    triggerFillEvent(fillData) {
        this.emit('fill', fillData);
    }

    async getTicker(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);
        // Helper to normalize symbol if needed
        const s = symbol.replace('/', '');
        return await exchange.fetchTicker(s);
    }

    async getMarketFilters(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);
        if (!exchange.markets) await exchange.loadMarkets();

        const market = exchange.market(symbol.replace('/', '')) || exchange.market(symbol);
        if (!market) return { tickSize: 0.01, stepSize: 0.001, minNotional: 10 };

        return {
            tickSize: market.precision.price || 0.01,
            stepSize: market.precision.amount || 0.001,
            minNotional: market.limits.cost?.min || 10
        };
    }

    async createLimitOrder(bot, orderDoc) {
        const exchange = await this._getExchange(bot.userId, bot.accountType, bot.accountId);
        const symbol = bot.symbol.replace('/', '');

        const params = {};
        if (orderDoc.reduceOnly) params.reduceOnly = true;

        return await exchange.createOrder(
            symbol,
            'limit',
            orderDoc.side.toLowerCase(),
            orderDoc.quantity,
            orderDoc.price,
            params
        );
    }

    async cancelMultipleOrders(bot, orderDocs) {
        const exchange = await this._getExchange(bot.userId, bot.accountType, bot.accountId);
        const symbol = bot.symbol.replace('/', '');

        for (const order of orderDocs) {
            if (order.exchangeOrderId) {
                try {
                    await exchange.cancelOrder(order.exchangeOrderId, symbol);
                } catch (e) {
                    console.warn(`Cancel failed: ${e.message}`);
                }
            }
        }
    }
}

module.exports = new ExchangeService();
