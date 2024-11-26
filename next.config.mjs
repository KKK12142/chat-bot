/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === "production" ? "/chat-bot" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/chat-bot/" : "",
};

module.exports = nextConfig;