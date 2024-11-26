/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    appDir: true,
  },
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
};

export default nextConfig;
