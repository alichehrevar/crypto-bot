const nextConfig = {
    reactStrictMode: false, // Enable React strict mode for improved error handling
    compiler: {
        removeConsole: process.env.NODE_ENV !== "development",  // Remove console.log in production
    },
    env: {
        API_URL: process.env.API_URL,
        CDN_URL: process.env.CDN_URL,
        PUBLIC_URL: process.env.PUBLIC_URL,
        NAME: process.env.NAME,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
        unoptimized: true,
    },
}

export default nextConfig;
