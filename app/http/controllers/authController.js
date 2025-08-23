const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/User');
const UserInfo = require('../../models/UserInfo');
const AuthToken = require('../../models/AuthToken');
const logger = require("../../../logs/logger");

exports.checkEmailExistence = async (req, res) => {
    try {
        const {email} = req.body;
        if (!email) {
            return res.status(400).json({success: false, error: 'Email is required.'});
        }
        const user = await User.findOne({email});
        if (user) {
            return res.json({success: true, exists: true});
        } else {
            return res.json({success: true, exists: false});
        }
    } catch (error) {
        logger.error(`getAssetsDistribution error: ${error.message}`, {stack: error.stack});
        res.status(500).json({success: false, error: error.message});
    }
}

/**
 * @description Handles user login. Verifies credentials and creates a new, stateful auth token.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        // 1. Generate a secure, random token string.
        const tokenString = crypto.randomBytes(40).toString('hex');

        // 2. Set an expiration date (e.g., 30 days from now).
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // 3. Create the token record in the database.
        await AuthToken.create({
            token: tokenString,
            userId: user._id,
            expiresAt,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
        });

        // 4. Return the new token string to the client.
        return res.json({ success: true, token: tokenString });

    } catch (err) {
        console.error('Error in login:', err);
        logger.error(`Login error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
};

/**
 * @description Handles new user registration. Creates User and UserInfo, then creates a new auth token.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.register = async (req, res) => {
    try {
        // Extract email and password from the request body.
        const {
            email,
            password,
            firstName,
            lastName,
            phoneCountry,
            phoneNumber,
            birthday,
            otp,
        } = req.body;

        // check OTP
        if (otp !== "1234") {
            return res.status(401).json({status: false, error: 'OTP is invalid !'});
        }

        // Look up the user by email.
        let user = await User.findOne({email});
        if (user) {
            // If user exists send warning
            return res.status(401).json({error: 'You registered before. Please use login'});
        }

        // Create user
        user = await User.create({
            email: email,
            password: password
        });
        // Create user info
        await UserInfo.create({
            userId: user._id,
            firstName: firstName,
            lastName: lastName,
            phoneCountry: phoneCountry,
            phoneNumber: phoneNumber,
            birthday: birthday
        })
            .catch(async (userInfoError) => {
                logger.error(`UserInfo creation error: ${userInfoError.message}`, {stack: userInfoError.stack});
                // If UserInfo creation fails, delete the User record to prevent orphaned users
                await User.deleteOne({_id: user._id});
                return res.status(500).json({success: false, error: 'Failed to create user !'});
            });

        // --- NEW TOKEN LOGIC (after user is successfully created) ---
        const tokenString = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await AuthToken.create({
            token: tokenString,
            userId: user._id, // 'user' is the newly created user document
            expiresAt,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
        });

        // Return the token to the client to log them in immediately.
        res.json({ success: true, token: tokenString });
    } catch (error) {
        logger.error(`getAssetsDistribution error: ${error.message}`, {stack: error.stack});
        res.status(500).json({success: false, error: error.message});
    }
}

/**
 * @description Handles user logout by deleting the auth token from the database.
 * @param {object} req - Express request object. Expects `req.user` and `req.token` from auth middleware.
 * @param {object} res - Express response object.
 */
exports.logout = async (req, res) => {
    try {
        // The auth token is attached to the request by our new middleware (see Step 4).
        const token = req.token;
        if (token) {
            // Find and delete the token document. This immediately invalidates the session.
            await AuthToken.deleteOne({ token });
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
        logger.error(`Logout error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ success: false, error: 'Internal server error during logout.' });
    }
};
