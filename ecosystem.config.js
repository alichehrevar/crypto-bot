module.exports = {
    apps: [
        {
            name: 'admin',
            exec_mode: 'cluster',
            instances: 'max',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            port: 3006,
            env: {
                AUTH_URL: "https://united-algos-admin.alichv.com",
                AUTH_TRUST_HOST: "true",
                AUTH_SECRET: "19287489274091edj1ioyf9rfydfcf"
            }
        }
    ]
}
