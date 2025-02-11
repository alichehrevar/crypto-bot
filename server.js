require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Required for DB status checks
const http = require('http');

const connectDB = require('./config/db');
const binanceWS = require('./app/services/binanceWS');
const tradingViewWS = require('./app/services/TradingViewWS');
const bingXWS = require('./app/services/bingXWS');
const botService = require('./app/services/BotService');
const wsServer = require('./app/services/WebSocketServer');

const authRoutes = require('./routes/auth');
const candleRoutes = require('./routes/candles');
const botRoutes = require('./routes/bots');
const backtestRoutes = require('./routes/backtest');
const visualizationRoutes = require('./routes/visualization');
const currencyRoutes = require('./routes/currencies');

// Initialize Express application
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

// Database Connection
connectDB().then(() => {
    // Start WebSocket connections after DB is connected
    binanceWS.connect();
    bingXWS.connect();
    botService.initialize();
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date(),
        dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/candles', candleRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/visualize', visualizationRoutes);
app.use('/api/currencies', currencyRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res && typeof res.status === 'function') {
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'production'
                ? 'Internal Server Error'
                : err.message
        });
    } else {
        if (res && typeof res.send === 'function') {
            res.send('An unexpected error occurred');
        } else {
            console.error('Response object is broken or missing.');
            res.end('An unexpected error occurred');
        }
    }
});

// Test Endpoint for Debugging
app.get('/test', (req, res) => {
    res.status(200).json({ message: 'Everything is working fine' });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize the general WebSocket server.
wsServer.init();

// Handle WebSocket upgrade requests in one place.
server.on('upgrade', (request, socket, head) => {
    if (request.url) {
        if (request.url.startsWith('/api/ws')) {
            // Use your general WebSocket service.
            wsServer.handleUpgrade(request, socket, head);
        } else if (request.url.startsWith('/api/tradingview/ws')) {
            // Use TradingViewWS's handleUpgrade.
            tradingViewWS.handleUpgrade(request, socket, head);
        } else {
            // For unrecognized upgrade paths, destroy the socket.
            socket.destroy();
        }
    } else {
        socket.destroy();
    }
});

// Start the TradingViewWS server if needed, but do not attach an additional upgrade handler.
// tradingViewWS.startServer(server); // Remove or comment out this line if present.

// Start the HTTP server.
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections.
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = server;
