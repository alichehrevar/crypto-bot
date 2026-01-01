const ccxt = require('ccxt');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');

class ExchangeService {
    constructor() {
        /**
         * A Map storing exchange instances per user:
         *   key: userId
         *   value: ccxt exchange instance
         */
        this.exchanges = new Map(); // Cache: userId -> ccxtInstance
    }

    /**
     * INTELLIGENT GETTER:
     * Checks cache. If missing, fetches keys from DB and connects automatically.
     */
    async _getExchange(userId, accountType, accountId) {
        // 1. Check Memory Cache
        const cacheKey = `${userId}-${accountType}`;
        if (this.exchanges.has(cacheKey)) {
            return this.exchanges.get(cacheKey);
        }

        // 2. Resolve Model based on type
        let AccountModel;
        let exchangeId = accountType.toLowerCase();

        if (exchangeId === 'binance') AccountModel = BinanceAccount;
        else if (exchangeId === 'okx') AccountModel = OkxAccount;
        else if (exchangeId === 'bingx') AccountModel = BingxAccount;
        else throw new Error(`Unsupported exchange: ${accountType}`);

        // 3. Fetch Credentials
        const account = await AccountModel.findById(accountId);
        if (!account) throw new Error(`Account credentials not found for ${accountType} (ID: ${accountId})`);

        // 4. Create CCXT Instance
        const ExchangeClass = ccxt[exchangeId];
        if (!ExchangeClass) throw new Error(`CCXT does not support ${exchangeId}`);

        const exchange = new ExchangeClass({
            apiKey: account.apiKey,
            secret: account.secret || account.secretKey, // Handle schema variations
            password: account.passphrase, // For OKX
            enableRateLimit: true,
            options: { defaultType: 'spot' } // Default to spot, adjust as needed
        });

        // 5. Save to Cache and Return
        this.exchanges.set(cacheKey, exchange);
        console.log(`🔌 Connected to ${accountType} for User ${userId}`);
        return exchange;
    }

    async getTicker(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);
        return await exchange.fetchTicker(symbol.replace('/', ''));
    }

    /**
     * Fetch Precision and Limits (TickSize, StepSize)
     */
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

    /**
     * Create a Limit Order
     * @param {Object} bot - The bot document
     * @param {Object} orderDoc - The Order model document
     */
    async createLimitOrder(bot, orderDoc) {
        // Pass accountId to helper
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

    /**
     * Cancel Multiple Orders
     */
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

    /**
     * Creates (or updates) an exchange instance for a specific user.
     * @param {String} userId
     * @param {String} exchangeName e.g. 'binance', 'kraken', etc.
     * @param {Object} credentials { apiKey, secret }
     */
    async createConnection(userId, exchangeName, credentials) {
        const ExchangeClass = ccxt[exchangeName];
        if (!ExchangeClass) {
            throw new Error(`Exchange "${exchangeName}" not supported by ccxt`);
        }

        const exchangeInstance = new ExchangeClass({
            apiKey: credentials.apiKey,
            secret: credentials.secret,
            enableRateLimit: true
            // You can add 'options' or 'urls' here if needed
        });

        // Optionally, set sandbox mode for some exchanges:
        // if (exchangeInstance.hasOwnProperty('setSandboxMode')) {
        //     exchangeInstance.setSandboxMode(true);
        // }

        this.exchanges.set(userId, exchangeInstance);
    }

    /**
     * Executes a live order on the user's connected exchange.
     * Currently, a simple market order.
     * For a limit order, you'd include a 'price' parameter and switch type to 'limit'.
     *
     * @param {Object} bot - The Bot document
     * @param {String} signal - 'BUY' or 'SELL'
     * @param {Number} quantity - Amount to buy or sell (base currency amount)
     * @returns {Object} order result from ccxt
     */
    async executeLiveOrder(bot, signal, quantity) {
        // Make sure the bot has a user reference.
        // For example, if in your Bot schema you have `user: { type: mongoose.Schema.Types.ObjectId, ... }`.
        // If not, pass userId as a separate argument to this method.
        const userId = bot.user?.toString();
        if (!userId) {
            throw new Error(`Bot "${bot.name}" has no user assigned.`);
        }

        const exchange = this.exchanges.get(userId);
        if (!exchange) {
            throw new Error(`No exchange connection found for user ${userId}`);
        }

        // Convert 'BTC/USDT' -> 'BTCUSDT' if the exchange expects that
        // (Binance, for instance). This depends on the exchange's required format.
        const ccxtSymbol = bot.symbol.replace('/', '');

        // For ccxt, side should be 'buy' or 'sell' (lowercase):
        const side = signal.toLowerCase(); // 'buy' or 'sell'

        try {
            // Example: Market order with a base currency `amount` of `quantity`.
            // You might store the returned order info in your DB if needed
            return await exchange.createOrder(
                ccxtSymbol,
                'market', // or 'limit'
                side,
                quantity,
                // price (for limit), e.g. { price: price } if needed
            );
        } catch (error) {
            console.error('Exchange error:', error);
            throw new Error(`Order execution failed: ${error.message}`);
        }
    }
}

module.exports = new ExchangeService();
