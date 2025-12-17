const axios = require("axios");

// app/http/controllers/accountController.js
const UserInfo = require('../../models/UserInfo');
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount = require('../../models/OkxAccount');
const BingxAccount = require('../../models/BingxAccount');
const AssetSnapshot = require('../../models/AssetSnapshot');
const Trade = require('../../models/Trade');
const BotBase = require('../../models/BotBase');

// Import services that handle the API calls for each exchange.
const BinanceService = require('../../services/binanceWS');
const OkxService = require('../../services/okxWS');
const BingxService = require('../../services/bingXWS');

const logger = require('../../../logs/logger');

// --- Helper Functions ---

/**
 * Safely parses a balance item to find the total USDT value.
 * Handles variations in API responses (e.g., 'usdtBalance', 'equity', 'total').
 */
const getSafeUsdtValue = (item) => {
    if (!item) return 0;
    // Priority: usdtBalance (normalized) > equity (futures) > balance (spot) > total
    const val = item.usdtBalance ?? item.equity ?? item.balance ?? item.total ?? 0;
    return parseFloat(val) || 0;
};

/**
 * Helper to fetch Euro exchange rate
 */
async function fetchExchangeRate() {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USDT');
        return {
            EUR: response.data.rates.EUR,
            USD: response.data.rates.USD,
        };
    } catch (e) {
        logger.error('Error fetching exchange rate, defaulting to 1:', e.message);
        console.error('Error fetching exchange rate, defaulting to 1:', e.message);
        return 1;
    }
}

// --- Controllers ---

exports.getConnectionStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const binanceAccount = await BinanceAccount.findOne({ userId });
        const okxAccount = await OkxAccount.findOne({ userId });
        const bingxAccount = await BingxAccount.findOne({ userId });

        res.status(200).json({
            status: true,
            data: {
                binance: !!binanceAccount,
                okx: !!okxAccount,
                bingx: !!bingxAccount,
                bybit: false,
                coinbase: false,
                kraken: false,
            }
        });

    } catch (error) {
        console.error("Error fetching account statuses:", error);
        logger.error(`Error fetching account statuses: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all accounts.
 */
exports.getAllAccountsData = async (req, res) => {
    try {
        const userId = req.user.id;

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
        const account = await BinanceAccount.findOne({ userId });
        res.status(201).json({ message: '', account: account });
    } catch (error) {
        console.error("Error finding Binance account:", error);
        logger.error(`Error finding Binance account: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
};

/**
 * Link or update a user's Binance account.
 */
exports.linkBinanceAccount = async (req, res) => {
    try {
        const { apiKey, secretKey } = req.body;
        const userId = req.user.id;

        if (!apiKey || !secretKey) {
            return res.status(400).json({ error: 'Both apiKey and secretKey are required' });
        }

        const account = await BinanceAccount.findOneAndUpdate(
            { userId },
            { apiKey, secretKey },
            { new: true, upsert: true }
        );
        res.json(account);
    } catch (error) {
        console.error("Error linking Binance account:", error);
        logger.error(`Error linking Binance account: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get OKX account.
 */
exports.getOkxAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const account = await OkxAccount.findOne({ userId });
        res.status(201).json({ message: '', account: account });
    } catch (error) {
        console.error("Error finding OKX account:", error);
        logger.error(`Error finding OKX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
};

/**
 * Link or update a user's OKX account.
 */
exports.linkOkxAccount = async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase } = req.body;
        const userId = req.user.id;

        if (!apiKey || !secretKey || !passphrase) {
            return res.status(400).json({ error: 'apiKey, secretKey, and passphrase are required' });
        }

        const account = await OkxAccount.findOneAndUpdate(
            { userId },
            { apiKey, secretKey, passphrase },
            { new: true, upsert: true }
        );
        res.json(account);
    } catch (error) {
        console.error("Error linking OKX account:", error);
        logger.error(`Error finding OKX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get bingX account.
 */
exports.getBingxAccount = async (req, res) => {
    try {
        const bingxAccount = await BingxAccount.findOne({ userId: req.user.id });
        res.status(201).json({ message: '', account: bingxAccount });
    } catch (error) {
        logger.error(`Error finding BingX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: 'Error finding BingX account', error: error.message });
    }
};

/**
 * Link or update a user's bingX account.
 */
exports.linkBingxAccount = async (req, res) => {
    try {
        const { apiKey, secretKey } = req.body;
        let bingxAccount = await BingxAccount.findOne({ userId: req.user.id });
        if (!bingxAccount) {
            bingxAccount = new BingxAccount({
                userId: req.user.id,
                apiKey,
                secretKey
            });
            await bingxAccount.save();
        } else {
            await BingxAccount.updateOne(
                { userId: req.user.id },
                { apiKey, secretKey }
            );
        }

        // Reconnect the WebSocket with the new credentials
        BingxService.disconnect();
        setTimeout(() => {
            BingxService.connect(bingxAccount);
        }, 1000);

        res.status(201).json({ message: 'BingX account added successfully', account: bingxAccount });
    } catch (error) {
        logger.error(`Error adding BingX account: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: 'Error adding BingX account', error: error.message });
    }
};


/**
 * GET /accounts/:accountId/balance
 * Fetches the balance for the specified account.
 */
exports.getAccountBalance = async (req, res) => {
    const { accountId } = req.params;
    const { accountType = 'spot' } = req.query;

    try {
        let account = null;
        let service = null;
        let exchangeType = null;

        // Try to find the account in all collections simultaneously.
        // using catch(() => null) prevents CastError if ID format doesn't match a specific collection
        const [binance, okx, bingx] = await Promise.all([
            BinanceAccount.findById(accountId).lean().catch(() => null),
            OkxAccount.findById(accountId).lean().catch(() => null),
            BingxAccount.findById(accountId).lean().catch(() => null)
        ]);

        if (binance) {
            account = binance;
            service = BinanceService;
            exchangeType = 'binance';
        } else if (okx) {
            account = okx;
            service = OkxService;
            exchangeType = 'okx';
        } else if (bingx) {
            account = bingx;
            service = BingxService;
            exchangeType = 'bingx';
        }

        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const options = {
            all: false,
            accountType: accountType
        };

        // Call the getBalance method from the dynamically assigned service.
        let balanceData = await service.getBalance(account, options);

        // FIX: BingX sometimes returns an empty array or undefined if a specific wallet is empty.
        // We provide a fallback structure to prevent frontend errors.
        if (exchangeType === 'bingx' && (!balanceData || balanceData.length === 0)) {
            balanceData = [{
                asset: 'USDT',
                free: 0,
                locked: 0,
                usdtBalance: 0
            }];
        }

        return res.json({ success: true, data: balanceData });

    } catch (error) {
        logger.error('Error fetching account balance:', error.message);
        console.error('Error fetching account balance:', error.message);
        return res.status(500).json({ success: false, error: 'Internal server error while fetching account balance' });
    }
};

/**
 * @description Gets the available leverage options for a given symbol and account.
 */
exports.getLeverageOptions = async (req, res) => {
    const { accountId } = req.params;
    const { symbol, marketType = 'futures' } = req.query;

    let account, exchangeType;

    // Robust account finding
    const [binance, okx, bingx] = await Promise.all([
        BinanceAccount.findById(accountId).lean().catch(() => null),
        OkxAccount.findById(accountId).lean().catch(() => null),
        BingxAccount.findById(accountId).lean().catch(() => null)
    ]);

    if (binance) {
        account = binance;
        exchangeType = 'binance';
    } else if (okx) {
        account = okx;
        exchangeType = 'okx';
    } else if (bingx) {
        account = bingx;
        exchangeType = 'bingx';
    }

    if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
    }

    try {
        let leverages = [];

        if (marketType === 'spot') {
            // --- LOGIC FOR SPOT MARGIN TRADING ---
            console.log(`[Leverage] Fetching SPOT margin options for ${exchangeType} and symbol ${symbol}`);
            switch (exchangeType) {
                case 'binance': {
                    leverages = Array.from({ length: 10 }, (_, i) => i + 1);
                    break;
                }
                case 'okx': {
                    const resp = await axios.get('https://www.okx.com/api/v5/public/margin-config', {
                        params: { instId: symbol.replace('/', '-') }
                    });
                    const maxLev = parseInt(resp.data.data[0]?.lever || '3', 10);
                    leverages = Array.from({ length: maxLev }, (_, i) => i + 1);
                    break;
                }
                case 'bingx': {
                    leverages = Array.from({ length: 10 }, (_, i) => i + 1);
                    break;
                }
            }
        } else {
            // --- LOGIC FOR FUTURES TRADING ---
            console.log(`[Leverage] Fetching FUTURES leverage options for ${exchangeType} and symbol ${symbol}`);
            switch (exchangeType) {
                case 'binance': {
                    const resp = await axios.get('https://fapi.binance.com/fapi/v1/leverageBracket', {
                        params: { symbol: symbol.replace('/', '') }
                    });
                    const maxLev = parseInt(resp.data[0]?.brackets[0]?.initialLeverage || '20', 10);
                    leverages = Array.from({ length: maxLev }, (_, i) => i + 1);
                    break;
                }
                case 'okx': {
                    const resp = await axios.get('https://www.okx.com/api/v5/public/instruments', {
                        params: { instType: 'SWAP', instId: symbol.replace('/', '-') }
                    });
                    const maxLev = parseInt(resp.data.data[0]?.maxLvr || '20', 10);
                    leverages = Array.from({ length: maxLev }, (_, i) => i + 1);
                    break;
                }
                case 'bingx': {
                    const resp = await axios.get('https://open-api.bingx.com/openApi/swap/v2/quote/contracts');
                    const contract = resp.data.data.find(c => c.symbol === symbol.replace('/', '-'));
                    if (!contract) return res.status(404).json({ error: `Symbol ${symbol} not found on BingX Futures` });

                    const maxLev = parseInt(contract.maxLeverage || '50', 10);
                    leverages = Array.from({ length: maxLev }, (_, i) => i + 1);
                    break;
                }
            }
        }

        return res.json({ success: true, leverages });
    } catch (err) {
        console.error('getLeverageOptions error:', err.response?.data || err.message);
        logger.error(`getLeverageOptions error: ${err.message}`, { stack: err.stack });
        const errorMessage = err.response?.data?.msg || err.message;
        return res.status(500).json({ success: false, error: errorMessage });
    }
};

/**
 * GET /accounts/assets
 * Returns [{ exchange, totalBalance, pct }, …]
 */
exports.getAssetsDistribution = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1) Load all accounts
        const [binanceAccounts, okxAccounts, bingxAccounts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean(),
        ]);

        // 2) Helper: sum USDT (spot+futures) across a list of accounts
        async function sumUsdt(accounts, service) {
            let total = 0;
            if (!accounts || accounts.length === 0) return 0;

            for (const acct of accounts) {
                try {
                    // Pass { all: true } to include both spot and futures/swap
                    const balArr = await service.getBalance(acct, { all: true });

                    if (Array.isArray(balArr)) {
                        for (const item of balArr) {
                            // Robust check: BingX/OKX might return strings or different keys
                            total += getSafeUsdtValue(item);
                        }
                    }
                } catch (innerErr) {
                    logger.error(`Error aggregating balance for account ${acct._id}:`, innerErr.message);
                    console.error(`Error aggregating balance for account ${acct._id}:`, innerErr.message);
                }
            }
            return total;
        }

        // 3) Fetch & sum in parallel
        const [binanceSum, okxSum, bingxSum] = await Promise.all([
            sumUsdt(binanceAccounts, BinanceService),
            sumUsdt(okxAccounts, OkxService),
            sumUsdt(bingxAccounts, BingxService),
        ]);

        // 4) Build and compute percentages
        const raw = [
            { exchange: 'Binance', total: binanceSum },
            { exchange: 'OKX', total: okxSum },
            { exchange: 'BingX', total: bingxSum },
        ];
        const grandTotal = raw.reduce((sum, r) => sum + r.total, 0) || 1; // Avoid divide by zero

        const distribution = raw.map(r => ({
            exchange: r.exchange,
            totalBalance: parseFloat(r.total.toFixed(2)),
            pct: parseFloat(((r.total / grandTotal) * 100).toFixed(2)),
        }));

        return res.json({ success: true, distribution });
    } catch (err) {
        console.error('getAssetsDistribution error', err);
        logger.error(`getAssetsDistribution error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: err.message });
    }
};


/**
 * @description Fetches a summary of the user's accounts.
 */
exports.getSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        // --- Step 1: Fetch the LIVE Total Balance ---
        const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean(),
        ]);

        // Helper to sum using the safe value parser
        const sumTotalBalance = async (accounts, Service) => {
            if (!accounts || accounts.length === 0) return 0;

            // Map each account to a promise that fetches its balance
            const promises = accounts.map(async (acc) => {
                try {
                    const balances = await Service.getBalance(acc, { all: true });
                    if (!Array.isArray(balances)) return 0;

                    return balances.reduce((accSum, item) => accSum + getSafeUsdtValue(item), 0);
                } catch (e) {
                    logger.error(`Error fetching balance for ${acc._id}:`, e.message);
                    console.error(`Error fetching balance for ${acc._id}:`, e.message);
                    return 0;
                }
            });

            const results = await Promise.all(promises);
            return results.reduce((a, b) => a + b, 0);
        };

        const [binanceBalance, okxBalance, bingxBalance] = await Promise.all([
            sumTotalBalance(binanceAccts, BinanceService),
            sumTotalBalance(okxAccts, OkxService),
            sumTotalBalance(bingxAccts, BingxService)
        ]);

        const totalBalance = binanceBalance + okxBalance + bingxBalance;

        // --- Currency Conversion ---
        let exchangeRate = 1;
        const userInfo = await UserInfo.findOne({ userId: userId });
        if (!userInfo) {
            return res.status(404).json({ success: false, error: 'User info not found' });
        }

        const exchangeRateResponse = await fetchExchangeRate();
        if (userInfo.currency === 'euro') {
            exchangeRate = exchangeRateResponse.EUR
        } else if (userInfo.currency === 'dollar') {
            exchangeRate = exchangeRateResponse.USD;
        }

        // --- Step 2: Calculate Portfolio Balance from Closed Trades ---
        const userBots = await BotBase.find({ userId }).select('_id').lean();
        const botIds = userBots.map(bot => bot._id);

        const closedTrades = await Trade.find({
            bot: { $in: botIds },
            exitPrice: { $ne: null, $gt: 0 }
        }).lean();

        const portfolioBalance = closedTrades.reduce((sum, trade) => {
            return sum + (trade.entryPrice * trade.quantity);
        }, 0);

        // --- Step 3: Calculate Available Funds ---
        const availableFunds = totalBalance - portfolioBalance;

        // --- Step 4: Fetch snapshot and calculate Percentage Change ---
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const lastSnapshot = await AssetSnapshot.findOne({
            userId,
            timestamp: { $lt: today }
        }).sort({ timestamp: -1 });

        let pctChange = 0;
        if (lastSnapshot && lastSnapshot.total > 0) {
            const previousBalance = lastSnapshot.total;
            pctChange = ((totalBalance - previousBalance) / previousBalance) * 100;
        }

        // --- Step 5: Fetch 7-day history for the chart ---
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(today.getDate() - 5);
        fiveDaysAgo.setHours(0, 0, 0, 0);

        const recentSnapshots = await AssetSnapshot.find({
            userId,
            timestamp: { $gte: fiveDaysAgo }
        }).sort({ timestamp: 'asc' }).lean();

        const snapshotMap = new Map();
        recentSnapshots.forEach(snap => {
            const dateKey = new Date(snap.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            snapshotMap.set(dateKey, snap.total);
        });

        const historyForChart = [];
        for (let i = 4; i >= 0; i--) {
            const day = new Date();
            day.setDate(today.getDate() - i);
            const dateKey = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            historyForChart.push({
                date: dateKey,
                value: snapshotMap.has(dateKey) ? snapshotMap.get(dateKey) * exchangeRate : 0
            });
        }

        // --- Step 6: Format and return the final API response ---
        return res.json({
            success: true,
            data: {
                currency: userInfo.currency,
                summary: {
                    portfolioBalance: parseFloat((portfolioBalance * exchangeRate).toFixed(2)),
                    availableFunds: parseFloat((availableFunds * exchangeRate).toFixed(2)),
                    totalBalance: parseFloat((totalBalance * exchangeRate).toFixed(2)),
                    pctChange: parseFloat(pctChange.toFixed(2)),
                },
                history: historyForChart,
            }
        });

    } catch (err) {
        logger.error('getSummary controller error:', err.message);
        console.error('getSummary controller error:', err.message);
        return res.status(500).json({ success: false, error: 'Internal server error while fetching summary' });
    }
};

/**
 * @description Fetches a detailed, hierarchical summary of all assets across all exchanges.
 */
exports.getDetailedSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean(),
        ]);

        const fetchAllAccountDetails = async (accounts, Service) => {
            if (!accounts || accounts.length === 0) return [];
            const results = await Promise.allSettled(
                accounts.map(async (acct, idx) => {
                    const details = await Service.getDetailedBalance(acct);
                    return {
                        accountId: String(acct._id || idx),
                        label: acct.name || acct.alias || acct.nick || `Account #${idx + 1}`,
                        details: Array.isArray(details) ? details : [],
                    };
                })
            );
            return results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);
        };

        const [binanceList, okxList, bingxList] = await Promise.all([
            fetchAllAccountDetails(binanceAccts, BinanceService),
            fetchAllAccountDetails(okxAccts, OkxService),
            fetchAllAccountDetails(bingxAccts, BingxService),
        ]);

        const EXCLUDE_FROM_TOTAL = new Set(['Overview', 'Trading-Equity']);

        const assetTreeChildren = [];
        let totalValue = 0;

        const processBroker = (brokerName, brokerColor, accountBundles) => {
            if (!accountBundles || accountBundles.length === 0) return;

            const brokerChildren = [];
            let brokerTotal = 0;

            for (const bundle of accountBundles) {
                const accChildren = [];
                let accTotal = 0;

                for (const node of bundle.details) {
                    const name = String(node.accountType || node.name || 'Unknown');
                    const val = Number(node.value ?? 0);
                    const children = Array.isArray(node.children) ? node.children : [];

                    if (Number.isFinite(val) && val > 0 && !EXCLUDE_FROM_TOTAL.has(name)) {
                        accTotal += val;
                    }

                    accChildren.push({
                        name,
                        value: Number.isFinite(val) ? val : 0,
                        data: node,
                        children: children?.map(c => ({
                            name: c.name ?? c.asset ?? c.symbol ?? 'Item',
                            value: Number(c.value ?? 0),
                            data: c,
                        })) || [],
                    });
                }

                if (accTotal > 0.01) {
                    brokerTotal += accTotal;
                }

                brokerChildren.push({
                    name: bundle.label,
                    value: accTotal,
                    color: brokerColor,
                    children: accChildren,
                    meta: { accountId: bundle.accountId },
                });
            }

            if (brokerTotal > 0.01) {
                totalValue += brokerTotal;
                assetTreeChildren.push({
                    name: brokerName,
                    value: brokerTotal,
                    color: brokerColor,
                    children: brokerChildren,
                });
            }
        };

        processBroker('Binance', '#30B5D3', binanceList);
        processBroker('OKX', '#DDE000', okxList);
        processBroker('BingX', '#87D30D', bingxList);

        const assetTree = {
            name: 'Assets',
            value: totalValue,
            children: assetTreeChildren,
        };

        return res.json({ success: true, data: assetTree });
    } catch (err) {
        logger.error('getDetailedSummary controller error:', err.message);
        console.error('getDetailedSummary controller error:', err.message);
        return res
            .status(500)
            .json({ success: false, error: 'Internal server error while fetching detailed summary' });
    }
};
