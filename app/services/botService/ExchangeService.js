// app/services/botService/ExchangeService.js

const EventEmitter = require('events');
const ccxt = require('ccxt');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');
const Account        = require('../../models/Account');

class ExchangeService extends EventEmitter {
    constructor() {
        super();
        this.exchanges = new Map();

        // Tracking active polling intervals
        // Map<"userId-symbol", IntervalID>
        this.pollingIntervals = new Map();

        // Cache last processed trade IDs to prevent duplicates
        this.processedTradeIds = new Set();
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

        let account = await AccountModel.findById(accountId);
        if (!account && AccountModel !== Account) {
            account = await Account.findById(accountId);
        }

        if (!account) {
            throw new Error(`Account credentials not found for ${accountType} (ID: ${accountId})`);
        }

        const ExchangeClass = ccxt[exchangeId];
        if (!ExchangeClass) {
            throw new Error(`CCXT does not support exchange: ${exchangeId}`);
        }

        const exchange = new ExchangeClass({
            apiKey: account.apiKey,
            secret: account.secret || account.secretKey,
            password: account.passphrase,
            enableRateLimit: true,
            options: { defaultType: 'swap' } // Default to futures/swap
        });

        this.exchanges.set(cacheKey, exchange);
        // console.log(`🔌 Connected to ${accountType} for User ${userId}`);
        return exchange;
    }

    /**
     * SMART SYMBOL RESOLVER
     */
    async _resolveSymbol(exchange, rawSymbol) {
        if (!exchange.markets) await exchange.loadMarkets();

        if (exchange.markets[rawSymbol]) return rawSymbol;

        const unified = `${rawSymbol}/USDT`;
        if (exchange.markets[unified]) return unified;

        const noSlash = rawSymbol.replace('/', '');
        if (exchange.markets[noSlash]) return noSlash;

        const hyphenated = `${rawSymbol}-USDT`;
        if (exchange.markets[hyphenated]) return hyphenated;

        const found = Object.keys(exchange.markets).find(m => m.startsWith(rawSymbol + '/') || m.startsWith(rawSymbol + '-'));
        if (found) return found;

        return rawSymbol;
    }

    // =========================================================================
    //  NEW: VIRTUAL WEBSOCKET (POLLING)
    // =========================================================================

    /**
     * Subscribes to order fills via Polling (Fallback for no WS).
     * @param {string} userId - The user ID
     * @param {string} symbol - The symbol (e.g. BTC-USDT)
     * @param {function} callback - Function to call when a trade is found
     * @returns {function} unsubscribe - Call this to stop polling
     */
    subscribeOrderFills(userId, symbol, callback) {
        // Unique key for this subscription
        const key = `${userId}-${symbol}`;

        if (this.pollingIntervals.has(key)) {
            // Already polling this symbol for this user
            return () => this._unsubscribe(key);
        }

        // console.log(`[ExchangeService] Starting Polling for ${symbol}...`);

        let lastSince = Date.now() - (60 * 1000); // Look back 1 minute initially

        const intervalId = setInterval(async () => {
            try {
                // We need to find *any* exchange instance for this user to fetch trades.
                // In a real app, you might pass accountType/accountId to this method too.
                // For now, we search the cache for an active connection for this user.
                const exchange = this._findActiveExchangeForUser(userId);

                if (!exchange) return; // Not connected yet

                // Resolve symbol again to be safe
                const resolvedSymbol = await this._resolveSymbol(exchange, symbol);

                // Fetch Trades
                const trades = await exchange.fetchMyTrades(resolvedSymbol, lastSince, 10);

                if (trades.length > 0) {
                    // Update 'since' to the latest timestamp to avoid re-fetching old ones deeply
                    lastSince = trades[trades.length - 1].timestamp + 1;

                    for (const trade of trades) {
                        // Prevent duplicate processing using a Set
                        if (!this.processedTradeIds.has(trade.id)) {
                            this.processedTradeIds.add(trade.id);

                            // Keep set size manageable
                            if(this.processedTradeIds.size > 1000) {
                                const it = this.processedTradeIds.values();
                                this.processedTradeIds.delete(it.next().value);
                            }

                            // Trigger the bot's logic
                            callback(trade);
                        }
                    }
                }
            } catch (err) {
                // Ignore benign network errors during polling
                // console.warn(`[Polling] Error fetching trades for ${symbol}: ${err.message}`);
            }
        }, 5000); // Poll every 5 seconds

        this.pollingIntervals.set(key, intervalId);

        // Return Unsubscribe Function
        return () => this._unsubscribe(key);
    }

    _unsubscribe(key) {
        if (this.pollingIntervals.has(key)) {
            clearInterval(this.pollingIntervals.get(key));
            this.pollingIntervals.delete(key);
            // console.log(`[ExchangeService] Stopped Polling for ${key}`);
        }
    }

    _findActiveExchangeForUser(userId) {
        // Iterate over connected exchanges to find one belonging to this user
        for (const [key, exchange] of this.exchanges.entries()) {
            if (key.startsWith(userId)) return exchange;
        }
        return null;
    }

    // =========================================================================
    //  STANDARD METHODS
    // =========================================================================

    async getTicker(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);
        const resolvedSymbol = await this._resolveSymbol(exchange, symbol);
        return await exchange.fetchTicker(resolvedSymbol);
    }

    async getMarketFilters(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);
        if (!exchange.markets) await exchange.loadMarkets();

        const resolvedSymbol = await this._resolveSymbol(exchange, symbol);
        const market = exchange.market(resolvedSymbol);

        if (!market) {
            console.warn(`[ExchangeService] Market not found for ${symbol}. Defaults used.`);
            return { tickSize: 0.01, stepSize: 0.001, minNotional: 5 };
        }

        return {
            tickSize: market.precision.price || 0.01,
            stepSize: market.precision.amount || 0.001,
            minNotional: market.limits.cost?.min || 5
        };
    }

    async createLimitOrder(bot, orderDoc) {
        const exchange = await this._getExchange(bot.userId, bot.accountType, bot.accountId);
        const resolvedSymbol = await this._resolveSymbol(exchange, bot.symbol);

        const params = {};
        if (orderDoc.reduceOnly) params.reduceOnly = true;

        // BingX/CCXT consistency: ensure side is lowercase
        return await exchange.createOrder(
            resolvedSymbol,
            'limit',
            orderDoc.side.toLowerCase(),
            orderDoc.quantity,
            orderDoc.price,
            params
        );
    }

    async cancelMultipleOrders(bot, orderDocs) {
        const exchange = await this._getExchange(bot.userId, bot.accountType, bot.accountId);
        const resolvedSymbol = await this._resolveSymbol(exchange, bot.symbol);

        for (const order of orderDocs) {
            if (order.exchangeOrderId) {
                try {
                    await exchange.cancelOrder(order.exchangeOrderId, resolvedSymbol);
                } catch (e) {
                    console.warn(`Cancel failed for ${order._id}: ${e.message}`);
                }
            }
        }
    }
}

module.exports = new ExchangeService();
