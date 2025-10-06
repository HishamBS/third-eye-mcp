/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security
  poweredByHeader: false,

  // Production build settings
  output: 'standalone',

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.anthropic.com',
      },
      {
        protocol: 'https',
        hostname: 'cursor.sh',
      },
      {
        protocol: 'https',
        hostname: 'www.warp.dev',
      },
      {
        protocol: 'https',
        hostname: 'zed.dev',
      },
      {
        protocol: 'https',
        hostname: 'continue.dev',
      },
      {
        protocol: 'https',
        hostname: 'cdn.oaistatic.com',
      },
    ],
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // API routes proxy for local server communication
  async rewrites() {
    const apiPort = process.env.NEXT_PUBLIC_API_PORT || process.env.API_PORT || '7070';
    const apiHost = process.env.NEXT_PUBLIC_API_HOST || process.env.API_HOST || '127.0.0.1';

    return [
      {
        source: '/api/:path*',
        destination: `http://${apiHost}:${apiPort}/:path*`,
      },
    ];
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;