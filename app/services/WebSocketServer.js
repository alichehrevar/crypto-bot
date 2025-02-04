const WebSocket = require('ws');

class WSServer {
    constructor() {
        this.wss = null;
    }

    init() {
        // Create the WSS instance without binding it to the HTTP server directly.
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
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(candle));
            }
        });
    }
}

module.exports = new WSServer();
