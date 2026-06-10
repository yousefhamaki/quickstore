import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  turbopack: {
    root: 'C:/Users/Home/Documents/GitHub/QuickStore/frontend',
  },


  experimental: {
    optimizePackageImports: ['lucide-react', '@quickstore/shared'],
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
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://images.simplycodes.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://images.simplycodes.com https://res.cloudinary.com",
      "font-src 'self' https://fonts.gstatic.com https://images.simplycodes.com",
      "connect-src 'self' http://localhost:5000 https://images.simplycodes.com https://*.onrender.com https://*.buildora.live https://*.buildora.com",
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
  async rewrites() {
    let merchantDashboardUrl = process.env.MERCHANT_DASHBOARD_URL || 'http://localhost:3001';
    
    // Auto-sanitize formatting errors:
    // 1. Ensure it starts with http:// or https://
    if (!merchantDashboardUrl.startsWith('http://') && !merchantDashboardUrl.startsWith('https://')) {
      merchantDashboardUrl = `https://${merchantDashboardUrl}`;
    }
    // 2. Remove any trailing slashes
    merchantDashboardUrl = merchantDashboardUrl.replace(/\/+$/, '');

    const routes = ['merchant', 'dashboard', 'admin', 'auth', 'verify-email'];
    const rules = [];

    // Rewrite Merchant Dashboard static assets
    rules.push({
      source: '/merchant-assets/_next/:path*',
      destination: `${merchantDashboardUrl}/_next/:path*`,
    });

    // 1. Locale-prefixed rules
    for (const route of routes) {
      // Exact path rule (no trailing slash)
      rules.push({
        source: `/:locale(en|ar)/${route}`,
        destination: `${merchantDashboardUrl}/:locale/${route}`,
      });
      // Subpath rule (using :path+ to prevent matching empty and adding trailing slashes)
      rules.push({
        source: `/:locale(en|ar)/${route}/:path+`,
        destination: `${merchantDashboardUrl}/:locale/${route}/:path+`,
      });
    }

    // 2. Non-locale prefixed rules
    for (const route of routes) {
      // Exact path rule
      rules.push({
        source: `/${route}`,
        destination: `${merchantDashboardUrl}/${route}`,
      });
      // Subpath rule
      rules.push({
        source: `/${route}/:path+`,
        destination: `${merchantDashboardUrl}/${route}/:path+`,
      });
    }

    return rules;
  },
};

export default withNextIntl(nextConfig);
