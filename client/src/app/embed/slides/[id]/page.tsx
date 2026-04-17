'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Presentation } from 'lucide-react';
import SlideViewer from '@/components/shared/SlideViewer';
import { buildSlidePath } from '@/lib/url';
import { getApiOrigin } from '@/lib/api-origin';
import { resolveFileUrl } from '@/lib/pdfRenderer';

const API_BASE = getApiOrigin();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export default function EmbedSlidePage() {
  const { id } = useParams();
  const [slide, setSlide] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'converting' | 'error'>('loading');

  useEffect(() => {
    fetch(`${API_BASE}/api/slides/${id}`)
      .then(r => r.json())
      .then(data => {
        setSlide(data);
        if (data.conversionStatus === 'done' && data.pdfUrl) setStatus('ready');
        else if (data.conversionStatus === 'failed' || data.conversionStatus === 'unsupported') setStatus('error');
        else setStatus('converting');
      })
      .catch(() => setStatus('error'));
  }, [id]);

  // Poll while converting
  useEffect(() => {
    if (status !== 'converting') return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/slides/${id}`);
        const data = await r.json();
        if (data.conversionStatus === 'done' && data.pdfUrl) {
          setSlide(data);
          setStatus('ready');
          clearInterval(timer);
        } else if (data.conversionStatus === 'failed' || data.conversionStatus === 'unsupported') {
          setStatus('error');
          clearInterval(timer);
        }
      } catch { clearInterval(timer); }
    }, 4000);
    return () => clearInterval(timer);
  }, [status, id]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {status === 'loading' && (
        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Yükleniyor…
        </div>
      )}

      {status === 'converting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-medium">Slayt hazırlanıyor…</p>
          <p className="text-xs opacity-60">Bu birkaç dakika sürebilir</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Presentation className="w-10 h-10 opacity-20" />
          <p>Slayt görüntülenemiyor</p>
        </div>
      )}

      {status === 'ready' && slide && (
        <div className="flex-1 overflow-auto px-2 py-2">
          <SlideViewer
            pdfUrl={slide.pdfUrl}
            slideId={Number(id)}
            coverUrl={resolveFileUrl(slide.thumbnailUrl) || undefined}
          />
        </div>
      )}

      {/* Branding footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-card text-[11px]" style={{ borderColor: 'hsl(var(--border, 214 32% 91%))' }}>
        <span className="font-semibold truncate max-w-[60%] opacity-70">
          {slide?.title || ''}
        </span>
        <a
          href={`${SITE_URL}${buildSlidePath({ id: Number(id), slug: slide?.slug, title: slide?.title })}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold shrink-0 hover:underline"
          style={{ color: 'hsl(var(--primary, 238 84% 67%))' }}
        >
          Slaytim&apos;de Aç ↗
        </a>
      </div>
    </div>
  );
}
