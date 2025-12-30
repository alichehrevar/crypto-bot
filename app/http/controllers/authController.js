const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/User');
const UserInfo = require('../../models/UserInfo');
const AuthToken = require('../../models/AuthToken');
const logger = require("../../../logs/logger");
const { sendOtpAndHandleFailure } = require('../../services/user/otpService');
const LocationService = require('../../services/user/userLocationService');
const requestIp = require('request-ip');

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

        // 1. Basic Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Email not exists. Please register first.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }

        // 2. Check 2FA or Verification *BEFORE* generating the main auth token
        // (Moved this UP so it actually runs)
        if (user.verifiedAt === null || user.enable2FA === true) {
            const sendEmail = await sendOtpAndHandleFailure(user);

            if (sendEmail.success === false) {
                return res.status(401).json({ success: false, error: sendEmail.message });
            }

            // Return early indicating OTP is required
            return res.status(201).json({
                success: true,
                data: {
                    message: 'Please check your email for the OTP.',
                    verified: false,
                    // potentially send a temp token here if your 2FA flow requires it
                }
            });
        }

        // 3. Log Location (Only if login is successful/proceeding)
        const clientIp = requestIp.getClientIp(req);
        await LocationService.log(
            user._id,
            req.body.lat,
            req.body.lng,
            clientIp,
            'login',
            {
                city: req.body.device_city,
                country: req.body.device_country,
                userAgent: req.headers['user-agent']
            }
        );

        // 4. Generate Token
        const tokenString = await generateToken(user, req);

        // 5. Return Token AND User Details
        // This solves the NextAuth "User id is missing" issue
        return res.json({
            success: true,
            data: {
                token: tokenString,
                user: {
                    email: user.email,
                }
            }
        });

    } catch (err) {
        console.error('Error in login:', err);
        // Ensure logger exists in this scope or import it
        if (typeof logger !== 'undefined') {
            logger.error(`Login error: ${err.message}`, { stack: err.stack });
        }
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
        role: user.role,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
    });

    return tokenString;
}
