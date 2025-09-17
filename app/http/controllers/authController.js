const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../../services/emailService');
const User = require('../../models/User');
const Settings = require('../../models/Settings');
const UserInfo = require('../../models/UserInfo');
const AuthToken = require('../../models/AuthToken');
const { validate } = require('deep-email-validator');
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

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Email not exists. Please register first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials..' });
        }

        if (user.verifiedAt === null || user.enable2FA === true) {
            const sendEmail = await sendOtpAndHandleFailure(user);
            if (sendEmail.success === false) {
                return res.status(401).json({success: false, error: sendEmail.message});
            }

            return res.status(201).json({ data: {
                    message: 'Please check your email for the OTP.',
                    verified: false
                },
                success: true
            });
        }

        const tokenString = await generateToken(user, req);

        // 4. Return the new token string to the client.
        return res.json({ success: true, data: { token: tokenString } });

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
        } = req.body;

        // Look up the user by email.
        let user = await User.findOne({email});
        if (user) {
            // If user exists send warning
            return res.status(401).json({error: 'You registered before. Please use login'});
        }

        // Validate the email
        // const validationResult = await validate(email);
        // if (!validationResult.valid) {
        //     return res.status(400).send({
        //         status: false,
        //         message: 'Email is not valid. Please try again!',
        //         reason: validationResult.reason
        //     });
        // }

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

        const sendEmail = await sendOtpAndHandleFailure(user);
        if (sendEmail.success === false) {
            return res.status(401).json({success: false, error: sendEmail.message});
        }

        return res.status(201).json({ message: 'Registration successful! Please check your email for the OTP.', success: true });
    } catch (error) {
        logger.error(`getAssetsDistribution error: ${error.message}`, {stack: error.stack});
        res.status(500).json({success: false, error: error.message});
    }
}

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
        }

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Email not exists. Please register first.' });
        }

        if (user.otpExpires < new Date()) {
            return res.status(401).json({ success: false, error: 'OTP has expired. Please request a new OTP.' });
        }

        if (user.otp !== otp) {
            return res.status(401).json({ success: false, error: 'Invalid OTP.' });
        }


        // remove otp and otpExpires from the user model
        await User.updateOne(
            { _id: user._id },
            {
                verifiedAt: new Date(),
                otp: null,
                otpExpires: null
            }
        )

        const tokenString = await generateToken(user, req);

        // Return the token to the client to log them in immediately.
        res.json({ success: true, data: { token: tokenString } });

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

async function sendOtpAndHandleFailure(user) {

    Settings.findOne()
        .then(settings => {
            if (!settings.enableEmail) {
                return { message: 'Email Service is not enabled.', success: false };
            }
        });


    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if the OTP has expired
    if (!user.enable2FA && user.otpExpires !== null && user.otpExpires < new Date()) {
        const remainingTime = (user.otpExpires.getTime() - new Date().getTime()) / (1000 * 60);
        if (remainingTime < 0) {
            return { message: 'Please retry after 10 minutes.', success: false };
        }
    }

    // Send the OTP email
    const emailSent = await emailService.sendOtpEmail(user.email, otp);

    if (!emailSent) {
        // This is an internal server error, as the email should have sent.
        // You might want to log this failure more robustly.
        logger.error(`Failed to send otp email, email: ${user.email}`, {stack: 'Otp email failed to send'});
        return { message: 'Failed to send OTP email.', success: false };
    }

    // If OTP sent successfully, save the OTP and its expiry to the user model
    await User.updateOne(
        { _id: user._id },
        {
            otp: otp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
    )

    return { message: 'Otp Sent', success: true };
}

async function generateToken(user, req){
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

    return tokenString;
}
