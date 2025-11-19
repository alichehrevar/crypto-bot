const express = require('express');
const router = express.Router();
const { adminOnlyAccess, clientAccess, protectedRoutes } = require('./route-protector');

// --- Import all individual route files ---
const authRoutes = require('./auth');
const accountRoutes = require('./accounts');
const candleRoutes = require('./candles');
const botRoutes = require('./bots/bots');
const dcaRoutes = require('./bots/dca');
const backtestRoutes = require('./backtest');
const visualizationRoutes = require('./visualization');
const currencyRoutes = require('./currencies');
const indicatorsRoutes = require('./indicators');
const marketRoutes = require('./market');
const pnlRoutes = require('./pnl');
const ordersRouter = require("./orders");
const assetSnapshotRouter = require("./assetSnapshot");
const coinRoutes = require('./coin');
const userRoutes = require('./user');
const sentimentRoutes = require('./market/sentiment');
const anomalyRoutes = require('./market/anomalies');
const sectorRoutes = require('./market/sectors');
const netFlowsRoutes = require('./market/netFlows');
const listingsRoutes = require('./listings');
const SessionRoutes = require('./session');
const n8nRoutes = require('./n8n/index');
const preLaunchRoutes = require('./pre-launch/index');

const adminRoutes = require('./admin/index')

/***************** Client Routes *****************/
const routes = {
    '/auth': authRoutes,
    '/accounts': accountRoutes,
    '/candles': candleRoutes,
    '/bots': botRoutes,
    '/bots/dca': dcaRoutes,
    '/backtest': backtestRoutes,
    '/visualize': visualizationRoutes,
    '/currencies': currencyRoutes,
    '/indicators': indicatorsRoutes,
    '/market': marketRoutes,
    '/pnl': pnlRoutes,
    '/orders': ordersRouter,
    '/asset': assetSnapshotRouter,
    '/coins': coinRoutes,
    '/user': userRoutes,
    '/sentiment': sentimentRoutes,
    '/anomalies': anomalyRoutes,
    '/sectors': sectorRoutes,
    '/market/net-flows': netFlowsRoutes,
    '/listings': listingsRoutes,
    '/session': SessionRoutes,
    '/ai': n8nRoutes,
    '/leaderboard': preLaunchRoutes,
};

// --- Mount Routers with Middleware ---
for (const path in routes) {
    const routeKey = path.substring(1); // remove the leading slash
    if (protectedRoutes.client.includes(routeKey)) {
        router.use(path, ...clientAccess, routes[path]);
    } else if (protectedRoutes.adminOnly.includes(routeKey)) {
        router.use(path, ...adminOnlyAccess, routes[path]);
    } else {
        router.use(path, routes[path]); // public
    }
}

// Mount the admin namespace
router.use('/admin', adminRoutes);

module.exports = router;

