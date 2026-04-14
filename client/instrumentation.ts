// Next.js 14 Instrumentation Hook
// Bu dosya Next.js'in kendi yükleme döngüsüne Sentry'yi entegre eder.
// next.config.js'de `experimental.instrumentationHook: true` GEREKMEZ (Next 14.0.4+).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
