import api from '@/lib/api';
import { getApiBaseUrl } from './api-origin';

type BufferedEvent = {
  eventId: string;
  sessionId: string;
  sequence: number;
  eventType: string;
  payload: Record<string, unknown>;
};

const FLUSH_MS_VISIBLE = 120_000;
const FLUSH_MS_HIDDEN = 600_000;
const SOFT_BATCH_SIZE = 5;
const MAX_BUFFER = 100;
const API_BASE = getApiBaseUrl();
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let buffer: BufferedEvent[] = [];
let started = false;
let consecutiveFlushFailures = 0;
let flushPausedUntil = 0;
let boundBeforeUnload: (() => void) | null = null;
let boundPageHide: (() => void) | null = null;
let boundVisibility: (() => void) | null = null;

const clearFlushTimer = () => {
  if (timer) clearTimeout(timer);
  timer = null;
};

const scheduleFlush = () => {
  if (!started || typeof document === 'undefined') return;
  clearFlushTimer();
  if (!buffer.length) return;
  const hidden = document.visibilityState === 'hidden';
  const baseInterval = hidden ? FLUSH_MS_HIDDEN : FLUSH_MS_VISIBLE;
  const interval = buffer.length >= SOFT_BATCH_SIZE ? Math.min(baseInterval, 30_000) : baseInterval;
  timer = setTimeout(() => {
    flushTelemetry().catch(() => {});
    scheduleFlush();
  }, interval);
};

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
  } finally {
    scheduleFlush();
  }
};

export const pushTelemetryEvent = (eventType: string, sessionId: string, payload: Record<string, unknown> = {}) => {
  if (!sessionId) return;
  buffer.push(makeEvent(eventType, sessionId, payload));
  if (buffer.length >= MAX_BUFFER) {
    flushTelemetry().catch(() => {});
    return;
  }
  scheduleFlush();
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
  const flushWithBeacon = () => flushTelemetry({ forceBeacon: true }).catch(() => {});
  boundBeforeUnload = () => { flushWithBeacon(); };
  boundPageHide = () => { flushWithBeacon(); };
  boundVisibility = () => {
    if (document.visibilityState === 'hidden') {
      flushWithBeacon();
      return;
    }
    scheduleFlush();
  };
  window.addEventListener('beforeunload', boundBeforeUnload);
  window.addEventListener('pagehide', boundPageHide);
  document.addEventListener('visibilitychange', boundVisibility);
  scheduleFlush();
};

export const stopTelemetryBuffer = () => {
  clearFlushTimer();
  if (typeof window !== 'undefined') {
    if (boundBeforeUnload) window.removeEventListener('beforeunload', boundBeforeUnload);
    if (boundPageHide) window.removeEventListener('pagehide', boundPageHide);
  }
  if (typeof document !== 'undefined' && boundVisibility) {
    document.removeEventListener('visibilitychange', boundVisibility);
  }
  boundBeforeUnload = null;
  boundPageHide = null;
  boundVisibility = null;
  started = false;
};
