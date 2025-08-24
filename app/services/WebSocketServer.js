// app/services/WebSocketServer.js

const WebSocket = require('ws');

class WSServer {
    constructor() {
        // This will hold the WebSocket server instance.
        this.wss = null;
    }

    /**
     * Initializes the WebSocket server.
     * We’re using the "noServer" option because we will bind the upgrade handling
     * to an existing HTTP server in our main server.js file.
     */
    init() {
        this.wss = new WebSocket.Server({ noServer: true });
        console.log('WebSocket server initialized');

        // Log when clients connect and disconnect.
        this.wss.on('connection', (ws, request) => {
            const clientAddr = request.socket.remoteAddress;
            console.log(`New client connected from ${clientAddr}`);

            ws.on('close', () => {
                console.log(`Client from ${clientAddr} disconnected`);
            });
        });
    }

    /**
     * Handles HTTP upgrade validators to WebSocket connections.
     * This method is called from the HTTP server's 'upgrade' event.
     *
     * @param {object} request - The HTTP upgrade request.
     * @param {object} socket - The underlying network socket.
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
     * Broadcasts a candle update message to all connected WebSocket clients.
     *
     * @param {object} candle - The candle data to send.
     */
    broadcastCandle(candle) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            return;
        }
        const message = {
            type: 'candle_update',
            data: candle,
        };
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    /**
     * Broadcasts a bot update message to all connected WebSocket clients.
     *
     * @param {object} bot - The bot data to send.
     */
    broadcastBotUpdate(bot) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            return;
        }
        const message = {
            type: 'bot_update',
            data: bot,
        };
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = new WSServer();
