const axios = require("axios");

// app/http/controllers/accountController.js
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
    const { accountId } = req.params;
    // Default accountType to 'spot' if not provided. This makes '?accountType=spot' optional for spot balances.
    const { accountType = 'spot' } = req.query;

    try {
        let account;
        let service;

        // Attempt to find the account in each model and assign the corresponding pre-imported service.
        account = await BinanceAccount.findById(accountId).lean();
        if (account) {
            service = BinanceService;
        } else {
            account = await OkxAccount.findById(accountId).lean();
            if (account) {
                service = OkxService;
            } else {
                account = await BingxAccount.findById(accountId).lean();
                if (account) {
                    service = BingxService;
                }
            }
        }

        // If no account was found in any of the collections.
        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        // Define the options for the getBalance call based on the query parameter.
        // If accountType is 'spot', `all` will be false.
        // If accountType is 'futures' or anything else, `all` will be true.
        const options = {
            all: false,
            accountType: accountType
        };

        // Call the getBalance method from the dynamically assigned service.
        const balanceData = await service.getBalance(account, options);

        // Return the standardized success response.
        return res.json({ success: true, data: balanceData });

    } catch (error) {
        console.error('Error fetching account balance:', error.message);
        // logger.error(`Error fetching account balance: ${error.message}`, { stack: error.stack });

        // Return the standardized error response.
        return res.status(500).json({ success: false, error: 'Internal server error while fetching account balance' });
    }
};

/**
 * @description Gets the available leverage options for a given symbol and account.
 * Differentiates between 'spot' (Margin Trading) and 'futures' markets via a query parameter.
 * @example GET /api/accounts/:accountId/leverage-options?symbol=BTC/USDT&marketType=futures
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getLeverageOptions = async (req, res) => {
    const { accountId } = req.params;
    const { symbol, marketType = 'futures' } = req.query; // Default to 'futures' if not specified

    // 1) Find the account to determine the exchange
    let account, exchangeType;
    // This can be optimized, but we'll keep the existing logic for now.
    account = await BinanceAccount.findById(accountId).lean();
    if (account) exchangeType = 'binance';
    else {
        account = await OkxAccount.findById(accountId).lean();
        if (account) exchangeType = 'okx';
        else {
            account = await BingxAccount.findById(accountId).lean();
            if (account) exchangeType = 'bingx';
        }
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
                    // For Binance Spot Margin, max leverage is typically 3x for Cross and 10x for Isolated.
                    // The /sapi/v1/margin/isolated/pair endpoint can confirm if a pair is available for 10x.
                    // For simplicity, we'll offer a common range up to 10x.
                    leverages = Array.from({ length: 10 }, (_, i) => i + 1);
                    break;
                }
                case 'okx': {
                    // OKX provides max leverage for spot margin via its public config endpoint.
                    const resp = await axios.get('https://www.okx.com/api/v5/public/margin-config', {
                        params: { instId: symbol.replace('/', '-') }
                    });
                    const maxLev = parseInt(resp.data.data[0]?.lever || '3', 10); // Default to 3x if not found
                    leverages = Array.from({ length: maxLev }, (_, i) => i + 1);
                    break;
                }
                case 'bingx': {
                    // BingX Spot Margin leverage is typically fixed. For example, 10x for most pairs.
                    // As their API doesn't provide a dynamic endpoint for this, we'll return a sensible default.
                    leverages = Array.from({ length: 10 }, (_, i) => i + 1);
                    break;
                }
            }
        } else {
            // --- LOGIC FOR FUTURES TRADING (Original logic, but cleaned up) ---
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
                    // BingX doesn't have a dedicated leverage bracket endpoint,
                    // but we can query the contract details.
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
 * @description Fetches a summary of the user's accounts. It calculates the live total balance,
 * compares it against the most recent historical snapshot to get the percentage change,
 * and retrieves the last 7 days of history for the chart.
 * @param {object} req - Express request object, containing the authenticated user's ID.
 * @param {object} res - Express response object.
 */
exports.getSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        // --- Step 1: Fetch the LIVE Total Balance (remains unchanged) ---

        const [binanceAccts, okxAccts, bingxAccts] = await Promise.all([
            BinanceAccount.find({ userId }).lean(),
            OkxAccount.find({ userId }).lean(),
            BingxAccount.find({ userId }).lean(),
        ]);

        const sumTotalBalance = async (accounts, Service) => {
            if (!accounts || accounts.length === 0) return 0;
            const balances = await Promise.all(accounts.map(acc => Service.getBalance(acc, { all: true })));
            return balances.flat().reduce((sum, bal) => sum + parseFloat(bal.usdtBalance || '0'), 0);
        };

        const [binanceBalance, okxBalance, bingxBalance] = await Promise.all([
            sumTotalBalance(binanceAccts, BinanceService),
            sumTotalBalance(okxAccts, OkxService),
            sumTotalBalance(bingxAccts, BingxService)
        ]);

        const totalBalance = binanceBalance + okxBalance + bingxBalance;


        // --- Step 2: Calculate Portfolio Balance from Closed Trades ---

        // First, find all bots that belong to the current user
        const userBots = await BotBase.find({ userId }).select('_id').lean();
        const botIds = userBots.map(bot => bot._id);

        // Then, find all trades associated with those bots that are considered "closed"
        // A trade is closed if it has an exitPrice.
        const closedTrades = await Trade.find({
            bot: { $in: botIds },
            exitPrice: { $ne: null, $gt: 0 }
        }).lean();

        // Calculate the portfolio balance by summing the capital used (entryPrice * quantity) for each closed trade
        const portfolioBalance = closedTrades.reduce((sum, trade) => {
            return sum + (trade.entryPrice * trade.quantity);
        }, 0);

        // --- Step 3: Calculate Available Funds ---
        const availableFunds = totalBalance - portfolioBalance;


        // --- Step 4: Fetch snapshot and calculate Percentage Change (remains unchanged) ---
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


        // --- Step 5: Fetch 7-day history for the chart (remains unchanged) ---
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);


        // 1. Define the date range (last 5 days)
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(today.getDate() - 5);
        fiveDaysAgo.setHours(0, 0, 0, 0); // Set to the beginning of the day for a clean range

        // 2. Fetch snapshots from the database within this range
        const recentSnapshots = await AssetSnapshot.find({
            userId,
            timestamp: { $gte: fiveDaysAgo }
        }).sort({ timestamp: 'asc' }).lean();

        // 3. Create a lookup map for quick access to snapshot values by date
        const snapshotMap = new Map();
        recentSnapshots.forEach(snap => {
            // Format the date as a key, e.g., "Sep 14"
            const dateKey = new Date(snap.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            // If multiple snapshots exist for one day, this will use the latest one because of the sort
            snapshotMap.set(dateKey, snap.total);
        });

        // 4. Generate the final chart data, ensuring all 5 days are present
        const historyForChart = [];
        for (let i = 4; i >= 0; i--) { // Loop backwards to build the array in chronological order
            const day = new Date();
            day.setDate(today.getDate() - i);
            const dateKey = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            historyForChart.push({
                date: dateKey,
                value: snapshotMap.has(dateKey) ? snapshotMap.get(dateKey) : 0
            });
        }


        // --- Step 6: Format and return the final API response ---
        return res.json({
            success: true,
            data: {
                summary: {
                    portfolioBalance: parseFloat(portfolioBalance.toFixed(2)),
                    availableFunds: parseFloat(availableFunds.toFixed(2)),
                    totalBalance: parseFloat(totalBalance.toFixed(2)),
                    pctChange: parseFloat(pctChange.toFixed(2)),
                },
                history: historyForChart,
            }
        });

    } catch (err) {
        console.error('getSummary controller error:', err.message);
        return res.status(500).json({ success: false, error: 'Internal server error while fetching summary' });
    }
};


