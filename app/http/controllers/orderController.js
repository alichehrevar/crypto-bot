// app/http/controllers/orderController.js

const axios         = require('axios');
const crypto        = require('crypto');
const User          = require('../../models/User');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount     = require('../../models/OkxAccount');
const BingxAccount   = require('../../models/BingxAccount');
const logger = require("../../../logs/logger");

/**
 * Helper: Fetch free USDT balance for the given account.
 * Supports Binance; for OKX and BingX, you can fill in their respective REST calls.
 *
 * @param {Object} account        Mongoose doc for BinanceAccount / OkxAccount / BingxAccount
 * @param {String} accountType    'binance' | 'okx' | 'bingx'
 * @returns {Promise<number>}     Free USDT balance (0 if not found)
 */
async function fetchFreeUsdt(account, accountType) {
    if (accountType === 'binance') {
        // Binance: GET /api/v3/account with signature
        const timestamp = Date.now();
        const query = `timestamp=${timestamp}`;
        const signature = crypto
            .createHmac('sha256', account.secretKey)
            .update(query)
            .digest('hex');

        const url = `https://api.binance.com/api/v3/account?${query}&signature=${signature}`;
        const headers = { 'X-MBX-APIKEY': account.apiKey };

        const resp = await axios.get(url, { headers });
        const balances = resp.data.balances || [];
        const usdtObj = balances.find(b => b.asset === 'USDT');
        return usdtObj ? parseFloat(usdtObj.free) : 0;
    }
    else if (accountType === 'okx') {
        // OKX: GET /api/v5/account/balance
        // Replace with actual base URL and endpoints as needed
        const timestamp = Date.now().toString();
        const method = 'GET';
        const requestPath = '/api/v5/account/balance';
        const body = '';
        // Create prehash = timestamp + method + requestPath + body
        const prehash = timestamp + method + requestPath + body;
        const signature = crypto
            .createHmac('sha256', account.secretKey)
            .update(prehash)
            .digest('base64');

        const headers = {
            'OK-ACCESS-KEY': account.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': account.passphrase || '',
            'Content-Type': 'application/json'
        };

        const url = `https://www.okx.com${requestPath}`;
        const resp = await axios.get(url, { headers });
        const data = resp.data.data || [];
        // Find USDT entry under “currency”: “USDT”
        let free = 0;
        for (const entry of data) {
            if (entry.ccy === 'USDT') {
                free = parseFloat(entry.avl) || 0;
                break;
            }
        }
        return free;
    }
    else if (accountType === 'bingx') {
        // BingX: replace with actual REST call to fetch account balances
        // This is a placeholder; you must fill in your own API endpoint, signature, and parsing.
        // E.g. GET https://api.bingx.com/api/v1/account/balance
        // After retrieving, find { asset: 'USDT' } and return its free amount.
        return 0; // Stub: implement BingX balance fetch here
    }
    else {
        return 0;
    }
}

/**
 * POST /orders/place
 *
 * Body:
 * {
 *   accountId: <ObjectId string>,
 *   symbol: "BTC/USDT",
 *   orderType: "market" | "limit",
 *   side: "buy" | "sell",
 *   quantity: <number>,
 *   price?: <number>, // required if orderType === "limit"
 *   takeProfitPct?: <number>, // optional
 *   stopLossPct?: <number> // optional
 * }
 *
 * This endpoint validates inputs, ensures sufficient USDT for limit orders;
 * then (stub) echoes back the would‐be order.
 */
exports.placeOrder = async (req, res) => {
    try {
        // 1) Authenticate the user
        const user = await User.findById(req.user?.id);
        if (!user) {
            return res.status(401).json({ success: false, error: "User not found." });
        }

        // 2) Extract & validate required fields
        const {
            accountId,
            symbol,
            orderType,
            side,
            quantity,
            price,
            takeProfitPct,
            stopLossPct,
        } = req.body;

        if (!accountId || !symbol || !orderType || !side || quantity == null) {
            return res
                .status(400)
                .json({ success: false, error: "Missing required fields." });
        }

        if (typeof quantity !== "number" || quantity <= 0) {
            return res
                .status(400)
                .json({ success: false, error: "Quantity must be a positive number." });
        }

        if (orderType !== "market" && orderType !== "limit") {
            return res
                .status(400)
                .json({ success: false, error: "orderType must be either 'market' or 'limit'." });
        }

        if (side !== "buy" && side !== "sell") {
            return res
                .status(400)
                .json({ success: false, error: "side must be either 'buy' or 'sell'." });
        }

        if (orderType === "limit") {
            if (price == null || typeof price !== "number" || price <= 0) {
                return res
                    .status(400)
                    .json({ success: false, error: "A positive 'price' is required for limit orders." });
            }
        }

        // 3) Find the user’s chosen exchange account
        let account, accountType;
        account = await BinanceAccount.findById(accountId);
        if (account) {
            accountType = "binance";
        } else {
            account = await OkxAccount.findById(accountId);
            if (account) {
                accountType = "okx";
            } else {
                account = await BingxAccount.findById(accountId);
                if (account) {
                    accountType = "bingx";
                }
            }
        }

        if (!account || !accountType) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid account selected." });
        }

        // 4) Fetch free USDT from the exchange for cost validation
        const freeUsdt = await fetchFreeUsdt(account, accountType);

        if (orderType === "limit") {
            const totalCost = Number(quantity) * Number(price);
            if (totalCost > freeUsdt) {
                return res
                    .status(400)
                    .json({ success: false, error: "Insufficient USDT balance for this limit order." });
            }
        }

        // 5) (Stub) – In a real implementation, we would now place the order on the exchange.
        // For this version, we simply echo back the “would-be” order details.

        const stubResult = {
            placedOrder: {
                exchange:       accountType,
                accountId:      accountId,
                symbol,
                orderType,
                side,
                quantity,
                price:          orderType === "limit" ? price : null,
                takeProfitPct:  takeProfitPct != null ? takeProfitPct : 0,
                stopLossPct:    stopLossPct != null ? stopLossPct : 0,
            },
            message: "Order stub – integrate real REST calls here.",
        };

        return res.status(200).json({ success: true, data: stubResult });
    } catch (err) {
        console.error("placeOrder error:", err);
        logger.error(`placeOrder error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};
