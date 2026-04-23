'use client';
import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_RELOAD_SESSION_KEY = 'slaytim:chunk-reload-once:v1';
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

function readReloadState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as { at: number; path: string; reason: string };
  } catch {
    return null;
  }
}

function isChunkDeployMismatchError(input: unknown): boolean {
  const err = input as any;
  const name = String(err?.name || '');
  const message = String(err?.message || err?.reason?.message || err || '');
  const stack = String(err?.stack || '');
  const combined = `${name} ${message} ${stack}`.toLowerCase();

  return (
    name === 'ChunkLoadError' ||
    combined.includes('chunkloaderror') ||
    combined.includes('loading chunk') ||
    combined.includes('failed to fetch dynamically imported module') ||
    combined.includes('importing a module script failed') ||
    combined.includes('loading css chunk') ||
    combined.includes('/_next/static/chunks/')
  );
}

export default class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    this.handleWindowError = this.handleWindowError.bind(this);
    this.safeRecoverFromChunkError = this.safeRecoverFromChunkError.bind(this);
  }

  componentDidMount() {
    // Catch async chunk/deploy mismatch failures after a new deployment.
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.addEventListener('error', this.handleWindowError, true);

    // Old flags should not block future legitimate one-time recoveries.
    const prev = readReloadState();
    if (prev && Date.now() - Number(prev.at || 0) > CHUNK_RELOAD_COOLDOWN_MS) {
      window.sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleWindowError, true);
  }

  handleUnhandledRejection(e: PromiseRejectionEvent) {
    if (isChunkDeployMismatchError(e?.reason)) {
      e.preventDefault();
      this.safeRecoverFromChunkError('unhandledrejection');
    }
  }

  handleWindowError(event: Event) {
    const maybeError = event as ErrorEvent;
    if (isChunkDeployMismatchError(maybeError?.error || maybeError?.message)) {
      this.safeRecoverFromChunkError('window-error');
      return;
    }

    const target = event.target as HTMLScriptElement | HTMLLinkElement | null;
    const src = String((target as any)?.src || (target as any)?.href || '');
    if (src && src.includes('/_next/static/')) {
      this.safeRecoverFromChunkError('asset-load-error');
    }
  }

  safeRecoverFromChunkError(reason: string): boolean {
    if (typeof window === 'undefined') return false;

    const prev = readReloadState();
    const now = Date.now();
    if (prev && prev.path === window.location.pathname && now - Number(prev.at || 0) < CHUNK_RELOAD_COOLDOWN_MS) {
      // Already attempted a recovery for this path recently; avoid reload loops.
      return false;
    }

    try {
      window.sessionStorage.setItem(
        CHUNK_RELOAD_SESSION_KEY,
        JSON.stringify({ at: now, path: window.location.pathname, reason }),
      );
    } catch {
      // Ignore storage failures; reload is still the best recovery.
    }

    const url = new URL(window.location.href);
    url.searchParams.set('__chunk_reload', String(now));
    window.location.replace(url.toString());
    return true;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isChunkDeployMismatchError(error)) {
      const recovered = this.safeRecoverFromChunkError('component-error');
      if (recovered) return;
    }
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Bir seyler ters gitti</h1>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || 'Beklenmedik bir hata olustu.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            >
              Sayfayi Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

