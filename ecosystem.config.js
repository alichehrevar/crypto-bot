module.exports = {
    apps: [
        {
            name: 'tradingx-front',
            exec_mode: 'cluster',
            instances: 'max',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            port: 3007,
        }
    ]
}
