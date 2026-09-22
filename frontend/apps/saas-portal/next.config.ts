import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Resolved relative to this file instead of a hardcoded local path — the
// old 'C:/Users/.../frontend' literal only existed on one dev machine and
// would silently fail to find the workspace root on Vercel's Linux build
// machines (or anyone else's checkout).
const workspaceRoot = path.join(__dirname, '..', '..');

// Frontend monorepo's own version (frontend/package.json) — bump that file
// to release a new version; it shows up in the footer via
// NEXT_PUBLIC_APP_VERSION, baked in at build time (next.config's `env` is
// static, read once when the build starts, not re-read per request).
const appVersion = require(path.join(workspaceRoot, 'package.json')).version as string;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.simplycodes.com',
      },
    ],
  },
  turbopack: {
    root: workspaceRoot,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons', '@quickstore/shared', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },

  transpilePackages: ['@quickstore/shared'],
  // Allow subdomain dev origins — wildcards are unreliable, list explicitly
  allowedDevOrigins: [
    'localhost:3000',
    'quickstore.test:3000',
    'hamaki.quickstore.test:3000',
    'yousef.quickstore.test:3000',
    'quickstore.test',
    'hamaki.quickstore.test',
    'yousef.quickstore.test',
  ],
  // Enable React strict mode for better performance warnings
  reactStrictMode: true,
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://accounts.google.com https://vercel.live https://images.simplycodes.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
      "img-src 'self' blob: data: https://lh3.googleusercontent.com https://images.simplycodes.com https://res.cloudinary.com",
      "font-src 'self' https://fonts.gstatic.com https://images.simplycodes.com",
      "connect-src 'self' http://localhost:5000 http://localhost:5501 https://vercel.live https://*.vercel.live https://images.simplycodes.com https://*.onrender.com https://*.buildora.live https://*.buildora.com",
      "frame-src 'self' https://accounts.google.com https://vercel.live",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ];

    if (!isDev) {
      cspDirectives.push("upgrade-insecure-requests");
    }

    const headersList = [
      {
        key: 'Content-Security-Policy',
        value: cspDirectives.join('; ') + ';',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
    ];

    if (!isDev) {
      headersList.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: headersList,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
