const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto');
const BotService = require('./botService/BotService');
const candleStore = require('../../utils/candleStore');

class OKXWS {
    constructor() {
        this.ws = null;
        this.publicWs = null;
        // Default credentials can be provided via environment variables if needed.
        this.apiKey = process.env.OKX_API_KEY;
        this.apiSecret = process.env.OKX_API_SECRET;
        this.passphrase = process.env.OKX_PASSPHRASE;
        // You might want to add reconnect logic, subscriptions map etc. as needed.
    }

    /**
     * Connects to the OKX WebSocket endpoint.
     * For private data (account updates) use the private endpoint.
     */
    connect() {
        // OKX WebSocket endpoint for private data (account and orders).
        const endpoint = 'wss://ws.okx.com:8443/ws/v5/private';
        this.ws = new WebSocket(endpoint);

        // Set up basic event listeners.
        this.ws.on('open', () => {
            console.log('[OKXWS] Connected to OKX WebSocket');
            // Optionally, perform authentication over WS here.
            // (OKX may require you to send an auth message after connecting.)
            // For now, we leave that out since our getBalance uses REST.
        });

        this.ws.on('message', (data) => {
            // Handle incoming messages as needed.
            try {
                const message = JSON.parse(data);
                console.log('[OKXWS] Received message:', message);
            } catch (error) {
                console.error('[OKXWS] Failed to parse message:', error);
            }
        });

        this.ws.on('error', (error) => {
            console.error('[OKXWS] WebSocket error:', error);
        });

        this.ws.on('close', (code, reason) => {
            console.warn(`[OKXWS] WebSocket closed with code ${code}: ${reason}`);
            this.ws = null;
            // Optionally add reconnect logic here.
        });

        // Also initialize the public connection for market data
        this.connectPublic();
    }

    /**
     * Disconnects from the OKX WebSocket.
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Generates the OKX signature using the provided API secret.
     * OKX requires a prehash string in the format: timestamp + method + requestPath + body.
     *
     * @param {string} timestamp - ISO timestamp.
     * @param {string} method - HTTP method (e.g., "GET").
     * @param {string} requestPath - The API request path and query string.
     * @param {string} body - The request body (empty for GET).
     * @returns {string} - The Base64-encoded signature.
     */
    generateSignature(timestamp, method, requestPath, body = '') {
        const prehash = timestamp + method + requestPath + body;
        return crypto.createHmac('sha256', this.apiSecret).update(prehash).digest('base64');
    }

    connectPublic() {
        // OKX Public WebSocket endpoint for market data
        const endpoint = 'wss://ws.okx.com:8443/ws/v5/public';
        this.publicWs = new WebSocket(endpoint);

        this.publicWs.on('open', () => {
            console.log('[OKXWS] Connected to OKX Public WebSocket');
            // NOTE: You must call this.subscribeCandles('BTC-USDT', '1m') for active bot symbols
            // exactly like how Binance loops through activeSymbolsSet in binanceWS.js.
        });

        this.publicWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                // Check if the message is from a candle channel
                if (message.arg && message.arg.channel && message.arg.channel.startsWith('candle') && message.data) {
                    await this.processCandleMessage(message);
                }
            } catch (error) {
                console.error('[OKXWS] Failed to parse message:', error);
            }
        });

        this.publicWs.on('error', (error) => console.error('[OKXWS] Public WS error:', error));
    }

    subscribeCandles(symbol, interval) {
        if (!this.publicWs || this.publicWs.readyState !== WebSocket.OPEN) return;

        // e.g., interval "1m" becomes "candle1m"
        const channel = `candle${interval}`;

        const payload = {
            op: "subscribe",
            args: [{
                channel: channel,
                instId: symbol // Format must be OKX standard, e.g., "BTC-USDT"
            }]
        };

        this.publicWs.send(JSON.stringify(payload));
    }

    async processCandleMessage(message) {
        // OKX candle data shape: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
        const { arg, data } = message;

        // Normalize "BTC-USDT" to "BTC/USDT" to map correctly in BotService
        const symbol = arg.instId.toUpperCase().replace('-', '/');
        const timeframe = arg.channel.replace('candle', '');

        for (const kline of data) {
            const candleData = {
                symbol: symbol,
                timeframe: timeframe,
                timestamp: parseInt(kline[0], 10),
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                isClosed: kline[8] === "1" // "1" means the candle is closed/confirmed
            };

            // Update the store and trigger the bot engine
            await candleStore.updateCandle(symbol, timeframe, candleData);
            await BotService.processCandle(symbol, timeframe, candleData);
        }
    }

    /**
     * Executes a trade order on OKX via REST API.
     * * @param {Object} orderDetails - The order parameters.
     * @param {string} orderDetails.symbol - Market symbol (e.g., 'BTCUSDT').
     * @param {string} orderDetails.side - 'BUY' or 'SELL'.
     * @param {string} orderDetails.type - 'MARKET' or 'LIMIT'.
     * @param {number} orderDetails.quantity - Amount to buy/sell.
     * @param {number} [orderDetails.price] - Limit price (required if type is LIMIT).
     * @param orderDetails
     * @param {Object} account - The user's account credentials (apiKey, secretKey, passphrase).
     * @returns {Promise<Object>} The API response data.
     */
    async executeOrder(orderDetails, account) {
        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method = 'POST';
        const requestPath = '/api/v5/trade/order';

        // 1. Map generic bot parameters to OKX-specific fields
        // OKX Symbols usually need hyphens (BTC-USDT), whereas your bot might send "BTCUSDT".
        // We attempt to fix this if a hyphen is missing.
        let instId = orderDetails.symbol;
        if (!instId.includes('-')) {
            // Primitive heuristic: insert hyphen before 'USDT' or 'USDC'
            // For a production bot, it's safer to store the correct "Exchange Symbol" in the DB.
            if (instId.endsWith('USDT')) instId = instId.replace('USDT', '-USDT');
            else if (instId.endsWith('USDC')) instId = instId.replace('USDC', '-USDC');
        }

        // 2. Construct the Request Body
        // tdMode: 'cash' for Spot (non-margin), 'cross'/'isolated' for Futures/Margin.
        // For simplicity, we default to 'cash' unless it looks like a swap/future.
        const isDerivative = instId.includes('-SWAP') || instId.includes('-FUTURES');
        const tdMode = isDerivative ? 'cross' : 'cash';

        const bodyObj = {
            instId: instId,
            tdMode: tdMode,
            side: orderDetails.side.toLowerCase(), // OKX expects 'buy' or 'sell'
            ordType: orderDetails.type.toLowerCase(), // OKX expects 'market' or 'limit'
            sz: String(orderDetails.quantity) // Quantity must be a string
        };

        // Add price if it's a Limit order
        if (bodyObj.ordType === 'limit') {
            if (!orderDetails.price) throw new Error('Price is required for LIMIT orders');
            bodyObj.px = String(orderDetails.price);
        }

        const body = JSON.stringify(bodyObj);

        // 3. Generate Signature (Prehash = timestamp + method + requestPath + body)
        const prehash = timestamp + method + requestPath + body;
        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(prehash)
            .digest('base64');

        const headers = {
            'OK-ACCESS-KEY': apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': passphrase,
            'Content-Type': 'application/json'
        };

        try {
            const url = `https://www.okx.com${requestPath}`;
            const response = await axios.post(url, bodyObj, { headers });

            // OKX returns 200 even on some logic errors, so check the 'code' in the body
            if (response.data.code !== '0') {
                throw new Error(`OKX API Error: ${response.data.msg} (Code: ${response.data.code})`);
            }

            return response.data;
        } catch (error) {
            console.error('[OKXWS] executeOrder failed:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * @description Fetches the total account equity from OKX's balance history for a specific past date.
     * This endpoint provides a snapshot of total account value.
     * @param {object} account The user's OKX account credentials.
     * @param {Date} date The specific date for which to fetch the balance.
     * @returns {Promise<number>} The total USDT equity for that day.
     */
    async getHistoricalBalance(account, date) {
        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method = 'GET';

        // We want the snapshot at the very end of the requested day.
        const endOfDayTimestamp = new Date(date).setUTCHours(23, 59, 59, 999);
        const requestPath = `/api/v5/account/account-balance-history?after=${endOfDayTimestamp}&limit=1`;

        const prehash = timestamp + method + requestPath;
        const signature = crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64');

        const headers = {
            'OK-ACCESS-KEY': apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': passphrase,
            'Content-Type': 'application/json',
        };

        const url = `https://www.okx.com${requestPath}`;

        try {
            const res = await axios.get(url, { headers });
            if (res.data.code !== '0' || !res.data.data || res.data.data.length === 0) {
                console.log(`[OKXWS] No snapshot found for date ${date.toISOString().slice(0,10)}`);
                return 0;
            }

            // The 'details' array contains balances for various account types (spot, futures, etc.).
            // We sum the 'eq' (total equity) of all of them to get the total portfolio value.
            const details = res.data.data[0].details;
            return details ? details.reduce((sum, item) => sum + parseFloat(item.eq), 0) : 0;
        } catch (error) {
            console.error(`[OKXWS] getHistoricalBalance failed:`, error.response?.data || error.message);
            return 0;
        }
    }

    /**
     * Fetch up to `days` days of realized PnL from OKX’s income-history.
     * Shape: [ { timestamp: ms, profit: number }, … ]
     */
    async getHistoricalRealizedPnL(account, { days }) {
        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method    = 'GET';
        const requestPath = '/api/v5/account/income?instType=FUTURES&ccy=USDT';
        const preSign   = timestamp + method + requestPath;
        const signature = crypto.createHmac('sha256', apiSecret).update(preSign).digest('base64');

        const url = `https://www.okx.com${requestPath}`;
        const res = await axios.get(url, {
            headers: {
                'OK-ACCESS-KEY':        apiKey,
                'OK-ACCESS-SIGN':       signature,
                'OK-ACCESS-TIMESTAMP':  timestamp,
                'OK-ACCESS-PASSPHRASE': passphrase
            }
        });

        // res.data.data should be an array
        const arr = Array.isArray(res.data.data) ? res.data.data : [];
        const groups = {};
        for (const rec of arr) {
            // `ts` or maybe `ts` in each record, and `realizedPnl` or `real`
            const dateKey = new Date(rec.ts).toISOString().slice(0,10);
            const pnl     = parseFloat(rec.realizedPnl || rec.real || 0);
            groups[dateKey] = (groups[dateKey]||0) + pnl;
        }

        return Object.entries(groups)
            .map(([date, profit]) => ({
                timestamp: new Date(`${date}T00:00:00Z`).getTime(),
                profit
            }))
            .sort((a,b) => b.timestamp - a.timestamp)
            .slice(0, days);
    }

    /**
     * Fetch the current unrealized PnL snapshot from OKX positions.
     * Shape: [ { timestamp: ms, pct: number } ]
     */
    async getUnrealizedPnLHistory(account, { days }) {

        const { apiKey, apiSecret, passphrase } = account;
        const timestamp = new Date().toISOString();
        const method    = 'GET';
        const requestPath = '/api/v5/account/positions?instType=SWAP'; // Use SWAP for futures
        const preSign      = timestamp + method + requestPath;
        const signature    = crypto.createHmac('sha256', apiSecret).update(preSign).digest('base64');
        const url = `https://www.okx.com${requestPath}`;

        try {
            const res = await axios.get(url, {
                headers: {
                    'OK-ACCESS-KEY':        apiKey,
                    'OK-ACCESS-SIGN':       signature,
                    'OK-ACCESS-TIMESTAMP':  timestamp,
                    'OK-ACCESS-PASSPHRASE': passphrase
                }
            });

            const positions = Array.isArray(res.data.data) ? res.data.data : [];

            return positions.map(pos => {
                const unrealizedPnl = parseFloat(pos.upl || 0);
                const initialMargin = parseFloat(pos.imr || 0);
                const pnlPercentage = initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0;

                return {
                    symbol: pos.instId,
                    leverage: pos.lever,
                    unrealizedPnl: unrealizedPnl.toFixed(2),
                    pct: parseFloat(pnlPercentage.toFixed(2)),
                    // IMPORTANT: We use `cTime` (creation time) as the timestamp
                    timestamp: parseInt(pos.cTime, 10)
                };
            });
        } catch(err) {
            console.error('[OKXWS] getUnrealizedPnLHistory Error:', err.response?.data || err.message);
            return [];
        }
    }

    /**
     * Fetch a complete, valued tree of balances (OKX).
     * Sections returned (when available):
     * - Funding  (Funding wallet balances)
     * - Spot     (Trading account per-ccy balances valued in USDT)
     * - Futures  (USDT value ≈ sum(initialMargin) + total uPnL, with per-position children)
     * - Financial (Earn / Wealth products in USDT)
     *
     * Notes:
     * - OKX splits "Funding" and "Trading" accounts. Spot trading uses the Trading account,
     *   while deposits/withdrawals live in Funding.
     * - We value non-USDT assets via /market/tickers?instType=SPOT (last price).
     */
    async getDetailedBalance(account) {
        const { apiKey, apiSecret, passphrase } = account;

        const getHeaders = (method, requestPath, body = '') => {
            const timestamp = new Date().toISOString();
            const prehash = timestamp + method + requestPath + body;
            const signature = crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64');
            return {
                'OK-ACCESS-KEY': apiKey,
                'OK-ACCESS-SIGN': signature,
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': passphrase,
                'Content-Type': 'application/json',
            };
        };

        // ---------------- 0) Build price map (for USDT valuation) ----------------
        let priceMap = new Map();
        try {
            const px = await axios.get('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
            const rows = Array.isArray(px.data?.data) ? px.data.data : [];
            // Map like: "BTCUSDT" -> last
            priceMap = new Map(rows.map(t => [String(t.instId || '').replace('-', ''), parseFloat(t.last || '0')]));
        } catch (e) {
            console.warn('[OKXWS] price feed failed; non-USDT valuations may be 0:', e?.message);
        }
        const toUSDT = (asset, amount) => {
            const a = String(asset || '').toUpperCase();
            if (!Number.isFinite(amount) || amount <= 0) return 0;
            if (a === 'USDT') return amount;
            const p = priceMap.get(`${a}USDT`);
            return p ? amount * p : 0;
        };

        const result = [];

        // ---------------- 1) Funding wallet (deposits/withdrawals) ----------------
        // OKX funding balances endpoint
        try {
            const fundingPath = '/api/v5/asset/balances';
            const fundingRes = await axios.get(`https://www.okx.com${fundingPath}`, {
                headers: getHeaders('GET', fundingPath)
            });

            const details = Array.isArray(fundingRes.data?.data) ? fundingRes.data.data : [];
            // details: [{ ccy, bal, availBal, frozenBal, ... }, ...]
            const fundingAssets = details
                .map(d => {
                    const ccy = d.ccy;
                    // prefer total "bal" if present; else sum avail+frozen
                    const amount = Number(d.bal ?? (Number(d.availBal || 0) + Number(d.frozenBal || 0)));
                    return { name: ccy, amount, value: toUSDT(ccy, amount) };
                })
                .filter(x => x.amount > 1e-10)
                .sort((a, b) => b.value - a.value);

            const fundingTotal = fundingAssets.reduce((s, a) => s + (a.value || 0), 0);

            result.push({
                accountType: 'Funding',
                value: Number(fundingTotal.toFixed(8)),
                children: fundingAssets
                    .filter(a => a.value > 0.0001)
                    .map(a => ({ name: a.name, value: Number(a.value.toFixed(8)) }))
            });
        } catch (e) {
            console.warn('[OKXWS] funding balances failed:', e?.message);
            result.push({ accountType: 'Funding', value: 0, children: [] });
        }

        // ---------------- 2) Trading account (spot assets held for trading) ----------------
        // OKX trading (account) balances endpoint
        try {
            const tradingPath = '/api/v5/account/balance';
            const tradingRes = await axios.get(`https://www.okx.com${tradingPath}`, {
                headers: getHeaders('GET', tradingPath)
            });

            const acc = Array.isArray(tradingRes.data?.data) ? tradingRes.data.data[0] : null;
            const totalEqUSDT = Number(acc?.totalEq || 0); // Total equity (in USDT)
            const perCcy = Array.isArray(acc?.details) ? acc.details : [];

            // Build a "Spot" node from per-currency trading balances (cash)
            const spotItems = perCcy
                .map(row => {
                    const ccy = row.ccy;
                    // Prefer "cashBal" (cash) if present; fallback to availBal/eq
                    const amount =
                        Number(row.cashBal ?? row.availBal ?? row.eq ?? 0);
                    return { asset: ccy, amount, value: toUSDT(ccy, amount) };
                })
                .filter(x => x.amount > 1e-10)
                .sort((a, b) => b.value - a.value);

            const spotValue = spotItems.reduce((s, x) => s + (x.value || 0), 0);

            result.push({
                accountType: 'Spot',
                value: Number(spotValue.toFixed(8)),
                children: spotItems
                    .filter(x => x.value > 0.0001)
                    .map(x => ({ name: x.asset, value: Number(x.value.toFixed(8)) }))
            });

            // Keep total trading equity around for futures calc sanity checks
            result.push({
                accountType: 'Trading-Equity',
                value: Number(Number(totalEqUSDT).toFixed(8)),
                children: [] // meta node (not for UI), useful if you reconcile totals upstream
            });
        } catch (e) {
            console.error('[OKXWS] trading/account balance failed:', e?.message);
            result.push({ accountType: 'Spot', value: 0, children: [] });
            result.push({ accountType: 'Trading-Equity', value: 0, children: [] });
        }

        // ---------------- 3) Futures / Swap positions (margin + uPnL) ----------------
        // We approximate "futures account value" as SUM(initialMargin) + SUM(uPnL)
        // and expose per-position children by notionalUsd.
        try {
            const positionsPath = '/api/v5/account/positions?instType=SWAP';
            const posRes = await axios.get(`https://www.okx.com${positionsPath}`, {
                headers: getHeaders('GET', positionsPath)
            });

            const positions = Array.isArray(posRes.data?.data) ? posRes.data.data : [];
            let totalUPnL = 0;
            let totalIMR = 0;

            const children = [];
            for (const p of positions) {
                const notionalUsd = Number(p.notionalUsd || 0);
                const uPnL = Number(p.upl || 0);
                const imr = Number(p.imr || 0);

                totalUPnL += uPnL;
                totalIMR += imr;

                if (Math.abs(notionalUsd) > 0.01) {
                    children.push({ name: String(p.instId), value: Math.abs(notionalUsd) });
                }
            }

            // Futures "value": margin posted + unrealized PnL
            const futuresValue = totalIMR + totalUPnL;

            result.push({
                accountType: 'Futures',
                subType: 'SWAP',
                walletMargin: Number(totalIMR.toFixed(8)),
                totalUnrealizedPnl: Number(totalUPnL.toFixed(8)),
                value: Number(futuresValue.toFixed(8)),
                children: children.sort((a, b) => b.value - a.value)
            });
        } catch (e) {
            console.error('[OKXWS] positions failed:', e?.message);
            result.push({
                accountType: 'Futures',
                subType: 'SWAP',
                walletMargin: 0,
                totalUnrealizedPnl: 0,
                value: 0,
                children: []
            });
        }

        // ---------------- 4) Financial / Earn (USDT valuation) ----------------
        try {
            const assetValPath = '/api/v5/asset/asset-valuation?ccy=USDT';
            const assetValRes = await axios.get(`https://www.okx.com${assetValPath}`, {
                headers: getHeaders('GET', assetValPath)
            });

            const row = Array.isArray(assetValRes.data?.data) ? assetValRes.data.data[0] : null;
            // Some tenants return a `details` object, others only totals. Handle both.
            const earnVal =
                Number(row?.details?.earn ?? row?.earn ?? 0);

            result.push({
                accountType: 'Financial',
                value: Number(earnVal.toFixed(8)),
                children: earnVal > 0 ? [{ name: 'Earn', value: Number(earnVal.toFixed(8)) }] : []
            });
        } catch (e) {
            console.warn('[OKXWS] asset valuation (financial) failed:', e?.message);
            result.push({ accountType: 'Financial', value: 0, children: [] });
        }

        return result;
    }

    /**
     * Collapses the detailed tree into the same simple shape you used with BingX:
     *   [{ accountType: 'total'|'spot'|'futures'|'error', usdtBalance: string }]
     *
     * Semantics:
     * - all=true   → total = Spot.value + Futures.value + Funding.value + Financial.value
     * - futures    → Futures.value (SWAP margin + uPnL)
     * - default    → Spot.value  (trading per-ccy valued sum; Funding stays separate)
     */
    async getBalance(account, { all = false, accountType = '' } = {}) {
        // Fallback in case detailed fails
        const fallback = async () => {
            try {
                if (all) {
                    // Legacy behavior: spot USDT + sum of IMR (approx futures) as before
                    const timestamp = new Date().toISOString();
                    const method = 'GET';

                    // spot(USDT)
                    const balPath = '/api/v5/account/balance?ccy=USDT';
                    const balHeaders = (() => {
                        const prehash = timestamp + method + balPath;
                        const sig = crypto.createHmac('sha256', account.apiSecret).update(prehash).digest('base64');
                        return {
                            'OK-ACCESS-KEY': account.apiKey,
                            'OK-ACCESS-SIGN': sig,
                            'OK-ACCESS-TIMESTAMP': timestamp,
                            'OK-ACCESS-PASSPHRASE': account.passphrase,
                            'Content-Type': 'application/json',
                        };
                    })();
                    const spotRes = await axios.get(`https://www.okx.com${balPath}`, { headers: balHeaders });
                    const spotDetail = spotRes.data?.data?.[0]?.details?.find(d => d.ccy === 'USDT');
                    const spot = spotDetail ? Number(spotDetail.availBal || 0) : 0;

                    // futures (sum of IMR)
                    const posPath = '/api/v5/account/positions?instType=FUTURES';
                    const posHeaders = balHeaders; // same timestamp ok for best-effort fallback
                    const posRes = await axios.get(`https://www.okx.com${posPath}`, { headers: posHeaders });
                    const imrSum = (posRes.data?.data || []).reduce((s, p) => s + Number(p.imr || 0), 0);

                    return [{ accountType: 'total', usdtBalance: String(spot + imrSum) }];
                }

                if (accountType === 'futures') {
                    const timestamp = new Date().toISOString();
                    const method = 'GET';
                    const posPath = '/api/v5/account/positions?instType=FUTURES';
                    const prehash = timestamp + method + posPath;
                    const sig = crypto.createHmac('sha256', account.apiSecret).update(prehash).digest('base64');
                    const headers = {
                        'OK-ACCESS-KEY': account.apiKey,
                        'OK-ACCESS-SIGN': sig,
                        'OK-ACCESS-TIMESTAMP': timestamp,
                        'OK-ACCESS-PASSPHRASE': account.passphrase,
                        'Content-Type': 'application/json',
                    };
                    const posRes = await axios.get(`https://www.okx.com${posPath}`, { headers });
                    const imrSum = (posRes.data?.data || []).reduce((s, p) => s + Number(p.imr || 0), 0);
                    return [{ accountType: 'futures', usdtBalance: String(imrSum) }];
                }

                // default spot (USDT only)
                const timestamp = new Date().toISOString();
                const method = 'GET';
                const balPath = '/api/v5/account/balance?ccy=USDT';
                const prehash = timestamp + method + balPath;
                const sig = crypto.createHmac('sha256', account.apiSecret).update(prehash).digest('base64');
                const headers = {
                    'OK-ACCESS-KEY': account.apiKey,
                    'OK-ACCESS-SIGN': sig,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': account.passphrase,
                    'Content-Type': 'application/json',
                };
                const spotRes = await axios.get(`https://www.okx.com${balPath}`, { headers });
                const spotDetail = spotRes.data?.data?.[0]?.details?.find(d => d.ccy === 'USDT');
                const spot = spotDetail ? Number(spotDetail.availBal || 0) : 0;
                return [{ accountType: 'spot', usdtBalance: String(spot) }];
            } catch (err) {
                console.error('[OKXWS] getBalance fallback failed:', err?.message);
                return [{ accountType: 'error', usdtBalance: '0' }];
            }
        };

        try {
            const detailed = await this.getDetailedBalance(account);
            if (!Array.isArray(detailed) || !detailed.length) {
                return await fallback();
            }

            const pick = (type) => detailed.find(n => n.accountType === type);

            const spotNode      = pick('Spot');
            const futuresNode   = pick('Futures');
            const fundingNode   = pick('Funding');
            const financialNode = pick('Financial');

            const spotValue      = Number(spotNode?.value ?? 0);
            const futuresValue   = Number(futuresNode?.value ?? 0);
            const fundingValue   = Number(fundingNode?.value ?? 0);
            const financialValue = Number(financialNode?.value ?? 0);

            if (all) {
                const total = spotValue + futuresValue + fundingValue + financialValue;
                return [{ accountType: 'total', usdtBalance: String(total) }];
            }

            if (accountType === 'futures') {
                return [{ accountType: 'futures', usdtBalance: String(futuresValue) }];
            }

            // default: spot (trading spot balances)
            return [{ accountType: 'spot', usdtBalance: String(spotValue) }];
        } catch (err) {
            console.error('[OKXWS] getBalance (detailed) failed:', err?.message);
            return await fallback();
        }
    }

}

module.exports = new OKXWS();
