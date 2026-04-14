/**
 * Type-safe access to NEXT_PUBLIC_* environment variables.
 */

const forbiddenPublicDbKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const leakedPublicDbKeys = forbiddenPublicDbKeys.filter((key) => {
  const value = (process.env as Record<string, string | undefined>)[key];
  return typeof value === 'string' && value.trim().length > 0;
});

if (leakedPublicDbKeys.length > 0) {
  throw new Error(
    `[Security] Forbidden public database keys detected: ${leakedPublicDbKeys.join(', ')}. ` +
    'Database access must be backend-only.',
  );
}

export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  UPLOAD_HOST: process.env.NEXT_PUBLIC_UPLOAD_HOST || '',
  GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
  ADSENSE_ID: process.env.NEXT_PUBLIC_ADSENSE_ID || '',
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;
