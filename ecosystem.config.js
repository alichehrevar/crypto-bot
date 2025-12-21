module.exports = {
    apps: [
        {
            name: 'template',
            exec_mode: 'cluster',
            instances: 'max',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            port: 3008,
        }
    ]
}
