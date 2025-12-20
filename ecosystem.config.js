module.exports = {
    apps: [
        {
            name: 'profile',
            exec_mode: 'cluster',
            instances: 'max',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            port: 3007,
        }
    ]
}
