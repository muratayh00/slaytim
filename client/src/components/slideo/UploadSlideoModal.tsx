'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, ChevronRight, Loader2, Play, Upload, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getApiOrigin } from '@/lib/api-origin';

type Step = 'upload' | 'converting' | 'select';
type ConversionPhase = 'uploading' | 'converting' | 'preparing';

const CONVERSION_TIMEOUT_MS = 180_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface Category {
  id: number;
  name: string;
}

interface PageImage {
  pageNumber: number;
  url: string;
  width?: number;
  height?: number;
}

interface PreviewMeta {
  pageCount: number;
  previewUrl: string;
}

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export default function UploadSlideoModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('upload');

  const [file, setFile] = useState<File | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [slideId, setSlideId] = useState<number | null>(null);
  const [conversionFailed, setConversionFailed] = useState(false);
  const [conversionTimedOut, setConversionTimedOut] = useState(false);
  const [conversionPhase, setConversionPhase] = useState<ConversionPhase>('uploading');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversionStartedAtRef = useRef<number>(0);
  const pollErrorCountRef = useRef(0);

  // Image-based preview (fast path)
  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  const [imgTotalPages, setImgTotalPages] = useState(0);
  const [imgPreviewStatus, setImgPreviewStatus] = useState('');

  // PDF iframe fallback (slow path)
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta | null>(null);
  const [previewFrameLoading, setPreviewFrameLoading] = useState(false);
  const [previewCacheKey, setPreviewCacheKey] = useState('');

  const [activePage, setActivePage] = useState(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  const [slideoTitle, setSlideoTitle] = useState('');
  const [slideoDesc, setSlideoDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Whether we're showing image thumbnails or PDF iframe
  const useImageMode = pageImages.length > 0;

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (imgPollRef.current) clearInterval(imgPollRef.current);
    },
    [],
  );

  // Poll for progressive image generation when previewStatus === 'processing'
  useEffect(() => {
    if (!useImageMode || imgPreviewStatus !== 'processing' || !slideId) {
      if (imgPollRef.current) { clearInterval(imgPollRef.current); imgPollRef.current = null; }
      return;
    }
    if (imgPollRef.current) return;

    imgPollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/slides/${slideId}/preview-meta`);
        if (data?.previewMode === 'images' && Array.isArray(data?.pages) && data.pages.length > 0) {
          setPageImages(data.pages);
          setImgTotalPages(Number(data.totalPages || data.pages.length));
          setImgPreviewStatus(String(data.previewStatus || ''));
        }
        if (data?.previewStatus === 'ready') {
          if (imgPollRef.current) { clearInterval(imgPollRef.current); imgPollRef.current = null; }
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => {
      if (imgPollRef.current) { clearInterval(imgPollRef.current); imgPollRef.current = null; }
    };
  }, [useImageMode, imgPreviewStatus, slideId]);

  const validateAndSetFile = useCallback(
    (picked: File | null) => {
      if (!picked) return false;
      const ext = picked.name.split('.').pop()?.toLowerCase();
      if (!['ppt', 'pptx'].includes(ext || '')) {
        toast.error('Sadece .ppt veya .pptx yuklenebilir');
        return false;
      }
      if (picked.size > MAX_FILE_SIZE) {
        toast.error('Dosya boyutu 50MB sinirini asiyor');
        return false;
      }
      setFile(picked);
      if (!slideTitle) setSlideTitle(picked.name.replace(/\.[^.]+$/, ''));
      return true;
    },
    [slideTitle],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndSetFile(e.dataTransfer.files[0] || null);
    },
    [validateAndSetFile],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const accepted = validateAndSetFile(e.target.files?.[0] || null);
    if (!accepted) e.currentTarget.value = '';
  };

  const resetToUpload = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (imgPollRef.current) { clearInterval(imgPollRef.current); imgPollRef.current = null; }
    setStep('upload');
    setConversionPhase('uploading');
    setSessionId(null);
    setSlideId(null);
    setConversionFailed(false);
    setConversionTimedOut(false);
    setUploadProgress(0);
    setConversionProgress(0);
    setDisplayProgress(0);
    setPageImages([]);
    setImgTotalPages(0);
    setImgPreviewStatus('');
    setPreviewMeta(null);
    setActivePage(1);
    setSelectedPages([]);
    setPreviewFrameLoading(false);
    setPreviewCacheKey('');
  }, []);

  const loadPreviewMeta = useCallback(async (id: number, resolvedSlideId?: number) => {
    const { data } = await api.get(`/slideo-v3/session/${id}/preview-meta`);
    const pageCount = Math.max(1, Number(data?.pageCount || 0));
    const sId = resolvedSlideId || Number(data?.slideId || 0) || null;

    setSlideId(sId);
    setActivePage(1);
    setSelectedPages([]);

    // Try the fast path: check if WebP preview images are ready for this slide
    if (sId) {
      try {
        const { data: imgData } = await api.get(`/slides/${sId}/preview-meta`);
        if (imgData?.previewMode === 'images' && Array.isArray(imgData?.pages) && imgData.pages.length > 0) {
          setPageImages(imgData.pages);
          setImgTotalPages(Number(imgData.totalPages || imgData.pages.length));
          setImgPreviewStatus(String(imgData.previewStatus || ''));
          setStep('select');
          return;
        }
      } catch { /* not ready yet — fall through to PDF iframe */ }
    }

    // Fall back to PDF iframe
    const previewUrl = String(data?.previewUrl || '').trim();
    if (!previewUrl) throw new Error('Preview URL missing');

    const apiOrigin = getApiOrigin();
    const absolutePreview = previewUrl.startsWith('http')
      ? previewUrl
      : `${apiOrigin}${previewUrl.startsWith('/') ? '' : '/'}${previewUrl}`;

    setPreviewMeta({ pageCount, previewUrl: absolutePreview });
    setPreviewFrameLoading(true);
    setPreviewCacheKey(String(Date.now()));
    setStep('select');
  }, []);

  const startPolling = useCallback(
    (id: number, resolvedSlideId?: number) => {
      conversionStartedAtRef.current = Date.now();
      setConversionFailed(false);
      setConversionTimedOut(false);
      setConversionPhase('converting');
      setConversionProgress(35);
      setDisplayProgress(35);
      pollErrorCountRef.current = 0;

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const elapsed = Date.now() - conversionStartedAtRef.current;
          if (elapsed > CONVERSION_TIMEOUT_MS) {
            if (pollRef.current) clearInterval(pollRef.current);
            setConversionTimedOut(true);
            return;
          }
          const timedProgress = Math.max(35, Math.min(90, Math.round(35 + (elapsed / CONVERSION_TIMEOUT_MS) * 55)));
          setConversionProgress((prev) => Math.max(prev, timedProgress));

          const { data } = await api.get(`/slideo-v3/session/${id}/status`);
          const status = String(data?.status || '');
          if (status === 'done') {
            if (pollRef.current) clearInterval(pollRef.current);
            setConversionPhase('preparing');
            setConversionProgress(100);
            await loadPreviewMeta(id, resolvedSlideId);
            return;
          }
          if (status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setConversionFailed(true);
            toast.error(data?.error || 'Donusum basarisiz');
          }
        } catch (err: any) {
          pollErrorCountRef.current += 1;
          if (pollErrorCountRef.current >= 5) {
            if (pollRef.current) clearInterval(pollRef.current);
            setConversionFailed(true);
            toast.error(err?.response?.data?.error || 'Donusum durumu alinamiyor');
          }
        }
      }, 2000);
    },
    [loadPreviewMeta],
  );

  const handleUpload = async () => {
    if (!file || !slideTitle.trim() || !categoryId || uploading) return;

    setUploading(true);
    setStep('converting');
    setConversionPhase('uploading');
    setUploadProgress(5);
    setConversionProgress(0);
    setDisplayProgress(5);
    setConversionFailed(false);
    setConversionTimedOut(false);
    setSessionId(null);
    setSlideId(null);
    setPageImages([]);
    setImgTotalPages(0);
    setImgPreviewStatus('');
    setPreviewMeta(null);
    setPreviewFrameLoading(false);
    setPreviewCacheKey('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slideTitle', slideTitle.trim());
      fd.append('topicTitle', topicTitle.trim());
      fd.append('categoryId', categoryId);

      const { data } = await api.post('/slideo-v3/session', fd, {
        onUploadProgress: (ev) => {
          const total = ev.total || file.size || 0;
          if (!total) return;
          const pct = Math.max(5, Math.min(35, Math.round((ev.loaded / total) * 35)));
          setUploadProgress(pct);
        },
      });

      setUploadProgress(35);
      const createdSessionId = Number(data?.sessionId || 0);
      const createdSlideId = Number(data?.slideId || 0) || undefined;
      setSessionId(createdSessionId || null);
      setSlideId(createdSlideId || null);

      if (String(data?.status) === 'failed') {
        setConversionFailed(true);
        toast.error(data?.error || 'Donusum baslatilamadi');
        return;
      }

      if (!createdSessionId) {
        setConversionFailed(true);
        toast.error('Session olusturulamadi');
        return;
      }
      startPolling(createdSessionId, createdSlideId);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Yukleme basarisiz');
      setStep('upload');
    } finally {
      setUploading(false);
    }
  };

  const togglePage = useCallback((pageNumber: number) => {
    setSelectedPages((prev) => {
      if (prev.includes(pageNumber)) return prev.filter((n) => n !== pageNumber);
      if (prev.length >= 7) {
        toast.error('En fazla 7 sayfa secilebilir');
        return prev;
      }
      return [...prev, pageNumber].sort((a, b) => a - b);
    });
  }, []);

  const handleSubmit = async () => {
    if (!slideoTitle.trim()) {
      toast.error('Slideo basligi gerekli');
      return;
    }
    if (selectedPages.length < 3 || selectedPages.length > 7) {
      toast.error('3-7 arasi sayfa secmelisin');
      return;
    }
    if (!sessionId) return;

    setSubmitting(true);
    try {
      await api.post(`/slideo-v3/session/${sessionId}/publish`, {
        title: slideoTitle.trim(),
        description: slideoDesc.trim() || null,
        pageIndices: selectedPages,
        coverPage: selectedPages[0],
      });
      toast.success('Slideo olusturuldu');
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Slideo olusturulamadi');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== 'converting' || conversionFailed || conversionTimedOut) {
      setDisplayProgress((prev) => Math.max(prev, Math.round(Math.max(uploadProgress, conversionProgress))));
      return;
    }
    const combined = Math.round(Math.max(uploadProgress, conversionProgress));
    setDisplayProgress((prev) => Math.max(prev, Math.max(3, combined)));
  }, [step, conversionFailed, conversionTimedOut, uploadProgress, conversionProgress]);

  // Total page count: use imgTotalPages in image mode, previewMeta.pageCount otherwise
  const totalPages = useImageMode ? imgTotalPages : (previewMeta?.pageCount || 0);
  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const previewSrc = useMemo(() => {
    if (!previewMeta || !slideId) return '';
    const cacheKey = previewCacheKey || 'v3';
    return `${previewMeta.previewUrl}?session=${cacheKey}#page=${activePage}&zoom=page-fit`;
  }, [previewMeta, slideId, activePage, previewCacheKey]);

  const currentImage = useMemo(
    () => pageImages.find((p) => p.pageNumber === activePage) || null,
    [pageImages, activePage],
  );

  const canPrev = activePage > 1;
  const canNext = activePage < totalPages;
  const generatedCount = pageImages.length;
  const stillGenerating = useImageMode && imgPreviewStatus === 'processing' && generatedCount < imgTotalPages;

  const steps: Step[] = ['upload', 'converting', 'select'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg shadow-card w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" fill="currentColor" />
              Slideo Olustur
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {step === 'upload' && 'PPT/PPTX yukle'}
              {step === 'converting' && 'LibreOffice ile sayfa onizlemeleri hazirlaniyor'}
              {step === 'select' && '3-7 sayfa sec ve Slideo olustur'}
              {step === 'select' && stillGenerating && (
                <span className="text-amber-500 inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {generatedCount}/{imgTotalPages} sayfa hazir
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3 pb-2 shrink-0">
          {steps.map((s, i) => {
            const done = steps.indexOf(step) > i;
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center transition-colors',
                    active ? 'bg-primary text-white' : done ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('h-0.5 w-6 rounded-full transition-colors', done ? 'bg-primary/40' : 'bg-muted')} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="p-5 space-y-3">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  file ? 'border-primary/40 bg-primary/5' : '',
                )}
              >
                <input ref={fileInputRef} type="file" accept=".ppt,.pptx" className="hidden" onChange={handleFileSelect} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-primary">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setSlideTitle('');
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
                    >
                      Degistir
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm font-semibold text-muted-foreground">PPT/PPTX surukle birak veya tikla</p>
                    <p className="text-xs text-muted-foreground/60">.ppt .pptx - maks 50 MB</p>
                  </div>
                )}
              </div>

              <input
                value={slideTitle}
                onChange={(e) => setSlideTitle(e.target.value)}
                placeholder="Sunum basligi *"
                maxLength={120}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
              />

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
              >
                <option value="">Kategori sec *</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Konu adi (opsiyonel)"
                maxLength={100}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
              />
            </div>
          )}

          {step === 'converting' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              {conversionFailed ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-destructive" />
                  <p className="text-sm font-bold text-destructive">Donusum basarisiz</p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">LibreOffice onizleme hazirlayamadi.</p>
                </>
              ) : conversionTimedOut ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <p className="text-sm font-bold text-amber-500">Donusum cok uzun surdu</p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">Geri donup tekrar deneyebilirsin.</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm font-bold">
                    {conversionPhase === 'uploading' && 'Dosya yukleniyor...'}
                    {conversionPhase === 'converting' && 'LibreOffice donusumu yapiliyor...'}
                    {conversionPhase === 'preparing' && 'Sayfa onizleme bilgisi hazirlaniyor...'}
                  </p>
                  <div className="w-full max-w-xs">
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-200" style={{ width: `${displayProgress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">%{displayProgress}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'select' && totalPages > 0 && (
            <div className="p-4 space-y-3">
              {/* Main preview area */}
              <div className="border border-border rounded-xl overflow-hidden bg-black min-h-[52vh] relative">
                {/* Image mode (fast path) */}
                {useImageMode && (
                  currentImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={currentImage.pageNumber}
                      src={currentImage.url}
                      alt={`Sayfa ${activePage}`}
                      className="w-full h-[52vh] object-contain"
                    />
                  ) : (
                    <div className="h-[52vh] flex flex-col items-center justify-center text-white/60 gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-sm">Sayfa {activePage} henuz hazirlaniyor...</p>
                    </div>
                  )
                )}

                {/* PDF iframe fallback (slow path) */}
                {!useImageMode && (
                  <>
                    {previewFrameLoading && (
                      <div className="absolute inset-0 z-10 bg-card/80 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sayfa onizleme yukleniyor...
                      </div>
                    )}
                    <iframe
                      title="Slideo page preview"
                      src={previewSrc}
                      className="w-full h-[52vh]"
                      onLoad={() => setPreviewFrameLoading(false)}
                    />
                  </>
                )}

                {/* Page counter */}
                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-bold">
                  {activePage} / {totalPages}
                </div>

                {/* Navigation */}
                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => canPrev && setActivePage((p) => p - 1)}
                    disabled={!canPrev}
                    className="px-3 py-2 rounded-xl bg-black/65 text-white text-xs font-bold border border-white/20 disabled:opacity-35"
                  >
                    Onceki
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePage(activePage)}
                    disabled={useImageMode && !currentImage}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-black border transition-colors disabled:opacity-40',
                      selectedPages.includes(activePage)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-black/65 text-white border-white/20',
                    )}
                  >
                    {selectedPages.includes(activePage) ? 'Secimden Cikar' : 'Bu Sayfayi Sec'}
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
              <div className="border border-border rounded-xl bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Secilen: {selectedPages.length}/7 {selectedPages.length < 3 ? '(en az 3)' : ''}
                  </p>
                  <button onClick={() => setSelectedPages([])} className="text-xs text-muted-foreground hover:text-foreground underline">
                    Temizle
                  </button>
                </div>

                {/* Selected page chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedPages.length === 0 && (
                    <span className="text-xs text-muted-foreground">Henuz sayfa secilmedi</span>
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

                {/* All pages */}
                <p className="text-[11px] text-muted-foreground mb-2">Tum sayfalar (dokun: onizle / sec)</p>
                <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto pr-1">
                  {pages.map((p) => {
                    const selected = selectedPages.includes(p);
                    const img = pageImages.find((pi) => pi.pageNumber === p);
                    const isActive = activePage === p;

                    if (useImageMode) {
                      return (
                        <button
                          key={p}
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
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.url} alt={`Sayfa ${p}`} className="w-full h-full object-cover" />
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

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setActivePage(p);
                          togglePage(p);
                          if (!useImageMode) setPreviewFrameLoading(true);
                        }}
                        className={cn(
                          'h-10 rounded-lg border text-xs font-bold transition-colors px-3',
                          isActive ? 'border-primary' : 'border-border',
                          selected ? 'bg-primary text-white' : 'bg-muted/40 hover:bg-muted',
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

        <div className="border-t border-border px-5 py-4 shrink-0">
          {step === 'converting' && (
            <button
              onClick={resetToUpload}
              className="w-full py-2.5 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted"
            >
              Geri don
            </button>
          )}

          {step === 'upload' && (
            <button
              onClick={handleUpload}
              disabled={!file || !slideTitle.trim() || !categoryId || uploading}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Yukleniyor...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" /> Yukle ve devam et
                </>
              )}
            </button>
          )}

          {step === 'select' && (
            <div className="space-y-3">
              <input
                value={slideoTitle}
                onChange={(e) => setSlideoTitle(e.target.value)}
                placeholder="Slideo basligi *"
                maxLength={80}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
              />
              <input
                value={slideoDesc}
                onChange={(e) => setSlideoDesc(e.target.value)}
                placeholder="Kisa aciklama (opsiyonel)"
                maxLength={200}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50"
              />
              <button
                onClick={handleSubmit}
                disabled={selectedPages.length < 3 || !slideoTitle.trim() || submitting}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Olusturuluyor...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" /> Slideo olustur
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
