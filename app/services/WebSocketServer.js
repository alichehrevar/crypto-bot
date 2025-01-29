const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.subscriptions = new Map();

        this.wss.on('connection', (ws, req) => {
            ws.on('message', message => this.handleMessage(ws, message));
            this.authenticate(ws, req);
        });
    }

    authenticate(ws, req) {
        try {
            const token = req.url.split('token=')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            ws.userId = decoded.id;
        } catch (error) {
            ws.close(4001, 'Unauthorized');
        }
    }

    handleMessage(ws, message) {
        try {
            const { type, channel, payload } = JSON.parse(message);
            switch(type) {
                case 'subscribe':
                    this.subscribe(ws, channel, payload);
                    break;
                case 'unsubscribe':
                    this.unsubscribe(ws, channel);
                    break;
            }
        } catch (error) {
            console.error('WS message error:', error);
        }
    }

    subscribe(ws, channel, payload) {
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }
        this.subscriptions.get(channel).add(ws);
    }

    broadcast(channel, data) {
        if (this.subscriptions.has(channel)) {
            this.subscriptions.get(channel).forEach(ws => {
                ws.send(JSON.stringify({ channel, data }));
            });
        }
    }
}

module.exports = WebSocketServer;
