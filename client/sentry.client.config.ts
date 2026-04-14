// Sentry — browser / client-side initialization
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring — % of transactions to sample
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.15 : 1.0,

  // Session Replay — capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Ignore benign browser errors / extensions
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /^Network Error$/,
    /^Request failed with status code 4/,
    /chrome-extension/,
    /moz-extension/,
  ],

  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Only send events in production (skip noisy dev errors)
  enabled: process.env.NODE_ENV === 'production',
});
