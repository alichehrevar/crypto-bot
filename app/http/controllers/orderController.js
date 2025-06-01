// app/http/controllers/orderController.js

const axios           = require('axios');
const crypto          = require('crypto');
const User            = require('../../models/User');
const BinanceAccount  = require('../../models/BinanceAccount');
const OkxAccount      = require('../../models/OkxAccount');
const BingxAccount    = require('../../models/BingxAccount');
const { Decimal128 }  = require('mongoose').Types;

/**
 * POST /orders/place
 *
 * Expected body (JSON):
 * {
 *   accountId: <ObjectId string>,
 *   symbol: "BTC/USDT",            // trading pair
 *   orderType: "market" | "limit",
 *   side:      "buy" | "sell",
 *   quantity:  <number>,
 *   price?:    <number>,           // required if orderType === "limit"
 *   takeProfitPct: <number>,       // optional, e.g. 5 for +5%
 *   stopLossPct:   <number>        // optional, e.g. 5 for –5%
 * }
 *
 * (For now, this “step 1” stub will only validate and return success.  You can later wire in actual REST calls.)
 */
exports.placeOrder = async (req, res) => {
    try {
        // 1) Check authentication
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
        if (account) accountType = "binance";
        else {
            account = await OkxAccount.findById(accountId);
            if (account) accountType = "okx";
            else {
                account = await BingxAccount.findById(accountId);
                if (account) accountType = "bingx";
            }
        }

        if (!account || !accountType) {
            return res.status(400).json({ success: false, error: "Invalid account selected." });
        }

        // 4) (Stub) – In a real implementation, you would now:
        //    • Use account.apiKey & account.secretKey
        //    • Detect which exchange you’re talking to (accountType)
        //    • Format `symbol` (“BTC/USDT” → “BTCUSDT” for Binance, etc.)
        //    • Build the proper REST URL and signature per exchange docs
        //    • POST the order to the exchange
        //    • If takeProfitPct/stopLossPct are present, optionally place OCO or OTO orders
        //
        //    For this “step 1” stub, we will simply return success and echo back “what would have been sent.”

        const stubResult = {
            placedOrder: {
                exchange: accountType,
                accountId: accountId,
                symbol,
                orderType,
                side,
                quantity,
                price: orderType === "limit" ? price : null,
                takeProfitPct: takeProfitPct != null ? takeProfitPct : 0,
                stopLossPct: stopLossPct != null ? stopLossPct : 0,
            },
            message: "Order stub – you can wire in real REST calls next.",
        };

        return res.status(200).json({ success: true, data: stubResult });
    } catch (err) {
        console.error("placeOrder error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
