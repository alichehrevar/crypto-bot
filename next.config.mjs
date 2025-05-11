const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for improved error handling
  compiler: {
    removeConsole: process.env.NODE_ENV !== "development",  // Remove console.log in production
  },
  env: {
    API_URL: process.env.API_URL,
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
