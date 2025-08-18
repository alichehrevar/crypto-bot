// app/http/controllers/userController.js

const User = require('../../models/User');
const FavoriteSymbol = require('../../../models/FavoriteSymbol');

exports.userInfo = async (req, res) => {
    const user = await User.findById(req.user?.id).populate('info');
    if (!user) {
        return res.status(401).json({ message: 'User not found.', success: false });
    }

    return res.json({
        success: true,
        data: {
            id: user._id,
            email: user.email,
            info: user.info ? {
                firstName: user.info.firstName,
                lastName:  user.info.lastName,
                gender:    user.info.gender,
                phoneCountry: user.info.phoneCountry,
                phoneNumber:  user.info.phoneNumber,
                birthday:     user.info.birthday,
                avatar:       user.info.avatar,
            } : null,
        },
    });
};

/**
 * Adds or removes a symbol from a user's favorites list.
 * If the symbol is already a favorite, it's removed. If not, it's added.
 */
exports.toggleFavoriteSymbol = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol, broker, category } = req.body;

        // Validate required fields
        if (!symbol || !broker || !category) {
            return res.status(400).json({ success: false, message: 'Symbol, broker, and category are required.' });
        }

        // Check if the symbol is already in the user's favorites
        const existingFavorite = await FavoriteSymbol.findOne({ userId, symbol });

        if (existingFavorite) {
            // If it exists, remove it (unfavorite action)
            await existingFavorite.deleteOne();
            return res.status(200).json({
                success: true,
                action: 'removed',
                message: `${symbol} was removed from your favorites.`
            });
        } else {
            // If it doesn't exist, add it (favorite action)
            const newFavorite = new FavoriteSymbol({
                userId,
                symbol,
                broker,
                category
            });
            await newFavorite.save();
            return res.status(201).json({
                success: true,
                action: 'added',
                message: `${symbol} was added to your favorites.`
            });
        }
    } catch (error) {
        console.error('Error in toggleFavoriteSymbol:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

