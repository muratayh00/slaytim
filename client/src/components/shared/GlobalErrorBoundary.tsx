'use client';
import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
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
