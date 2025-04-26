// logs/logsWSServer.js
const WebSocket = require('ws');
const { logEmitter } = require('./logEmitter');

// create a no‐server WS.Server
const logsWSServer = new WebSocket.Server({ noServer: true });

logsWSServer.on('connection', socket => {
    const listener = msg => {
        socket.send(JSON.stringify({
            timestamp: new Date().toISOString(),
            message: msg
        }));
    };
    logEmitter.on('log', listener);
    socket.on('close', () => logEmitter.removeListener('log', listener));
});

module.exports = logsWSServer;
