const WebSocket = require('ws');

class WSServer {
    constructor() {
        this.wss = null;
    }

    init() {
        // Create the WebSocket server instance without binding it directly to an HTTP server.
        this.wss = new WebSocket.Server({ noServer: true });
        console.log('WebSocket server initialized');
    }

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

    broadcastCandle(candle) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            return;
        }
        // Wrap the candle data in an object with a type identifier.
        const message = {
            type: 'candle_update',
            data: candle
        };
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    broadcastBotUpdate(bot) {
        if (!this.wss) {
            console.error('WebSocket server not initialized');
            return;
        }
        // Wrap the bot data in an object with a type identifier.
        const message = {
            type: 'bot_update',
            data: bot
        };
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = new WSServer();
