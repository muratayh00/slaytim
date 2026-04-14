'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Play, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { loadPdfDocument, renderPageToCanvas } from '@/lib/pdfRenderer';

interface Slide {
  id: number;
  title: string;
  pdfUrl?: string | null;
  conversionStatus: string;
}

interface PreviewMeta {
  pageCount: number;
  previewUrl: string;
}

interface Props {
  slide: Slide;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateSlideoModal({ slide, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [pageRendering, setPageRendering] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [docRetryTick, setDocRetryTick] = useState(0);
  const [viewportTick, setViewportTick] = useState(0);
  const [limitToastTick, setLimitToastTick] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get(`/slides/${slide.id}/preview-meta`);
      const pageCount = Math.max(1, Number(data?.pageCount || 0));
      const rawPreviewUrl = String(data?.previewUrl || '').trim();
      const normalizedPreview = rawPreviewUrl.startsWith('/api/')
        ? rawPreviewUrl
        : `/api/slides/${slide.id}/pdf`;

      setPreviewMeta({ pageCount, previewUrl: normalizedPreview });
      setActivePage(1);
      setSelectedPages([]);
      setPreviewError('');
      setDocRetryTick((v) => v + 1);
    } catch (err: any) {
      setLoadError(err?.response?.data?.error || 'PDF sayfaları yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [slide.id]);

  useEffect(() => {
    if (!slide?.id || slide.conversionStatus !== 'done') {
      setLoading(false);
      setLoadError('Bu slayt henüz dönüşümünü tamamlamadı');
      return;
    }
    loadPreview();
  }, [slide?.id, slide?.conversionStatus, loadPreview]);

  useEffect(() => {
    if (!previewMeta) return;
    let cancelled = false;
    setDocLoading(true);
    setPreviewError('');
    setPdfDoc(null);

    loadPdfDocument(previewMeta.previewUrl)
      .then((doc) => {
        if (!cancelled) setPdfDoc(doc);
      })
      .catch(() => {
        if (!cancelled) setPreviewError('Önizleme açılamadı. Tekrar dene.');
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewMeta, docRetryTick]);

  useEffect(() => {
    const onResize = () => setViewportTick((v) => v + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!pdfDoc || !previewMeta || !canvasRef.current || !canvasWrapRef.current) return;
    const pageNum = Math.max(1, Math.min(previewMeta.pageCount, activePage));
    const maxWidth = Math.max(360, Math.min(1400, canvasWrapRef.current.clientWidth - 20));

    let cancelled = false;
    setPageRendering(true);
    setPreviewError('');
    renderPageToCanvas(pdfDoc, pageNum, canvasRef.current, maxWidth)
      .catch(() => {
        if (!cancelled) setPreviewError('Sayfa önizlenemedi.');
      })
      .finally(() => {
        if (!cancelled) setPageRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, previewMeta, activePage, viewportTick]);

  const togglePage = useCallback((pageNumber: number) => {
    let shouldWarnLimit = false;
    setSelectedPages((current) => {
      if (current.includes(pageNumber)) {
        return current.filter((n) => n !== pageNumber);
      }
      if (current.length >= 7) {
        shouldWarnLimit = true;
        return current;
      }
      return [...current, pageNumber].sort((a, b) => a - b);
    });
    if (shouldWarnLimit) setLimitToastTick((v) => v + 1);
  }, []);

  useEffect(() => {
    if (limitToastTick > 0) {
      toast.error('En fazla 7 sayfa seçilebilir');
    }
  }, [limitToastTick]);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Bir başlık gir');
    if (selectedPages.length < 3) return toast.error('En az 3 sayfa seçmelisin');

    setSubmitting(true);
    try {
      await api.post('/slideo-v3/from-slide', {
        slideId: slide.id,
        title: title.trim(),
        description: description.trim() || null,
        pageIndices: selectedPages,
        coverPage: selectedPages[0],
      });
      toast.success('Slideo oluşturuldu');
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const pages = useMemo(() => {
    const total = previewMeta?.pageCount || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [previewMeta?.pageCount]);

  const activeSelected = selectedPages.includes(activePage);
  const canPrev = activePage > 1;
  const canNext = activePage < pages.length;
  const canSubmit = selectedPages.length >= 3 && title.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg shadow-card w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" fill="currentColor" />
              Slideo Oluştur
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">"{slide.title}" sunumundan 3-7 sayfa seç</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Sayfalar hazırlanıyor...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 opacity-40" />
              <p className="text-sm font-semibold">{loadError}</p>
              <button
                type="button"
                onClick={loadPreview}
                className="mt-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Tekrar dene
              </button>
            </div>
          )}

          {!loading && !loadError && previewMeta && (
            <div className="p-4">
              <div ref={canvasWrapRef} className="border border-border rounded-2xl overflow-hidden bg-black min-h-[62vh] relative">
                {(docLoading || pageRendering) && (
                  <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center gap-2 text-sm text-white/80 pointer-events-none">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sayfa önizleme yükleniyor...
                  </div>
                )}

                {!docLoading && !pdfDoc && previewError && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white/70 gap-3 px-4">
                    <p className="text-sm font-semibold">{previewError}</p>
                    <button
                      type="button"
                      onClick={() => setDocRetryTick((v) => v + 1)}
                      className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold"
                    >
                      Tekrar dene
                    </button>
                  </div>
                )}

                <div className="h-[62vh] flex items-center justify-center p-2">
                  <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                </div>

                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-bold">
                  {activePage} / {pages.length}
                </div>

                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => canPrev && setActivePage((p) => p - 1)}
                    disabled={!canPrev}
                    className="px-3 py-2 rounded-xl bg-black/65 text-white text-xs font-bold border border-white/20 disabled:opacity-35"
                  >
                    Önceki
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePage(activePage)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-black border transition-colors',
                      activeSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-black/65 text-white border-white/20',
                    )}
                  >
                    {activeSelected ? 'Seçimden Çıkar' : 'Bu Sayfayı Seç'}
                  </button>

                  <button
                    type="button"
                    onClick={() => canNext && setActivePage((p) => p + 1)}
                    disabled={!canNext}
                    className="px-3 py-2 rounded-xl bg-black/65 text-white text-xs font-bold border border-white/20 disabled:opacity-35"
                  >
                    Sonraki
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Seçilen sayfalar: {selectedPages.length}/7 {selectedPages.length < 3 ? '(en az 3)' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedPages([])}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Temizle
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPages.length === 0 && (
                    <span className="text-xs text-muted-foreground">Henüz sayfa seçilmedi</span>
                  )}
                  {selectedPages.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePage(p)}
                      className={cn(
                        'h-8 px-3 rounded-lg text-xs font-bold border',
                        activePage === p ? 'bg-primary text-white border-primary' : 'bg-card border-border',
                      )}
                    >
                      Sayfa {p}
                    </button>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground mb-2">Tüm sayfalar (dokun: seç/kaldır)</p>
                  <div className="flex flex-wrap gap-2">
                    {pages.map((p) => {
                      const selected = selectedPages.includes(p);
                      return (
                        <button
                          key={`all-${p}`}
                          type="button"
                          onClick={() => {
                            setActivePage(p);
                            togglePage(p);
                          }}
                          className={cn(
                            'h-8 px-3 rounded-lg text-xs font-bold border',
                            selected ? 'bg-primary text-white border-primary' : 'bg-card border-border',
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!loading && !loadError && (
          <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Slideo başlığı *"
              maxLength={80}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama (opsiyonel)"
              maxLength={200}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Oluşturuluyor...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" fill="currentColor" /> Slideo oluştur
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

