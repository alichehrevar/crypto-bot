// app/http/controllers/accountController.js
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount = require('../../models/OkxAccount');
const BingxAccount = require('../../models/BingxAccount');

// Import services that handle the API calls for each exchange.
const BinanceService = require('../../services/binanceWS');
const OkxService = require('../../services/okxWS'); // Ensure you have this or adjust accordingly.
const BingxService = require('../../services/bingXWS');

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
        res.status(500).json({message: 'Error finding BingX account', error: error.message});
    }
};

/**
 * Link or update a user's bingX account.
 */
exports.addBingxAccount = async (req, res) => {
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
                balance = await BinanceService.getBalance(account);
                break;
            case 'okx':
                balance = await OkxService.getBalance(account);
                break;
            case 'bingx':
                balance = await BingxService.getBalance(account);
                break;
            default:
                return res.status(400).json({error: 'Unsupported account type'});
        }
        return res.json({balance});
    } catch (error) {
        console.error('Error fetching account balance:', error.message);
        return res.status(500).json({error: 'Error fetching account balance'});
    }
};
