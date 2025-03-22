// app/http/controllers/accountController.js
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount = require('../../models/OkxAccount');
const BingxAccount = require('../../models/BingxAccount');
const User = require('../../models/User');

// Import services that handle the API calls for each exchange.
const BinanceService = require('../../services/binanceWS');
const OkxService = require('../../services/okxWS'); // Ensure you have this or adjust accordingly.
const BingxService = require('../../services/bingXWS');

/**
 * Link or update a user's Binance account.
 */
exports.linkBinanceAccount = async (req, res) => {
    try {
        const { apiKey, secretKey } = req.body;
        const userId = req.user._id; // Assuming authentication middleware sets req.user

        if (!apiKey || !secretKey) {
            return res.status(400).json({ error: 'Both apiKey and secretKey are required' });
        }

        // Use upsert: update if account exists; otherwise create a new one.
        const account = await BinanceAccount.findOneAndUpdate(
            { userId },
            { apiKey, secretKey },
            { new: true, upsert: true }
        );
        res.json(account);
    } catch (error) {
        console.error("Error linking Binance account:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Link or update a user's OKX account.
 */
exports.linkOkxAccount = async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase } = req.body;
        const userId = req.user._id; // Assuming authentication middleware sets req.user

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
        res.status(500).json({ error: error.message });
    }
};

/**
 * Link or update a user's bingX account.
 */
exports.addBingxAccount = async (req, res) => {
    try {
        const { apiKey, secretKey } = req.body;
        // Validate incoming data (you might have some middleware for this)
        const newAccount = new BingxAccount({
            userId: req.user._id,
            apiKey,
            secretKey
        });
        await newAccount.save();
        res.status(201).json({ message: 'BingX account added successfully', account: newAccount });
    } catch (error) {
        res.status(500).json({ message: 'Error adding BingX account', error: error.message });
    }
};


/**
 * GET /accounts/:accountId/balance
 * Fetches the balance for the specified account.
 */
exports.getAccountBalance = async (req, res) => {
    const { accountId } = req.params;
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
            return res.status(404).json({ error: 'Account not found' });
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
                return res.status(400).json({ error: 'Unsupported account type' });
        }
        return res.json({ balance });
    } catch (error) {
        console.error('Error fetching account balance:', error.message);
        return res.status(500).json({ error: 'Error fetching account balance' });
    }
};
