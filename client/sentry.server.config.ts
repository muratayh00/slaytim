// Sentry — server-side (Node.js / Next.js Server Components) initialization
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate on server — still get actionable data
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  environment: process.env.NODE_ENV,

  // Ignore expected operational errors that don't need alerting
  ignoreErrors: [
    /^NEXT_NOT_FOUND$/,
    /^NEXT_REDIRECT$/,
  ],

  enabled: process.env.NODE_ENV === 'production',
});
