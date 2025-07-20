const axios = require("axios");

// app/http/controllers/accountController.js
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount = require('../../models/OkxAccount');
const BingxAccount = require('../../models/BingxAccount');

// Import services that handle the API calls for each exchange.
const BinanceService = require('../../services/binanceWS');
const OkxService = require('../../services/okxWS');
const BingxService = require('../../services/bingXWS');

const logger = require('../../../logs/logger')

/**
 * Get all accounts.
 */
exports.getAllAccountsData = async (req, res) => {
    try {
        // Get the user's ID from the verified token (set in req.user)
        const userId = req.user.id;

        // Query each account collection for the user's account.
        const binanceAccount = await BinanceAccount.findOne({ userId });
        const okxAccount = await OkxAccount.findOne({ userId });
        const bingxAccount = await BingxAccount.findOne({ userId });

        res.status(200).json({
            message: 'Accounts fetched successfully',
            accounts: {
                binance: binanceAccount || {},
                okx: okxAccount || {},
                bingx: bingxAccount || {},
            }
        });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        logger.error(`Error fetching accounts: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Binance account.
 */
exports.getBinanceAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        const account = await BinanceAccount.findOne({userId});
        res.status(201).json({message: '', account: account});
    } catch (error) {
        console.error("Error finding Binance account:", error);
        logger.error(`Error finding Binance account: ${error.message}`, { stack: error.stack });
        res.status(500).json({error: error.message});
    }
};

/**
 * Link or update a user's Binance account.
 */
exports.linkBinanceAccount = async (req, res) => {
    try {
        const {apiKey, secretKey} = req.body;
        const userId = req.user.id;

        if (!apiKey || !secretKey) {
            return res.status(400).json({error: 'Both apiKey and secretKey are required'});
        }

        // Use upsert: update if account exists; otherwise create a new one.
        const account = await BinanceAccount.findOneAndUpdate(
            {userId},
            {apiKey, secretKey},
            {new: true, upsert: true}
        );
        res.json(account);
    } catch (error) {
        console.error("Error linking Binance account:", error);
        logger.error(`Error linking Binance account: ${error.message}`, { stack: error.stack });
        res.status(500).json({error: error.message});
    }
};

/**
 * Get OKX account.
 */
exports.getOkxAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        const account = await OkxAccount.findOne({userId});
        res.status(201).json({message: '', account: account});
    } catch (error) {
        console.error("Error finding OKX account:", error);
        logger.error(`Error finding OKX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({error: error.message});
    }
};

/**
 * Link or update a user's OKX account.
 */
exports.linkOkxAccount = async (req, res) => {
    try {
        const {apiKey, secretKey, passphrase} = req.body;
        const userId = req.user.id;

        if (!apiKey || !secretKey || !passphrase) {
            return res.status(400).json({error: 'apiKey, secretKey, and passphrase are required'});
        }

        const account = await OkxAccount.findOneAndUpdate(
            {userId},
            {apiKey, secretKey, passphrase},
            {new: true, upsert: true}
        );
        res.json(account);
    } catch (error) {
        console.error("Error linking OKX account:", error);
        logger.error(`Error finding OKX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({error: error.message});
    }
};

/**
 * Get bingX account.
 */
exports.getBingxAccount = async (req, res) => {
    try {
        const bingxAccount = await BingxAccount.findOne({userId: req.user.id})
        res.status(201).json({message: '', account: bingxAccount});
    } catch (error) {
        logger.error(`Error finding BingX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({message: 'Error finding BingX account', error: error.message});
    }
};

/**
 * Link or update a user's bingX account.
 */
exports.linkBingxAccount = async (req, res) => {
    try {
        const {apiKey, secretKey} = req.body;
        let bingxAccount = await BingxAccount.findOne({userId: req.user.id})
        if (!bingxAccount) {
            bingxAccount = new BingxAccount({
                userId: req.user.id,
                apiKey,
                secretKey
            });
            await bingxAccount.save();
        } else {
            await BingxAccount.updateOne(
                {userId: req.user.id},
                {apiKey, secretKey}
            );
        }

        // Reconnect the WebSocket with the new credentials
        BingxService.disconnect(); // Disconnect first to clean up
        setTimeout(() => {
            BingxService.connect(bingxAccount); // Reconnect with new credentials
        }, 1000);

        res.status(201).json({message: 'BingX account added successfully', account: bingxAccount});
    } catch (error) {
        logger.error(`Error adding BingX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({message: 'Error adding BingX account', error: error.message});
    }
};


/**
 * GET /accounts/:accountId/balance
 * Fetches the balance for the specified account.
 */
exports.getAccountBalance = async (req, res) => {
    const {accountId} = req.params;
    try {
        let account;
        let type = '';

        // Attempt to find the account in each model.
        account = await BinanceAccount.findById(accountId);
        if (account) {
            type = 'binance';
        }
        if (!account) {
            account = await OkxAccount.findById(accountId);
            if (account) type = 'okx';
        }
        if (!account) {
            account = await BingxAccount.findById(accountId);
            if (account) type = 'bingx';
        }
        if (!account) {
            return res.status(404).json({error: 'Account not found'});
        }

        let balance;
        // Depending on the account type, use the corresponding service.
        switch (type) {
            case 'binance':
                balance = await BinanceService.getBalance(account, { all: true });
                break;
            case 'okx':
                balance = await OkxService.getBalance(account, { all: true });
                break;
            case 'bingx':
                balance = await BingxService.getBalance(account, { all: true });
                break;
            default:
                return res.status(400).json({error: 'Unsupported account type'});
        }
        return res.json({ success: true, balance});
    } catch (error) {
        console.error('Error fetching account balance:', error.message);
        logger.error(`Error fetching account balance: ${error.message}`, { stack: error.stack });
        return res.status(500).json({error: 'Error fetching account balance', success: false});
    }
};

exports.getLeverageOptions = async (req, res) => {
    const { accountId } = req.params;
    const { symbol }    = req.query;


    // 1) find which account
    let account, type;
    account = await BinanceAccount.findById(accountId);
    if (account) type = 'binance';
    else {
        account = await OkxAccount.findById(accountId);
        if (account) type = 'okx';
        else {
            account = await BingxAccount.findById(accountId);
            if (account) type = 'bingx';
        }
    }
    if (!account) return res.status(404).json({ error: 'Account not found' });

    try {
        let leverages = [];
        switch (type) {
            case 'binance':
                // Binance FUTURES exchangeInfo
            {
                const resp = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
                const s = resp.data.symbols.find(s => s.symbol === symbol.replace('/',''));
                if (s) {
                    const filt = s.filters.find(f=>f.filterType==='LEVERAGE_BRACKET');
                    // filterType may be different; you may need LEVERAGE or MARKET_LOT_SIZE
                    const maxLev = +s.marginAsset === 1 ? 125 : 20; // example
                    for (let l = 1; l <= (filt?.brackets?.[0]?.initialLeverage || maxLev); l++) {
                        leverages.push(l);
                    }
                }
            }
                break;

            case 'okx':
                // OKX API
                {
                    const resp = await axios.get('https://www.okx.com/api/v5/public/instruments', {
                        params: { instType:'SWAP', uly: symbol.replace('/USDT','') }
                    });
                    const inst = resp.data.data[0];
                    const maxLev = +inst.maxLvg;
                    leverages = Array.from({length: maxLev}, (_,i)=>i+1);
                }
                break;

            case 'bingx':
                // BingX – your own wrapper
                // 1) fetch all perpetual symbols
                const resp = await axios.get('https://api.bingx.com/api/v1/market/symbols');
                // 2) unwrap to the array
                const all = resp.data?.data?.result || [];
                // 3) ticker_id is like "BTC-USDT", so convert from "BTC/USDT"
                const tickerId = symbol.replace('/', '-');
                const info     = all.find(t => t.ticker_id === tickerId);
                if (!info) {
                    return res.status(404).json({ error: `Symbol ${symbol} not found on BingX` });
                }

                // 4) BingX doesn't explicitly return maxLeverage here,
                //    so you’ll need to pick a sensible default or call a different endpoint.
                //    For example, you might assume 50× by default:
                const maxLev = info.max_leverage ?? 50;

                leverages = Array.from({ length: maxLev }, (_, i) => i + 1);
                break;
        }

        return res.json({ success: true, leverages });
    } catch (err) {
        console.error('getLeverageOptions error', err);
        logger.error(`getLeverageOptions error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /accounts/assets
 * Returns [{ exchange, totalBalance, pct }, …]
 */
exports.getAssetsDistribution = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1) Load all accounts, grouped by exchange
        const [binanceAccounts, okxAccounts, bingxAccounts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean(),
        ]);

        // 2) Helper: sum USDT (spot+futures) across a list of accounts
        async function sumUsdt(accounts, service) {
            let total = 0;
            for (const acct of accounts) {
                // pass { all: true } to include both spot and futures
                const balArr = await service.getBalance(acct, { all: true });
                for (const { usdtBalance } of balArr) {
                    total += parseFloat(usdtBalance) || 0;
                }
            }
            return total;
        }

        // 3) Fetch & sum in parallel
        const [binanceSum, okxSum, bingxSum] = await Promise.all([
            sumUsdt(binanceAccounts, BinanceService),
            sumUsdt(okxAccounts,     OkxService),
            sumUsdt(bingxAccounts,   BingxService),
        ]);

        // 4) Build and compute percentages
        const raw = [
            { exchange: 'Binance', total: binanceSum },
            { exchange: 'OKX',     total: okxSum     },
            { exchange: 'BingX',   total: bingxSum   },
        ];
        const grandTotal = raw.reduce((sum, r) => sum + r.total, 0) || 1;

        const distribution = raw.map(r => ({
            exchange:     r.exchange,
            totalBalance: parseFloat(r.total.toFixed(2)),
            pct:          parseFloat(((r.total / grandTotal) * 100).toFixed(2)),
        }));

        return res.json({ success: true, distribution });
    }
    catch (err) {
        console.error('getAssetsDistribution error', err);
        logger.error(`getAssetsDistribution error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};


/**
 * GET /api/accounts/summary
 *
 * Returns:
 * {
 *   success: true,
 *   summary: {
 *     totalBalance: number,
 *     availableFunds: number,
 *     pctChange: number
 *   }
 * }
 */
exports.getSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1) Load accounts
        const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean(),
        ]);

        // Helper: sum USDT in either spot-only or spot+futures
        async function sumUsdt(accounts, service, all) {
            let total = 0;
            for (const acct of accounts) {
                const arr = await service.getBalance(acct, { all });
                for (const b of arr) {
                    total += parseFloat(b.usdtBalance);
                }
            }
            return total;
        }

        // 2) Kick off all nine sums in parallel (spot/full/then × 3 services)
        const promises = [
            // spot-now
            sumUsdt(binanceAccts, BinanceService, false),
            sumUsdt(okxAccts,     OkxService,     false),
            sumUsdt(bingxAccts,   BingxService,   false),

            // full-now
            sumUsdt(binanceAccts, BinanceService, true),
            sumUsdt(okxAccts,     OkxService,     true),
            sumUsdt(bingxAccts,   BingxService,   true),

            // full-then (placeholder – wire to your snapshot logic)
            sumUsdt(binanceAccts, BinanceService, true),
            sumUsdt(okxAccts,     OkxService,     true),
            sumUsdt(bingxAccts,   BingxService,   true),
        ];

        const [
            spotBin, spotOkx, spotBingx,
            fullBin, fullOkx, fullBingx,
            thenBin, thenOkx, thenBingx
        ] = await Promise.all(promises);

        // 3) Compute aggregates
        const availableFunds    = spotBin  + spotOkx  + spotBingx;
        const portfolioBalance  = fullBin  + fullOkx  + fullBingx;
        const totalBalance      = portfolioBalance;
        const thenTotal         = thenBin  + thenOkx  + thenBingx || 1;
        const pctChange         = ((portfolioBalance - thenTotal) / thenTotal) * 100;

        // 4) Return four clean numeric fields
        return res.json({
            success: true,
            summary: {
                portfolioBalance: parseFloat(portfolioBalance.toFixed(2)),
                availableFunds:   parseFloat(availableFunds.toFixed(2)),
                totalBalance:     parseFloat(totalBalance.toFixed(2)),
                pctChange:        parseFloat(pctChange.toFixed(2)),
            }
        });
    } catch (err) {
        console.error('accountsController.getSummary', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};


