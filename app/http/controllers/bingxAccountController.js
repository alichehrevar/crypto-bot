// app/http/controllers/bingxAccountController.js
const BingxAccount = require('../../models/BingxAccount');

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

