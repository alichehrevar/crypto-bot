// routes/index.js
const express = require('express');
const router = express.Router();

// Import all individual route files
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

// Mount each router on its designated path
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/candles', candleRoutes);
router.use('/bots', botRoutes);
router.use('/backtest', backtestRoutes);
router.use('/visualize', visualizationRoutes);
router.use('/currencies', currencyRoutes);
router.use('/indicators', indicatorsRoutes);
router.use('/market', marketRoutes);
router.use('/pnl', pnlRoutes);
router.use('/orders', ordersRouter);
router.use('/asset', ordersRouter); // Note: Both /asset and /orders point to the same router
router.use('/coins', coinRoutes);
router.use('/user', userRoutes);
router.use('/logs', logsRouter);

module.exports = router;
