import api from '@/lib/api';
import { getApiBaseUrl } from './api-origin';

type BufferedEvent = {
  eventId: string;
  sessionId: string;
  sequence: number;
  eventType: string;
  payload: Record<string, unknown>;
};

const FLUSH_MS = 10_000;
const MAX_BUFFER = 100;
const API_BASE = getApiBaseUrl();
let seq = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let buffer: BufferedEvent[] = [];
let started = false;
let consecutiveFlushFailures = 0;
let flushPausedUntil = 0;

const randomId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;

const makeEvent = (eventType: string, sessionId: string, payload: Record<string, unknown>): BufferedEvent => ({
  eventId: randomId(),
  sessionId,
  sequence: seq++,
  eventType,
  payload,
});

const flushViaBeacon = (events: BufferedEvent[]) => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
  try {
    const blob = new Blob([JSON.stringify({ events })], { type: 'application/json; charset=UTF-8' });
    return navigator.sendBeacon(`${API_BASE}/analytics/batch`, blob);
  } catch {
    return false;
  }
};

export const flushTelemetry = async (opts?: { forceBeacon?: boolean }) => {
  if (!buffer.length) return;
  if (Date.now() < flushPausedUntil) return;
  const events = buffer;
  buffer = [];

  if (opts?.forceBeacon && flushViaBeacon(events)) return;

  try {
    await api.post('/analytics/batch', { events });
    consecutiveFlushFailures = 0;
    flushPausedUntil = 0;
  } catch {
    // Requeue on failure (bounded)
    buffer = [...events, ...buffer].slice(0, MAX_BUFFER);
    consecutiveFlushFailures += 1;
    // Avoid spamming the console/network when backend is temporarily unhealthy.
    if (consecutiveFlushFailures >= 3) {
      flushPausedUntil = Date.now() + 60_000;
    }
  }
};

export const pushTelemetryEvent = (eventType: string, sessionId: string, payload: Record<string, unknown> = {}) => {
  if (!sessionId) return;
  buffer.push(makeEvent(eventType, sessionId, payload));
  if (buffer.length >= MAX_BUFFER) {
    flushTelemetry().catch(() => {});
  }
};

export const pushSessionSnapshot = async (snapshot: {
  snapshotId?: string;
  sessionId: string;
  topicId?: number | null;
  slideId?: number | null;
  durationMs: number;
  maxScroll: number;
  pagesViewed: number[];
  interactions: Record<string, unknown>;
}) => {
  try {
    await api.post('/analytics/session-snapshot', snapshot);
  } catch {
    // best effort
  }
};

export const startTelemetryBuffer = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  timer = setInterval(() => flushTelemetry().catch(() => {}), FLUSH_MS);

  const flushWithBeacon = () => flushTelemetry({ forceBeacon: true }).catch(() => {});
  window.addEventListener('beforeunload', flushWithBeacon);
  window.addEventListener('pagehide', flushWithBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushWithBeacon();
  });
};

export const stopTelemetryBuffer = () => {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
};
