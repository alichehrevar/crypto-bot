// app/http/controllers/userController.js

const User = require('../../models/User');
const UserInfo = require('../../models/UserInfo');
const FavoriteSymbol = require('../../models/FavoriteSymbol');

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
                phoneCountry: user.info.phoneCountry,
                phoneNumber:  user.info.phoneNumber,
                birthday:     user.info.birthday,
                avatar:       user.info.avatar,
            } : null,
        },
    });
};

/**
 * @description Updates the information for the authenticated user.
 * It finds the user's associated info document or creates one if it doesn't exist.
 */
exports.updateUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            firstName,
            lastName,
            birthday,
            avatar
        } = req.body;

        // Prepare the fields to be updated
        const updateData = {
            userId, // Ensure the userId is always linked
            firstName,
            lastName,
            birthday,
            avatar
        };

        // Use findOneAndUpdate with upsert to find the UserInfo by userId or create it.
        // This is more efficient than finding the user first.
        const updatedUserInfo = await UserInfo.findOneAndUpdate(
            { userId: userId },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );

        // Find the user to return the complete data structure
        const user = await User.findById(userId);

        // Return a success response with the updated, populated data
        return res.status(200).json({
            success: true,
            message: 'User information updated successfully.',
            data: {
                id: user._id,
                email: user.email,
                info: {
                    firstName: updatedUserInfo.firstName,
                    lastName:  updatedUserInfo.lastName,
                    birthday:     updatedUserInfo.birthday,
                    avatar:       updatedUserInfo.avatar,
                }
            }
        });

    } catch (error) {
        console.error('Error in updateUserInfo:', error);
        // Provide more specific error messages if possible, e.g., for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
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

