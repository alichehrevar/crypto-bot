const WebSocket = require('ws');

class WSServer {
    constructor() {
        this.wss = null;
    }

    /**
     * Initializes the WebSocket server without binding directly to an HTTP server.
     */
    init() {
        this.wss = new WebSocket.Server({ noServer: true });
        console.log('WebSocket server initialized');

        // Log when a client connects and disconnects.
        this.wss.on('connection', (ws, request) => {
            const clientAddr = request.socket.remoteAddress;
            console.log(`New client connected from ${clientAddr}`);

            ws.on('close', () => {
                console.log(`Client from ${clientAddr} disconnected`);
            });
        });
    }

    /**
     * Handles HTTP upgrade requests to upgrade to WebSocket connections.
     *
     * @param {object} request - The HTTP request.
     * @param {object} socket - The network socket between client and server.
     * @param {Buffer} head - The first packet of the upgraded stream.
     */
    handleUpgrade(request, socket, head) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            socket.destroy();
            return;
        }
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }

    /**
     * Broadcasts a candle update to all connected clients.
     *
     * @param {object} candle - The candle data to broadcast.
     */
    broadcastCandle(candle) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            return;
        }
        const message = {
            type: 'candle_update',
            data: candle
        };
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    /**
     * Broadcasts a bot update to all connected clients.
     *
     * @param {object} bot - The bot data to broadcast.
     */
    broadcastBotUpdate(bot) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            return;
        }
        const message = {
            type: 'bot_update',
            data: bot
        };
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = new WSServer();
