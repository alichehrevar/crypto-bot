/**
 * @file Authorization middleware to protect routes based on user roles.
 */

/**
 * @description Middleware to verify a user's role. It checks if the authenticated
 * user's role is included in the list of allowed roles.
 * This middleware must be used AFTER the authentication middleware.
 * NOTE: Admin users are automatically granted access to any route protected by this middleware.
 * @param {string[]} allowedRoles - An array of roles that are allowed to access the route.
 * @returns {function} Express middleware function.
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;

        // If the user has the 'admin' role, grant access immediately.
        if (user && user.role === 'admin') {
            return next();
        }

        if (!user || !user.role) {
            return res.status(403).json({ success: false, error: 'Forbidden: User role is missing.' });
        }

        // Check if the user's role is in the list of allowed roles.
        if (allowedRoles.includes(user.role)) {
            next(); // User has the required role, proceed.
        } else {
            // User does not have the required role.
            res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to access this resource.' });
        }
    };
};

module.exports = authorize;

