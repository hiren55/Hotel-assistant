/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hotel-assistant/shared'],
  images: {
    domains: ['localhost'],
    remotePatterns: [
      // Add your S3/R2 storage domain here when configured
      // Example for Cloudflare R2:
      // {
      //   protocol: 'https',
      //   hostname: '**.r2.cloudflarestorage.com',
      // },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
