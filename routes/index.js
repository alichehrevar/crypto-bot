const express = require('express');
const router = express.Router();
const { adminOnlyAccess, clientAccess, protectedRoutes } = require('./route-protector');

// --- Import all individual route files ---
const authRoutes = require('./auth');
const accountRoutes = require('./accounts');
const candleRoutes = require('./candles');
const botRoutes = require('./bots');
const backtestRoutes = require('./backtest');
const visualizationRoutes = require('./visualization');
const currencyRoutes = require('./currencies');
const indicatorsRoutes = require('./indicators');
const logsRouter = require('./logs');
const marketRoutes = require('./market');
const pnlRoutes = require('./pnl');
const ordersRouter = require("./orders");
const coinRoutes = require('./coin');
const userRoutes = require('./user');
const sentimentRoutes = require('./market/sentiment');
const anomalyRoutes = require('./market/anomalies');
const sectorRoutes = require('./market/sectors');
const netFlowsRoutes = require('./market/netFlows');
const listingsRoutes = require('./listings');

// --- Route Definitions ---
const routes = {
    '/auth': authRoutes,
    '/accounts': accountRoutes,
    '/candles': candleRoutes,
    '/bots': botRoutes,
    '/backtest': backtestRoutes,
    '/visualize': visualizationRoutes,
    '/currencies': currencyRoutes,
    '/indicators': indicatorsRoutes,
    '/market': marketRoutes,
    '/pnl': pnlRoutes,
    '/orders': ordersRouter,
    '/asset': ordersRouter,
    '/coins': coinRoutes,
    '/user': userRoutes,
    '/logs': logsRouter,
    '/sentiment': sentimentRoutes,
    '/anomalies': anomalyRoutes,
    '/sectors': sectorRoutes,
    '/market/net-flows': netFlowsRoutes,
    '/listings': listingsRoutes,
};

// --- Mount Routers with Middleware ---
for (const path in routes) {
    const routeKey = path.substring(1); // remove leading slash
    if (protectedRoutes.adminOnly.includes(routeKey)) {
        router.use(path, ...adminOnlyAccess, routes[path]);
    } else if (protectedRoutes.client.includes(routeKey)) {
        router.use(path, ...clientAccess, routes[path]);
    } else {
        // Public routes or routes not explicitly protected
        router.use(path, routes[path]);
    }
}

module.exports = router;

