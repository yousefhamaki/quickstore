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

    return [
      {
        source: '/:locale(en|ar)/merchant/:path*',
        destination: `${merchantDashboardUrl}/:locale/merchant/:path*`,
      },
      {
        source: '/:locale(en|ar)/dashboard/:path*',
        destination: `${merchantDashboardUrl}/:locale/dashboard/:path*`,
      },
      {
        source: '/:locale(en|ar)/admin/:path*',
        destination: `${merchantDashboardUrl}/:locale/admin/:path*`,
      },
      {
        source: '/merchant/:path*',
        destination: `${merchantDashboardUrl}/merchant/:path*`,
      },
      {
        source: '/dashboard/:path*',
        destination: `${merchantDashboardUrl}/dashboard/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${merchantDashboardUrl}/admin/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
