'use client';

import { useEffect } from 'react';

const VERSION_GUARD_KEY = 'slaytim:build-mismatch-reload:v1';
const CHECK_INTERVAL_MS = 60_000;
const RELOAD_COOLDOWN_MS = 60_000;

function readState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(VERSION_GUARD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { at: number; buildId: string };
  } catch {
    return null;
  }
}

function shouldReloadOnce(buildId: string): boolean {
  if (typeof window === 'undefined') return false;
  const prev = readState();
  const now = Date.now();
  if (prev && prev.buildId === buildId && now - Number(prev.at || 0) < RELOAD_COOLDOWN_MS) {
    return false;
  }
  try {
    window.sessionStorage.setItem(VERSION_GUARD_KEY, JSON.stringify({ at: now, buildId }));
  } catch {
    // Ignore storage write errors and still try reloading once.
  }
  return true;
}

export default function BuildVersionGuard() {
  useEffect(() => {
    const buildId = String((window as any).__NEXT_DATA__?.buildId || '').trim();
    if (!buildId) return;

    let stopped = false;

    const checkBuildAssets = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/_next/static/${buildId}/_buildManifest.js`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if ((res.status === 404 || res.status === 410) && shouldReloadOnce(buildId)) {
          const url = new URL(window.location.href);
          url.searchParams.set('__build_reload', String(Date.now()));
          window.location.replace(url.toString());
        }
      } catch {
        // Network hiccups should not force reload loops.
      }
    };

    const interval = window.setInterval(checkBuildAssets, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkBuildAssets();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
