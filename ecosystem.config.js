module.exports = {
    apps : [{
        name   : "tradingx-backend",
        script : "./server.js",
        instances : "max",
        exec_mode : "cluster",
    }]
}
