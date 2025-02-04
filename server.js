require('dotenv').config();
const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const wss = new WebSocket.Server({ noServer: true });

const binanceWS = require('./app/services/binanceWS');
const botService = require('./app/services/BotService');
const WebSocketServer = require('./app/services/WebSocketServer');

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
    // Start WebSocket connection after DB connection
    binanceWS.connect();
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
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Server Configuration
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

WebSocketServer.init();

server.on('upgrade', (request, socket, head) => {
    if (request.url === '/api/ws') {
        WebSocketServer.handleUpgrade(request, socket, head);
    } else {
        // For any other upgrade requests, destroy the socket
        socket.destroy();
    }
});

// server.on('upgrade', (request, socket, head) => {
//     wss.handleUpgrade(request, socket, head, (ws) => {
//         wss.emit('connection', ws, request);
//     });
// });

module.exports = {
    server,
    broadcastCandle: (candle) => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(candle));
            }
        });
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = server;
