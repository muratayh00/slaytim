'use client';

/**
 * AnalyticsTracker
 *
 * Fires a `page_view` event to /api/analytics/event on every route change.
 * - sessionId is stable per browser session (localStorage key: `_sid`).
 * - Deduplicates: same path fired at most once per 5 s.
 * - No console output in production.
 * - Never blocks rendering (fire-and-forget, errors silently swallowed).
 * - Mount once in (main)/layout.tsx.
 */

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api-origin';

const SESSION_KEY  = '_sid';
const DEDUP_MS     = 5_000; // ignore same-path events within 5 s
const API_BASE     = getApiBaseUrl().replace(/\/+$/, '');
const ENDPOINT     = `${API_BASE}/analytics/event`;
const IS_DEV       = process.env.NODE_ENV !== 'production';

/** Return or create a stable, random sessionId stored in localStorage. */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid || sid.length < 8) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    // localStorage blocked (e.g. private mode strict)
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function sendEvent(eventName: string, page: string, metadata: Record<string, unknown> = {}): void {
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  const payload = JSON.stringify({ eventName, sessionId, page, metadata, timestamp: new Date().toISOString() });

  // Use sendBeacon when available (doesn't block navigation)
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon(ENDPOINT, blob);
    if (!sent) {
      // sendBeacon queue full — fall back to fetch
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
        .catch(() => {});
    }
  } else {
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
      .catch(() => {});
  }

  if (IS_DEV) console.log('[AnalyticsTracker]', eventName, page);
}

export default function AnalyticsTracker() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const lastFiredRef = useRef<{ path: string; ts: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Deduplicate: skip if same path fired within DEDUP_MS
    const now = Date.now();
    if (
      lastFiredRef.current?.path === fullPath &&
      now - lastFiredRef.current.ts < DEDUP_MS
    ) return;

    lastFiredRef.current = { path: fullPath, ts: now };

    // Small delay so the page has time to mount before the beacon fires
    const timer = setTimeout(() => {
      sendEvent('page_view', fullPath, { referrer: document.referrer || '' });
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null; // renders nothing
}

/** Exported helper — call from any component for custom events. */
export { sendEvent as trackEvent };
