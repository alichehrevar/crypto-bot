// app/http/controllers/accountController.js
const BinanceAccount = require('../../models/BinanceAccount');
const OkxAccount = require('../../models/OkxAccount');
const User = require('../../models/User');

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
