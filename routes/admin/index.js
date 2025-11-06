// /routes/admin/index.js
const express = require('express');
const adminRouter = express.Router();
const { adminOnlyAccess } = require('../route-protector');

// Apply admin guard to ALL /admin/* routes
adminRouter.use(...adminOnlyAccess);

// ---- Admin subroutes ----
const dashboardRoutes = require('./dashboard')
const botsRoutes = require('./bots')
const usersRoutes = require('./users')
const n8nRoutes = require('./n8n');

// ---- Mount them ----
adminRouter.use('/dashboard', dashboardRoutes);
adminRouter.use('/bots', botsRoutes);
adminRouter.use('/users', usersRoutes);
adminRouter.use('/users', usersRoutes);
adminRouter.use('/n8n', n8nRoutes);

module.exports = adminRouter;
