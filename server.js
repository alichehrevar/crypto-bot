// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer } = require('ws');
const { startScheduledJobs } = require('./cron');

const connectDB = require('./config/db');
const binanceWS = require('./app/services/binanceWS');
const tradingViewWS = require('./app/services/TradingViewWS');
const bingXWS = require('./app/services/bingXWS');
const botService = require('./app/services/botService/BotService');
const botManagerService = require('./app/services/botService/BotManagerService');
const wsServer = require('./app/services/WebSocketServer');
const syncImportedJobs = require('./app/services/dbSyncService');
const { seedSettings } = require('./db/seeds/settingsSeeder');
const { seedAdminUser } = require('./db/seeds/adminUserSeeder');
const seedSymbols = require('./db/seeds/currencySeeder');
const {fixAlgoTraderProfileIndex} = require('./db/updates/fixAlgoTraderProfileIndex');
// const { seedN8nData } = require('./db/seeds/n8nJobResponseSeeder');
const { logEmitter, originalConsoleLog } = require('./logs/logEmitter');

// Routers
const apiRoutes = require('./routes/index');

const app = express();

// JSON & CSP
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; media-src *; script-src 'self';"
    );
    next();
});

// access to public folder
app.use(express.static('public'));

// CORS
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3005',
    'http://localhost:3007',
    'http://localhost:8000',
    'https://tradingx.alichv.com',
    'https://tradingx-template.alichv.com',
    'https://tradingx-backend.alichv.com',
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Accept']
}));

// Connect to Mongo
connectDB().then(async () => {

    await fixAlgoTraderProfileIndex();

    // seed admin user
    await seedAdminUser();
    await seedSettings();
    // await seedN8nData();

    // Start WS services
    binanceWS.connect();

    // BingX auth‐aware connect
    const BingxAccount = require('./app/models/BingxAccount');
    BingxAccount.findOne()
        .then(acc => {
            if (acc) {
                console.log('[Server] Found BingX credentials');
                bingXWS.connect(acc);
                // bingXWS.connectCoinMPrivate({ apiKey: acc.apiKey, secretKey: acc.secretKey });
            } else {
                console.warn('[Server] No BingX account – connecting unauthenticated');
                bingXWS.connect();
            }
        })
        .catch(err => {
            console.error('[Server] BingX lookup error:', err);
            bingXWS.connect();
        });

    // Seed symbols collection
    try {
        await seedSymbols();
    } catch (err) {
        console.error('Currency seeding failed:', err);
    }

    // Initialize bots
    await botService.initialize();
    // Initialize grid bot manager
    await botManagerService.initialize();

    // Initialize and start all scheduled jobs
    await startScheduledJobs();
});

mongoose.connection.once('open', () => {
    // Start the listener
    syncImportedJobs();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// API routes
app.use('/api', apiRoutes);


// Error handler
app.use((err, req, res, _) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});

// 404 catcher
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Create HTTP server
const server = http.createServer(app);

// Init general WS server
wsServer.init();

// —— Logs WebSocket (plain‐ws) ——
const logsWSS = new WebSocketServer({ noServer: true });
logsWSS.on('connection', (ws, req) => {
    originalConsoleLog('Logs WS client connected:', req.socket.remoteAddress);
    ws.on('close', () => {
        originalConsoleLog('Logs WS client disconnected');
    });
});

// Emit logs to WS clients
logEmitter.on('log', (msg) => {
    const payload = JSON.stringify({ timestamp: new Date().toISOString(), message: msg });
    for (const client of logsWSS.clients) {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
});

// Unified upgrade handler
server.on('upgrade', (request, socket, head) => {
    const { url } = request;
    if (!url) {
        socket.destroy();
        return;
    }

    if (url.startsWith('/api/ws')) {
        wsServer.handleUpgrade(request, socket, head, (ws) => {
            wsServer.emit('connection', ws, request);
        });

    } else if (url.startsWith('/api/tradingview/ws')) {
        tradingViewWS.handleUpgrade(request, socket, head, (ws) => {
            tradingViewWS.emit('connection', ws, request);
        });

    } else if (url === '/logs/ws') {
        logsWSS.handleUpgrade(request, socket, head, (ws) => {
            logsWSS.emit('connection', ws, request);
        });

    } else {
        socket.destroy();
    }
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV||'development'} on port ${PORT}`);
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = server;
