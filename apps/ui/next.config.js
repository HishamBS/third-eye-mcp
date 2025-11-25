import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-discover ALL @third-eye/* workspace packages for transpilation
// This prevents "Module not found" errors when packages import each other
function getWorkspacePackages() {
  const packagesDir = path.resolve(__dirname, "../../packages");
  try {
    return fs
      .readdirSync(packagesDir)
      .filter((dir) => {
        const pkgPath = path.join(packagesDir, dir, "package.json");
        return fs.existsSync(pkgPath);
      })
      .map((dir) => `@third-eye/${dir}`);
  } catch {
    // Fallback if packages directory doesn't exist
    return [
      "@third-eye/constants",
      "@third-eye/types",
      "@third-eye/config",
      "@third-eye/db",
      "@third-eye/core",
      "@third-eye/providers",
      "@third-eye/eyes",
      "@third-eye/mcp",
      "@third-eye/theme",
    ];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security
  poweredByHeader: false,

  // Production build settings
  output: "standalone",

  // Skip type checking during build (types are checked separately in build:packages)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Webpack configuration to exclude server-only packages and resolve workspace packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve these on client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "bun:sqlite": false,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Add resolve aliases for workspace packages to help webpack find them
    // This ensures both source and dist files can be resolved
    config.resolve.alias = {
      ...config.resolve.alias,
      "@third-eye/constants": path.resolve(__dirname, "../../packages/constants"),
      "@third-eye/types": path.resolve(__dirname, "../../packages/types"),
      "@third-eye/config": path.resolve(__dirname, "../../packages/config"),
      "@third-eye/db": path.resolve(__dirname, "../../packages/db"),
      "@third-eye/core": path.resolve(__dirname, "../../packages/core"),
      "@third-eye/providers": path.resolve(__dirname, "../../packages/providers"),
      "@third-eye/eyes": path.resolve(__dirname, "../../packages/eyes"),
      "@third-eye/mcp": path.resolve(__dirname, "../../packages/mcp"),
      "@third-eye/theme": path.resolve(__dirname, "../../packages/theme"),
      "@third-eye/utils": path.resolve(__dirname, "../../packages/utils"),
    };

    return config;
  },

  // Auto-discover and transpile ALL workspace packages (no manual maintenance needed)
  transpilePackages: getWorkspacePackages(),

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.anthropic.com",
      },
      {
        protocol: "https",
        hostname: "cursor.sh",
      },
      {
        protocol: "https",
        hostname: "www.warp.dev",
      },
      {
        protocol: "https",
        hostname: "zed.dev",
      },
      {
        protocol: "https",
        hostname: "continue.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.oaistatic.com",
      },
    ],
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // API routes proxy for local server communication
  async rewrites() {
    const apiPort =
      process.env.NEXT_PUBLIC_API_PORT || process.env.API_PORT || "7070";
    const apiHost =
      process.env.NEXT_PUBLIC_API_HOST || process.env.API_HOST || "127.0.0.1";

    return [
      {
        source: "/api/:path*",
        destination: `http://${apiHost}:${apiPort}/:path*`,
      },
    ];
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
