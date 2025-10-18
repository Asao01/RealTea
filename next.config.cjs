/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimize production build
  productionBrowserSourceMaps: false,
  
  // Image optimization
  images: {
    domains: [
      'images.unsplash.com',
      'source.unsplash.com',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
      'realitea.org',
      'www.realitea.org',
      'realtea-timeline.vercel.app',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'realitea.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.realitea.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Experimental features
  experimental: {
    instrumentationHook: true,
  },
  
  // Environment variables (server-side secrets)
  env: {
    NEXT_PUBLIC_APP_NAME: 'RealTea',
    NEXT_PUBLIC_APP_DESCRIPTION: 'Reality Deserves Receipts - A Dynamic Timeline of World Events',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEWS_API_KEY: process.env.NEWS_API_KEY,
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Ignore source maps in production
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
