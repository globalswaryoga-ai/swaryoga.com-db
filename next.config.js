/** @type {import('next').NextConfig} */
// Disable Next.js telemetry for cleaner builds
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Force rebuild with env vars - 2026-01-07
const fs = require('fs');
const path = require('path');

const paymentOverrideFile = path.resolve(process.cwd(), '.env.payment');

const buildWorkshopOverrides = () => {
  const overrides = [];

  if (fs.existsSync(paymentOverrideFile)) {
    try {
      const content = fs.readFileSync(paymentOverrideFile, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;

        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex === -1) return;

        const rawKey = trimmedLine.slice(0, separatorIndex).trim();
        const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
        if (!rawKey || !rawValue) return;

        const normalizedKey = rawKey.toLowerCase();
        if (!/workshops?\//.test(normalizedKey)) return;

        const withoutProtocol = normalizedKey
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/+/g, '/');

        const pathPart = withoutProtocol.split('?')[0].replace(/\/+$/, '');
        if (!pathPart) return;

        const segments = pathPart.split('/').filter(Boolean);
        const lastSegment = segments.at(-1);
        if (!lastSegment) return;

        const normalizedSlug = lastSegment
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        if (!normalizedSlug) return;

        const normalizedPath = segments.join('/');
        overrides.push({ slug: normalizedSlug, path: normalizedPath, link: rawValue });
      });
    } catch (error) {
      console.warn('Warning: Could not read .env.payment file:', error.message);
    }
  }

  process.env.NEXT_PUBLIC_PAYMENT_OVERRIDES = JSON.stringify(overrides);
};

buildWorkshopOverrides();

const nextConfig = {
  reactStrictMode: true,
  // SWC minifier (default). The legacy Terser fallback (swcMinify:false) cannot
  // parse modern class syntax bundled by deps like @vercel/blob and fails the build.
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    // Keep server-only packages out of webpack bundle
    serverComponentsExternalPackages: ['@distube/ytdl-core', 'node-cron'],
    // Run instrumentation.ts register() at server startup (TLS curve fix for Atlas).
    instrumentationHook: true,
  },
  // CORS & security headers are handled by middleware.ts (Edge runtime)
  // with a strict origin allowlist. Do NOT add Access-Control-Allow-Origin: *
  // here — it would override the middleware's restrictions.
  async headers() {
    return [
      {
        // Security-only headers for API routes (CORS is in middleware.ts)
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/workshop',
        destination: '/workshops',
        permanent: true,
      },
      {
        source: '/workshop/:id',
        destination: '/workshops/:id',
        permanent: true,
      },
      // Registration funnel lives under /registernow and legacy /workshop/:id/registernow.
      // Some older links (or shared URLs) may use the plural form, so redirect to avoid 404s.
      {
        source: '/workshops/:id/register',
        destination: '/registernow?workshop=:id',
        permanent: true,
      },
      {
        source: '/workshops/:id/registernow',
        destination: '/workshop/:id/registernow',
        permanent: true,
      },
      {
        source: '/workshops/:id/registernow/cart',
        destination: '/workshop/:id/registernow/cart',
        permanent: true,
      },
      {
        source: '/workshops/:id/registernow/cart/checkout',
        destination: '/workshop/:id/registernow/cart/checkout',
        permanent: true,
      },
      {
        source: '/workshops/:id/registernow/cart/checkout/payu',
        destination: '/workshop/:id/registernow/cart/checkout/payu',
        permanent: true,
      },
      // Redirect old Meta-specific paths to unified WhatsApp paths
      {
        source: '/admin/crm/whatsapp/meta',
        destination: '/admin/crm/whatsapp',
        permanent: true,
      },
      {
        source: '/admin/crm/whatsapp/meta/:path*',
        destination: '/admin/crm/whatsapp/:path*',
        permanent: true,
      },
      {
        source: '/api/admin/crm/whatsapp/meta/:path*',
        destination: '/api/admin/crm/whatsapp/:path*',
        permanent: true,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'images.pexels.com', 'i.postimg.cc', 'placehold.co', 'swaryogacrm.b-cdn.net'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'swaryogacrm.b-cdn.net',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Some environments hit intermittent PackFileCacheStrategy ENOENT errors.
    // Disabling persistent filesystem cache keeps builds stable.
    config.cache = false;

    // Handle swisseph native module - don't bundle it, let it load at runtime
    if (!isServer) {
      config.externals = config.externals || {};
      config.externals['swisseph'] = 'commonjs2 swisseph';
      config.externals['@bidyashish/panchang'] = 'commonjs2 @bidyashish/panchang';
      // WhatsApp Web is server-only - completely exclude from client bundle
      config.externals['whatsapp-web.js'] = 'commonjs2 whatsapp-web.js';
      config.externals['puppeteer'] = 'commonjs2 puppeteer';
      config.externals['qrcode'] = 'commonjs2 qrcode';
      // Backup/cron is server-only
      config.externals['node-cron'] = 'commonjs2 node-cron';
    } else {
      // On server side, also mark these as external to prevent webpack analysis
      config.externals = config.externals || {};
      config.externals['whatsapp-web.js'] = 'commonjs2 whatsapp-web.js';
      config.externals['puppeteer'] = 'commonjs2 puppeteer';
      config.externals['qrcode'] = 'commonjs2 qrcode';
    }
    
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  pageExtensions: ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'],
  // Exclude src/pages from Next.js build since we're using app/ router
  rewrites: async () => ({
    beforeFiles: [
      // Super-admin alias: /super-admin/crm/* serves the existing /admin/crm/* pages.
      // Tenants (crm.swaryoga.com/admin/crm) and /api/admin/crm are untouched.
      { source: '/super-admin/crm', destination: '/admin/crm' },
      { source: '/super-admin/crm/:path*', destination: '/admin/crm/:path*' },
    ],
    afterFiles: [],
    fallback: [],
  }),
  // Disable Vercel toolbar
  productionBrowserSourceMaps: false,
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL || '',
  },
};

module.exports = nextConfig;
