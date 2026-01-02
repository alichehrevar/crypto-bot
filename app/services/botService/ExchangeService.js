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

        // 1. Try finding with specific model
        let account = await AccountModel.findById(accountId);

        // 2. Fallback: Try generic Account model
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

        // Initialize Connection
        const exchange = new ExchangeClass({
            apiKey: account.apiKey,
            secret: account.secret || account.secretKey,
            password: account.passphrase, // OKX specific
            enableRateLimit: true,
            options: { defaultType: 'swap' } // Default to Swap/Futures for BingX/OKX usually
        });

        this.exchanges.set(cacheKey, exchange);
        console.log(`🔌 Connected to ${accountType} for User ${userId}`);
        return exchange;
    }

    /**
     * SMART SYMBOL RESOLVER
     * Automatically corrects "ETH" -> "ETH/USDT" for CCXT compatibility.
     */
    async _resolveSymbol(exchange, rawSymbol) {
        if (!exchange.markets) await exchange.loadMarkets();

        // 1. Try Exact Match (e.g. "BTC/USDT" or "BTC-USDT")
        if (exchange.markets[rawSymbol]) return rawSymbol;

        // 2. Try Standard CCXT Format (Base/Quote) -> "ETH/USDT"
        // This fixes the issue where user entered just "ETH"
        const unified = `${rawSymbol}/USDT`;
        if (exchange.markets[unified]) return unified;

        // 3. Try Binance Style (No slash) -> "ETHUSDT"
        const noSlash = rawSymbol.replace('/', '');
        if (exchange.markets[noSlash]) return noSlash;

        // 4. Try Hyphenated (BingX Futures sometimes) -> "ETH-USDT"
        const hyphenated = `${rawSymbol}-USDT`;
        if (exchange.markets[hyphenated]) return hyphenated;

        // 5. Return original and hope for the best (will likely throw if invalid)
        return rawSymbol;
    }

    // --- Public Methods ---

    triggerFillEvent(fillData) {
        this.emit('fill', fillData);
    }

    async getTicker(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);
        const resolvedSymbol = await this._resolveSymbol(exchange, symbol);
        return await exchange.fetchTicker(resolvedSymbol);
    }

    async getMarketFilters(userId, symbol, accountType, accountId) {
        const exchange = await this._getExchange(userId, accountType, accountId);

        // Ensure markets are loaded before checking
        if (!exchange.markets) await exchange.loadMarkets();

        const resolvedSymbol = await this._resolveSymbol(exchange, symbol);
        const market = exchange.market(resolvedSymbol);

        if (!market) {
            console.warn(`[ExchangeService] Market not found for ${symbol} (Resolved: ${resolvedSymbol}). Using defaults.`);
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
