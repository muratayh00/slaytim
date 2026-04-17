// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Cache dynamic RSC responses for 30s in dev to prevent InnerLayoutRouter
    // re-fetches after Fast Refresh from hitting the server while it's still restarting.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  images: {
    remotePatterns: [
      // Local dev API server
      ...(process.env.NODE_ENV !== 'production'
        ? [{ protocol: 'http', hostname: 'localhost', port: '5001' }]
        : []),
      // API server — uploads, avatars, thumbnails are all served from here
      { protocol: 'https', hostname: 'api.slaytim.com' },
      // Configurable upload host (CDN / S3 proxy / staging). Included only when
      // it differs from the hardcoded api.slaytim.com to avoid duplicate entries.
      ...(process.env.NEXT_PUBLIC_UPLOAD_HOST &&
      process.env.NEXT_PUBLIC_UPLOAD_HOST !== 'api.slaytim.com'
        ? [{ protocol: 'https', hostname: process.env.NEXT_PUBLIC_UPLOAD_HOST }]
        : []),
      // Apex domain (OG images, static assets hosted on slaytim.com itself)
      { protocol: 'https', hostname: 'slaytim.com' },
      // Cloudflare R2 public host pattern used by signed URLs
      // (e.g. <accountid>.r2.cloudflarestorage.com)
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Optional safety for S3-hosted signed media
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },

  webpack: (config, { isServer }) => {
    // pdfjs-dist uses canvas which is not available in SSR
    config.resolve.alias.canvas = false;

    // Copy PDF.js assets to public/ so they are served locally without CDN dependency.
    if (!isServer) {
      const fs = require('fs');
      const path = require('path');
      const pdfjsRoot = path.resolve('./node_modules/pdfjs-dist');

      const copies = [
        // Main API module bundles loaded directly from browser (webpackIgnore import)
        ['build/pdf.min.mjs', 'pdf.min.mjs'],
        ['legacy/build/pdf.min.mjs', 'pdf.legacy.min.mjs'],
        // Main worker
        ['build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'],
        // WASM decoders (JPEG 2000, JBIG2, color profiles) — loaded by the worker at runtime
        ['wasm/openjpeg.wasm', 'openjpeg.wasm'],
        ['wasm/jbig2.wasm', 'jbig2.wasm'],
        ['wasm/qcms_bg.wasm', 'qcms_bg.wasm'],
      ];

      for (const [rel, dest] of copies) {
        const src = path.join(pdfjsRoot, rel);
        const out = path.resolve(`./public/${dest}`);
        if (fs.existsSync(src)) {
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.copyFileSync(src, out);
        }
      }
    }

    return config;
  },

  compress: true,
  // Prevent exposing Next.js version in the X-Powered-By response header.
  poweredByHeader: false,
  // reactStrictMode is intentionally false: the app uses PDF.js canvas rendering
  // which triggers double-invocation warnings under strict mode in development.
  reactStrictMode: false,
  productionBrowserSourceMaps: false,

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const embedParents = (process.env.NEXT_PUBLIC_EMBED_ALLOWED_PARENTS || 'http://localhost:3000 https://slaytim.com')
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .join(' ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },        ],
      },
      {
        source: '/embed/(.*)',
        headers: [          { key: 'Content-Security-Policy', value: `frame-ancestors ${embedParents}; base-uri 'self'; object-src 'none'` },        ],
      },
      // PDF proxy routes must be frameable by same origin so the iframe fallback in
      // SlideoViewer, SlideoDetailPreview, and CreateSlideoModal works.
      // This rule comes AFTER the global '/(.*)', so it overrides frame-ancestors for PDF routes.
      {
        source: '/api/slides/:id/pdf',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
        ],
      },
      ...(isDev ? [{
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      }] : []),
    ];
  },
};

// Sentry is only wired when the env var is present; safe to deploy without it.
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

module.exports = SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Silent during local builds to avoid noise
      silent: true,
      // Upload source maps only in CI/production
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
