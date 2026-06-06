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
      {
        protocol: 'https',
        hostname: 'images.simplycodes.com',
      },
    ],
  },
  turbopack: {
    root: 'C:/Users/Home/Documents/GitHub/QuickStore/frontend',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons', '@quickstore/shared', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  transpilePackages: ['@quickstore/shared'],
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://images.simplycodes.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://images.simplycodes.com https://res.cloudinary.com; font-src 'self' https://fonts.gstatic.com https://images.simplycodes.com; connect-src 'self' http://localhost:5000 https://images.simplycodes.com https://*.onrender.com https://*.buildora.live https://*.buildora.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
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
        ],
      },
    ];
  },
};


export default withNextIntl(nextConfig);
