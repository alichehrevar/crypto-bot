require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const binanceWS = require('./app/services/binanceWS');
const botService = require('./app/services/BotService');
const candleRoutes = require('./routes/candles');
const botRoutes = require('./routes/bots');

// Initialize Express application
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
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
app.use('/api/candles', candleRoutes);
app.use('/api/bots', botRoutes);

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

// Server Configuration
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = server;
