const authenticate = require('../app/http/middleware/auth');
const authorize = require('../app/http/middleware/authorize');

// Middleware for routes that ONLY admins should access.
const adminOnlyAccess = [authenticate, authorize(['admin'])];

// Middleware for routes clients can access. Admins automatically get access.
const clientAccess = [authenticate, authorize(['client'])];

// Define which routes have specific access levels.
// Any route not listed here is considered public.
const protectedRoutes = {
    // Routes only accessible by admin users.
    adminOnly: [
        'logs',
    ],
    // Routes accessible by clients (and automatically by admins).
    client: [
        'accounts',
        'candles',
        'bots',
        'backtest',
        'visualize',
        'pnl',
        'orders',
        'asset',
        'user',
        'anomalies',
        'sectors',
        'market/net-flows'
    ]
};

module.exports = {
    adminOnlyAccess,
    clientAccess,
    protectedRoutes
};

