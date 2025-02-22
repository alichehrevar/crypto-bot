const ccxt = require('ccxt');

class ExchangeService {
    constructor() {
        /**
         * A Map storing exchange instances per user:
         *   key: userId
         *   value: ccxt exchange instance
         */
        this.exchanges = new Map();
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
