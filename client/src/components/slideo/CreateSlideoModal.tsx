'use client';

import Image from 'next/image';
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

interface PageImage {
  pageNumber: number;
  url: string;
  width?: number;
  height?: number;
}

interface Props {
  slide: Slide;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateSlideoModal({ slide, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Image-based preview (fast path — uses pre-generated WebP assets)
  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [previewStatus, setPreviewStatus] = useState<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // PDF.js fallback (slow path — only used when no WebP assets exist yet)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [pageRendering, setPageRendering] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [docRetryTick, setDocRetryTick] = useState(0);
  const [viewportTick, setViewportTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [activePage, setActivePage] = useState(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [limitToastTick, setLimitToastTick] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Determine whether to use image or PDF.js mode
  const useImageMode = pageImages.length > 0;

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get(`/slides/${slide.id}/preview-meta`);

      if (data?.previewMode === 'images' && Array.isArray(data?.pages) && data.pages.length > 0) {
        // Fast path: pre-generated WebP assets available
        setPageImages(data.pages);
        setTotalPages(Number(data.totalPages || data.pages.length));
        setPreviewStatus(String(data.previewStatus || ''));
        setActivePage(1);
        setSelectedPages([]);
        setPreviewError('');
      } else {
        // Slow fallback: load PDF via PDF.js
        const rawPreviewUrl = String(data?.previewUrl || '').trim();
        const normalizedPreview = rawPreviewUrl.startsWith('/api/')
          ? rawPreviewUrl
          : `/api/slides/${slide.id}/pdf`;
        setPdfPreviewUrl(normalizedPreview);
        setTotalPages(Math.max(1, Number(data?.pageCount || 0)));
        setActivePage(1);
        setSelectedPages([]);
        setPreviewError('');
        setDocRetryTick((v) => v + 1);
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.error || 'PDF sayfaları yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [slide.id]);

  // Poll for more images when preview is still generating (previewStatus === 'processing')
  useEffect(() => {
    if (!useImageMode || previewStatus !== 'processing') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/slides/${slide.id}/preview-meta`);
        if (data?.previewMode === 'images' && Array.isArray(data?.pages) && data.pages.length > 0) {
          setPageImages(data.pages);
          setTotalPages(Number(data.totalPages || data.pages.length));
          setPreviewStatus(String(data.previewStatus || ''));
        }
        if (data?.previewStatus === 'ready') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [useImageMode, previewStatus, slide.id]);

  useEffect(() => {
    if (!slide?.id || slide.conversionStatus !== 'done') {
      setLoading(false);
      setLoadError('Bu slayt henüz dönüşümünü tamamlamadı');
      return;
    }
    loadPreview();
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [slide?.id, slide?.conversionStatus, loadPreview]);

  // PDF.js fallback: load document when pdfPreviewUrl changes
  useEffect(() => {
    if (!pdfPreviewUrl || useImageMode) return;
    let cancelled = false;
    setDocLoading(true);
    setPreviewError('');
    setPdfDoc(null);

    loadPdfDocument(pdfPreviewUrl)
      .then((doc) => { if (!cancelled) setPdfDoc(doc); })
      .catch(() => { if (!cancelled) setPreviewError('Önizleme açılamadı. Tekrar dene.'); })
      .finally(() => { if (!cancelled) setDocLoading(false); });

    return () => { cancelled = true; };
  }, [pdfPreviewUrl, useImageMode, docRetryTick]);

  // PDF.js fallback: render page to canvas
  useEffect(() => {
    if (useImageMode || !pdfDoc || !canvasRef.current || !canvasWrapRef.current) return;
    const pageNum = Math.max(1, Math.min(totalPages, activePage));
    const maxWidth = Math.max(360, Math.min(1400, canvasWrapRef.current.clientWidth - 20));
    let cancelled = false;
    setPageRendering(true);
    setPreviewError('');
    renderPageToCanvas(pdfDoc, pageNum, canvasRef.current, maxWidth)
      .catch(() => { if (!cancelled) setPreviewError('Sayfa önizlenemedi.'); })
      .finally(() => { if (!cancelled) setPageRendering(false); });
    return () => { cancelled = true; };
  }, [pdfDoc, activePage, totalPages, useImageMode, viewportTick]);

  useEffect(() => {
    const onResize = () => setViewportTick((v) => v + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const togglePage = useCallback((pageNumber: number) => {
    let shouldWarnLimit = false;
    setSelectedPages((current) => {
      if (current.includes(pageNumber)) return current.filter((n) => n !== pageNumber);
      if (current.length >= 7) { shouldWarnLimit = true; return current; }
      return [...current, pageNumber].sort((a, b) => a - b);
    });
    if (shouldWarnLimit) setLimitToastTick((v) => v + 1);
  }, []);

  useEffect(() => {
    if (limitToastTick > 0) toast.error('En fazla 7 sayfa seçilebilir');
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

  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const currentImage = useMemo(
    () => pageImages.find((p) => p.pageNumber === activePage) || null,
    [pageImages, activePage],
  );

  const activeSelected = selectedPages.includes(activePage);
  const canPrev = activePage > 1;
  const canNext = activePage < pages.length;
  const canSubmit = selectedPages.length >= 3 && title.trim().length > 0;

  // Number of generated pages when still processing
  const generatedCount = pageImages.length;
  const stillGenerating = previewStatus === 'processing' && generatedCount < totalPages;

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
            <p className="text-xs text-muted-foreground mt-0.5">
              "{slide.title}" sunumundan 3-7 sayfa seç
              {stillGenerating && (
                <span className="ml-2 text-amber-500 inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {generatedCount}/{totalPages} sayfa hazır
                </span>
              )}
            </p>
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

          {!loading && !loadError && totalPages > 0 && (
            <div className="p-4">
              {/* Preview area */}
              <div ref={canvasWrapRef} className="border border-border rounded-2xl overflow-hidden bg-black min-h-[62vh] relative">

                {/* Image mode (fast path) */}
                {useImageMode && (
                  <>
                    {currentImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={currentImage.pageNumber}
                        src={currentImage.url}
                        alt={`Sayfa ${activePage}`}
                        className="w-full h-[62vh] object-contain"
                      />
                    ) : (
                      // Page not yet generated — show placeholder
                      <div className="h-[62vh] flex flex-col items-center justify-center text-white/60 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p className="text-sm">Sayfa {activePage} henüz hazırlanıyor...</p>
                      </div>
                    )}
                  </>
                )}

                {/* PDF.js fallback mode (slow path) */}
                {!useImageMode && (
                  <>
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
                  </>
                )}

                {/* Page counter badge */}
                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-bold">
                  {activePage} / {totalPages}
                </div>

                {/* Navigation controls */}
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
                    disabled={useImageMode && !currentImage} // can't select ungenerated page
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-black border transition-colors disabled:opacity-40',
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

              {/* Page grid */}
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

                {/* Selected pages chips */}
                <div className="flex flex-wrap gap-2 mb-3">
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

                {/* All pages grid — show thumbnail for image mode */}
                <p className="text-[11px] text-muted-foreground mb-2">Tüm sayfalar (dokun: önizle / seç)</p>
                <div className="flex flex-wrap gap-2">
                  {pages.map((p) => {
                    const selected = selectedPages.includes(p);
                    const img = pageImages.find((pi) => pi.pageNumber === p);
                    const isActive = activePage === p;

                    // Thumbnail grid item
                    if (useImageMode) {
                      return (
                        <button
                          key={`all-${p}`}
                          type="button"
                          onClick={() => { setActivePage(p); togglePage(p); }}
                          className={cn(
                            'relative w-16 h-12 rounded-lg border overflow-hidden transition-all',
                            selected ? 'border-primary ring-2 ring-primary/40' : 'border-border',
                            isActive ? 'ring-2 ring-primary' : '',
                          )}
                          title={`Sayfa ${p}`}
                        >
                          {img ? (
                            <Image src={img.url} alt={`Sayfa ${p}`} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow">{p}</span>
                          {selected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-[9px] text-white font-black">✓</span>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    }

                    // Number-only fallback (PDF.js mode)
                    return (
                      <button
                        key={`all-${p}`}
                        type="button"
                        onClick={() => { setActivePage(p); togglePage(p); }}
                        className={cn(
                          'h-8 px-3 rounded-lg text-xs font-bold border',
                          selected ? 'bg-primary text-white border-primary' : 'bg-card border-border',
                          isActive ? 'ring-2 ring-primary/50' : '',
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Oluşturuluyor...</>
              ) : (
                <><Play className="w-4 h-4" fill="currentColor" /> Slideo oluştur</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
