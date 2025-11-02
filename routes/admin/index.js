// /routes/admin/index.js
const express = require('express');
const adminRouter = express.Router();
const { adminOnlyAccess } = require('../route-protector');

// Apply admin guard to ALL /admin/* routes
adminRouter.use(...adminOnlyAccess);

// ---- Admin subroutes ----
const botsRoutes = require('./bots')
const usersRoutes = require('./users')
const logsRouter = require('./logs');

// ---- Mount them ----
adminRouter.use('/bots', botsRoutes);
adminRouter.use('/users', usersRoutes);
adminRouter.use('/logs', logsRouter);

module.exports = adminRouter;
