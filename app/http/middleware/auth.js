/**
 * @file Authentication middleware to protect routes using a stateful token model.
 * @author Your Name
 */

// We no longer need JWT. Instead, we need our database models.
const AuthToken = require('../../models/AuthToken');

/**
 * @description Middleware to verify a user's auth token. It checks for a token in the
 * 'Authorization' header, validates it against the database, and attaches the user
 * object and the token string to the request.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
module.exports = async function authenticate(req, res, next) { // The function must be async to use await

    // 1. Extract the token from the 'Authorization: Bearer <token>' header. This part is unchanged.
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // 2. Check if a token was provided. This part is unchanged.
    if (!token) {
        return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    try {
        // 3. Look up the token in the database and populate the associated user data.
        // This replaces `jwt.verify()`.
        const authToken = await AuthToken.findOne({ token }).populate('userId');

        // 4. Validate the token.
        // Check if the token exists, has not expired, and is linked to a valid user.
        if (!authToken || authToken.expiresAt < new Date() || !authToken.userId) {
            // If the token is invalid or expired, it's good practice to delete it from the DB.
            if (authToken) {
                await AuthToken.deleteOne({ _id: authToken._id });
            }
            return res.status(401).json({ success: false, error: 'Token is invalid or expired.' });
        }

        // 5. Attach the user object and token string to the request object.
        // `req.user` will now be the full user document from the database.
        req.user = authToken.userId;
        // We also attach the token itself so the logout controller can easily access it.
        req.token = token;

        // 6. Proceed to the next middleware or the protected route handler.
        next();

    } catch (error) {
        // Handle any unexpected errors (e.g., database connection issue).
        console.error("Authentication middleware error:", error);
        res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
    }
};
