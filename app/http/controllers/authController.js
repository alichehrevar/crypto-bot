const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const UserInfo = require('../../models/UserInfo');
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

exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({error: 'Email and password are required.'});
        }

        // 1) Normalize
        const normalized = email.trim().toLowerCase();

        // 2) Try exact lowercase lookup
        let user = await User.findOne({email: normalized});

        // 3) If not found, try case-insensitive regex lookup
        if (!user) {
            console.warn(`No exact match for "${normalized}", trying case-insensitive…`);
            user = await User.findOne({
                email: {$regex: `^${normalized}$`, $options: 'i'}
            });
        }

        // 4) If still not found, bail
        if (!user) {
            console.warn(`Login failed: no user for "${normalized}"`);
            return res.status(401).json({error: 'Invalid email or password.'});
        }

        // 5) Compare password
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            console.warn(`Login failed: wrong password for "${normalized}"`);
            return res.status(401).json({error: 'Invalid email or password.'});
        }

        // 6) Good! Issue token
        const token = jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET,
            {expiresIn: '1y'}
        );
        return res.json({token});
    } catch (err) {
        console.error('Error in login:', err);
        logger.error(`getAssetsDistribution error: ${err.message}`, {stack: err.stack});
        return res.status(500).json({error: 'Internal server error.'});
    }
};

exports.register = async (req, res) => {
    try {
        // Extract email and password from the request body.
        const {
            email,
            password,
            firstName,
            lastName,
            gender,
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
            gender: gender,
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

        // Registered successfully, create a JWT.
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '1y'});
        // Return the token to the client.
        res.json({success: true, token});
    } catch (error) {
        logger.error(`getAssetsDistribution error: ${error.message}`, {stack: error.stack});
        res.status(500).json({success: false, error: error.message});
    }
}
