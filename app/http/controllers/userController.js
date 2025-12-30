// app/http/controllers/userController.js

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require("bcryptjs");
const User = require('../../models/User');
const UserInfo = require('../../models/UserInfo');
const FavoriteSymbol = require('../../models/FavoriteSymbol');
const MarketService = require('../../services/marketService');
const MarketSnapshot = require('../../models/MarketSnapshot');
const { sendOtpAndHandleFailure } = require('../../services/user/otpService');

const AssetSnapshot = require('../../models/AssetSnapshot');
const financeService = require('../../services/financeService'); // Import the new service

const logger = require("../../../logs/logger");
const BotBase = require("../../models/BotBase");

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
                currency:       user.info.currency,
                timezone:       user.info.timezone,
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
            userId,
            firstName,
            lastName,
            birthday,
            avatar
        };

        // Use findOneAndUpdate with upsert to find the UserInfo by userId or create it.
        // This is more efficient than finding the user first.
        const updatedUserInfo = updateUserInformation(userId, updateData);

        // Find the user to return the complete data structure
        const user = await User.findById(userId);

        // Return a success response with the updated, populated data
        return res.status(200).json({
            success: true,
            message: 'User information updated successfully.',
            data: {
                id: user._id,
                email: user.email,
                enable2Fa: user.enable2FA,
                info: {
                    firstName: updatedUserInfo.firstName,
                    lastName:  updatedUserInfo.lastName,
                    birthday:     updatedUserInfo.birthday,
                    avatar:       updatedUserInfo.avatar,
                    currency: updatedUserInfo.currency,
                    timezone: updatedUserInfo.timezone,
                }
            }
        });

    } catch (error) {
        logger.error('Error in updateUserInfo:', error);
        console.error('Error in updateUserInfo:', error);
        // Provide more specific error messages if possible, e.g., for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * @description Updates the preferences for the authenticated user.
 * It finds the user's associated info document or creates one if it doesn't exist.
 */
exports.updateUserPreference = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            currency,
            timezone,
        } = req.body;

        // Prepare the fields to be updated
        const updateData = {
            currency,
            timezone,
        };

        // Use findOneAndUpdate with upsert to find the UserInfo by userId or create it.
        // This is more efficient than finding the user first.
        const updatedUserInfo = updateUserInformation(userId, updateData);

        // Find the user to return the complete data structure
        const user = await User.findById(userId);

        // Return a success response with the updated, populated data
        return res.status(200).json({
            success: true,
            message: 'User information updated successfully.',
            data: {
                id: user._id,
                email: user.email,
                enable2Fa: user.enable2FA,
                info: {
                    firstName: updatedUserInfo.firstName,
                    lastName:  updatedUserInfo.lastName,
                    birthday:     updatedUserInfo.birthday,
                    avatar:       updatedUserInfo.avatar,
                    currency: updatedUserInfo.currency,
                    timezone: updatedUserInfo.timezone,
                }
            }
        });

    } catch (error) {
        logger.error('Error in updateUserInfo:', error);
        console.error('Error in updateUserInfo:', error);
        // Provide more specific error messages if possible, e.g., for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// This is your controller function
exports.updateUserAvatar = async (req, res) => {
    try {
        // The upload is handled by the middleware. If this function is called,
        // the file is already uploaded, or an error was thrown.

        // req.file contains information about the uploaded file
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file was uploaded.' });
        }

        const userId = req.user.id;

        // 1. Find the existing user info to get the old avatar path
        const userInfo = await UserInfo.findOne({ userId: userId });

        // 2. If an old avatar exists, delete it from the filesystem
        if (userInfo && userInfo.avatar) {
            // Construct the physical path to the old avatar file
            // e.g., 'public/uploads/avatars/avatar-user123-timestamp.png'
            const oldAvatarPath = path.join('public', userInfo.avatar);

            try {
                await fs.unlink(oldAvatarPath);
                console.log(`Successfully deleted old avatar: ${oldAvatarPath}`);
            } catch (err) {
                // If the file doesn't exist, we don't need to throw an error.
                // We can just log it and continue. This handles cases where the
                // file was manually deleted or the DB is out of sync.
                if (err.code !== 'ENOENT') { // ENOENT = Error NO ENTry (file not found)
                    console.error('Error deleting old avatar file:', err);
                }
            }
        }

        // Construct the URL to the avatar
        // Make sure your server serves the 'public' folder statically
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Save the avatarUrl to the user's record in your database
        const updatedUserInfo = await UserInfo.findOneAndUpdate(
            {userId: userId},
            {avatar: avatarUrl},
            { new: true, upsert: true, runValidators: true }
        );

        const user = await User.findById(userId);

        res.status(200).json({
            success: true,
            message: 'Avatar updated successfully!',
            data: {
                id: user._id,
                email: user.email,
                enable2Fa: user.enable2FA,
                info: {
                    firstName: updatedUserInfo.firstName,
                    lastName:  updatedUserInfo.lastName,
                    birthday:     updatedUserInfo.birthday,
                    avatar:       updatedUserInfo.avatar,
                }
            }
        });

    } catch (error) {
        logger.error('Error updating avatar:', error);
        console.error('Error updating avatar:', error);
        res.status(500).json({ success: false, message: 'Server error while updating avatar.' });
    }
};

exports.updateUserSecurityInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            phoneNumber,
            phoneCountry,
            password,
            newPassword,
            confirmPassword
        } = req.body;


        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
        }

        // Find the user to return the complete data structure
        const user = await User.findById(userId);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }


        // Prepare the fields to be updated
        const updateData = {
            userId,
            phoneNumber,
            phoneCountry,
        };

        // Use findOneAndUpdate with upsert to find the UserInfo by userId or create it.
        // This is more efficient than finding the user first.
        const updatedUserInfo = updateUserInformation(userId, updateData);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.findOneAndUpdate(
            { userId: userId },
            { $set: {password: hashedPassword} },
            { new: true, upsert: true, runValidators: true }
        );

        // Return a success response with the updated, populated data
        return res.status(200).json({
            success: true,
            message: 'User information updated successfully.',
            data: {
                id: user._id,
                email: user.email,
                enable2Fa: user.enable2FA,
                info: {
                    firstName: updatedUserInfo.firstName,
                    lastName:  updatedUserInfo.lastName,
                    birthday:     updatedUserInfo.birthday,
                    avatar:       updatedUserInfo.avatar,
                }
            }
        });

    } catch (error) {
        logger.error('Error in updateUserInfo:', error);
        console.error('Error in updateUserInfo:', error);
        // Provide more specific error messages if possible, e.g., for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Get the user's list of favorite symbols, augmented with
 * LIVE market data (price, 24h change) fetched from APIs.
 */
exports.favoriteSymbolsList = async (req, res) => {
    try {
        const userId = req.user.id;

        // Use .lean() for faster, plain JavaScript objects
        const favorites = await FavoriteSymbol.find({ userId }).sort({ timestamp: -1 }).lean();

        if (!favorites.length) {
            return res.status(200).json({ data: [], success: true });
        }

        await MarketService.fetchAndStoreMarketData();

        // 2. Define the category mapping
        const categoryMap = {
            "USDT-M": "Perpetual",
            "Spot": "Spot"
            // Add other mappings as needed
        };

        // 3. Build a complex $or query for MarketSnapshot
        const conditions = favorites.map(fav => {
            // Parse "BTC/USDT" -> "BTC"
            const baseSymbol = fav.symbol.split('/')[0];

            // Map "USDT-M" -> "Perpetual"
            const mappedCategory = categoryMap[fav.category] || fav.category;

            return {
                name: fav.broker,        // Match broker
                category: mappedCategory, // Match mapped category
                symbol: baseSymbol        // Match parsed symbol
            };
        });

        // 4. Find all matching market snapshots in a single query
        const marketData = await MarketSnapshot.find({ $or: conditions }).lean();

        // 5. (Optional but recommended) Combine the data in your application
        // Create a map for efficient lookup
        const marketDataMap = new Map();
        marketData.forEach(data => {
            const key = `${data.name}_${data.category}_${data.symbol}`;
            marketDataMap.set(key, data);
        });

        // Attach market data to each favorite
        const combinedResults = favorites.map(fav => {
            const baseSymbol = fav.symbol.split('/')[0];
            const mappedCategory = categoryMap[fav.category] || fav.category;
            const key = `${fav.broker}_${mappedCategory}_${baseSymbol}`;

            return {
                ...fav,
                marketData: marketDataMap.get(key) || null // Attach snapshot or null
            };
        });

        return res.status(200).json({ data: combinedResults, success: true });

    } catch (error) {
        logger.error('Error in favoriteSymbolsList (live):', error);
        console.error('Error in favoriteSymbolsList (live):', error);
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
        logger.error('Error in toggleFavoriteSymbol:', error);
        console.error('Error in toggleFavoriteSymbol:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

exports.toggle2FA = async (req, res) => {
    try {
        const userId = req.user.id;
        // `otp` is the code submitted by the user for verification
        const { otp } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        // --- SCENARIO 1: User is SUBMITTING an OTP to verify the change ---
        if (otp) {
            // Check if there's a pending OTP and if it has expired
            if (!user.otp || user.otpExpires < new Date()) {
                return res.status(400).json({ success: false, message: 'OTP is invalid or has expired. Please request a new one.' });
            }

            // Check if the submitted OTP matches the stored one
            if (user.otp !== otp) {
                return res.status(401).json({ success: false, message: 'Invalid OTP.' });
            }

            // --- Success! OTP is valid ---
            // Update the 2FA status and clear the OTP fields
            await User.findByIdAndUpdate(userId, {
                $set: { enable2FA: !user.enable2FA, otp: null, otpExpires: null }
            });

            const message = `2FA has been successfully ${!user.enable2FA ? 'enabled' : 'disabled'}.`;
            return res.json({ success: true, message, isEnabled: !user.enable2FA });
        }

        // --- SCENARIO 2: User is INITIATING the change, so we send an OTP ---
        else {

            // Send a new OTP
            await sendOtpAndHandleFailure(user);
            return res.json({
                success: true,
                message: 'An OTP has been sent to your email to confirm the change.'
            });
        }

    } catch (error) {
        console.error('Error in toggle2FA:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const updateUserInformation = async (userId, updateData) => {
    return UserInfo.findOneAndUpdate(
        {userId: userId},
        {$set: updateData},
        {new: true, upsert: true, runValidators: true}
    );
}

exports.usersList = async (req, res) => {
    try {
        const users = await User.find().select('email role status createdAt').lean({ virtuals: true })
            .populate({ path: 'info', select: 'firstName lastName avatar birthday' })
            .populate({ path: 'locationHistory', select: 'location source deviceInfo' });

        res.json({ success: true, data: users });
    } catch (error) {
        logger.error('Error getting users list');
        console.error('Error getting users list');
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

exports.userDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('email role status createdAt')
            .lean({ virtuals: true })
            .populate({ path: 'info', select: 'firstName lastName avatar birthday' })
            .populate({ path: 'locationHistory', select: 'location source deviceInfo' });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const userId = user._id
        // 1. Get Exchange Rate & Currency
        // We do this concurrently with snapshot fetch for performance if desired,
        // but sequential is fine for clarity.
        const { rate: exchangeRate, currency } = await financeService.getUserExchangeData(userId);

        // 2. Get Latest Snapshot & Total Balance
        const latestSnapshot = await AssetSnapshot.findOne({ userId })
            .sort({ timestamp: -1 })
            .lean();


        const totalBalance = latestSnapshot ? latestSnapshot.total : 0;

        // 3. Calculate Components via Service
        const fundBalance = financeService.calculateFundBalance(latestSnapshot);
        const portfolioBalance = await financeService.calculatePortfolioBalance(userId);

        // 4. Calculate Available Funds
        const availableFunds = totalBalance - fundBalance - portfolioBalance;

        const totalBotsCount = await BotBase.countDocuments({ userId: userId });
        const activeBotsCount = await BotBase.countDocuments({ userId: userId, active: true });

        res.json({
            success: true,
            data: {
                ...user,
                totalBots: totalBotsCount,
                activeBots: activeBotsCount,
                summary: {
                    currency: currency,
                    availableFunds: parseFloat((availableFunds * exchangeRate).toFixed(2)),
                    totalBalance: parseFloat((totalBalance * exchangeRate).toFixed(2)),
                }
            }
        });

    } catch (error) {
        logger.error('Error getting user details');
        console.error('Error getting user details');
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }

}

exports.changeUserRole = async (req, res) => {
    const user = await User.findById(req.user?.id).populate('info');
    if (!user) {
        return res.status(401).json({ message: 'User not found.', success: false });
    }

    try {
        await User.findByIdAndUpdate(req.user?.id, {
            $set: { role: req.body.role }
        });

        return res.json({message: 'User role changed successfully !', success: true})
    } catch (error) {
        logger.error('Error updating user role');
        console.error('Error updating user role');
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}
