import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: false, // Enable React strict mode for improved error handling
    compiler: {
        removeConsole: process.env.NODE_ENV !== "development",  // Remove console.log in production
    },
    env: {
        API_URL: process.env.API_URL,
        CDN_URL: process.env.CDN_URL,
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
};

export default nextConfig;
