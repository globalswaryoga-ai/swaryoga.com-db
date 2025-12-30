/** @type {import('next').NextConfig} */
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
  // Use SWC minify but disable for Vercel
  swcMinify: false,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization,X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
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
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'images.pexels.com', 'i.postimg.cc'],
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
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle swisseph native module - don't bundle it, let it load at runtime
    if (!isServer) {
      config.externals = config.externals || {};
      config.externals['swisseph'] = 'commonjs2 swisseph';
      config.externals['@bidyashish/panchang'] = 'commonjs2 @bidyashish/panchang';
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  pageExtensions: ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'],
  // Exclude src/pages from Next.js build since we're using app/ router
  rewrites: async () => ({
    beforeFiles: [],
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
