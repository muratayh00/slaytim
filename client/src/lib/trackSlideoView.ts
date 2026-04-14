import api from '@/lib/api';
import { analytics } from '@/lib/analytics';

type ViewTrackSource = 'viewer' | 'detail';

type HeadersLike = Record<string, string>;

const RETRY_DELAYS_MS = [700, 1500];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (status?: number) => {
  if (!status) return true; // network-level error
  if (status === 429) return true;
  return status >= 500;
};

export async function trackSlideoViewWithRetry(
  slideoId: number,
  source: ViewTrackSource,
  headers?: HeadersLike,
) {
  const maxAttempts = RETRY_DELAYS_MS.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await api.post(`/slideo/${slideoId}/view`, {}, headers ? { headers } : undefined);
      if (attempt > 1) {
        analytics.slideoViewTrackRetrySuccess({ slideo_id: slideoId, source, attempt });
      }
      return;
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      analytics.slideoViewTrackFailure({
        slideo_id: slideoId,
        source,
        status,
        attempt,
      });

      if (attempt >= maxAttempts || !shouldRetry(status)) return;
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
  }
}

