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
    // Start WebSocket connection after DB is connected
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
        // Ensure the response object has send method before using it
        if (res && typeof res.send === 'function') {
            res.send('An unexpected error occurred');
        } else {
            // Handle edge case when res is not available or broken
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

// Initialize the WebSocket server
wsServer.init();  // Initialize WebSocket server

// Start the WebSocket server on top of the same HTTP server
server.on('upgrade', (request, socket, head) => {
    // Handle the WebSocket upgrade request
    wsServer.handleUpgrade(request, socket, head);
});

// Start the TradingViewWS server on top of the same HTTP server
tradingViewWS.startServer(server);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = server;
