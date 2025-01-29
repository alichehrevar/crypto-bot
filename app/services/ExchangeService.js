const ccxt = require('ccxt');

class ExchangeService {
    constructor() {
        this.exchanges = new Map();
    }

    async createConnection(userId, exchange, credentials) {
        const exchangeClass = ccxt[exchange];
        this.exchanges.set(userId, new exchangeClass({
            apiKey: credentials.apiKey,
            secret: credentials.secret,
            enableRateLimit: true
        }));
    }

    async executeLiveOrder(bot, signal, price) {
        const exchange = this.exchanges.get(bot.user.toString());
        const symbol = bot.symbol.replace('/', '');

        try {
            const order = await exchange.createOrder(symbol, 'market',
                signal.toLowerCase(), bot.riskParams.positionSizeValue);
            return order;
        } catch (error) {
            console.error('Exchange error:', error);
            throw new Error('Order execution failed');
        }
    }
}

module.exports = new ExchangeService();
