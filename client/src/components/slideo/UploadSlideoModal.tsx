'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, ChevronRight, Loader2, Play, Upload, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'converting' | 'select';
type ConversionPhase = 'uploading' | 'converting' | 'preparing';

const CONVERSION_TIMEOUT_MS = 180_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface Category {
  id: number;
  name: string;
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
  const conversionStartedAtRef = useRef<number>(0);
  const pollErrorCountRef = useRef(0);

  const [previewMeta, setPreviewMeta] = useState<PreviewMeta | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [previewFrameLoading, setPreviewFrameLoading] = useState(false);
  const [previewCacheKey, setPreviewCacheKey] = useState('');

  const [slideoTitle, setSlideoTitle] = useState('');
  const [slideoDesc, setSlideoDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

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
    setStep('upload');
    setConversionPhase('uploading');
    setSessionId(null);
    setSlideId(null);
    setConversionFailed(false);
    setConversionTimedOut(false);
    setUploadProgress(0);
    setConversionProgress(0);
    setDisplayProgress(0);
    setPreviewMeta(null);
    setActivePage(1);
    setSelectedPages([]);
    setPreviewFrameLoading(false);
    setPreviewCacheKey('');
  }, []);

  const loadPreviewMeta = useCallback(async (id: number) => {
    const { data } = await api.get(`/slideo-v3/session/${id}/preview-meta`);
    const pageCount = Math.max(1, Number(data?.pageCount || 0));
    const previewUrl = String(data?.previewUrl || '').trim();
    if (!previewUrl) throw new Error('Preview URL missing');

    const apiBase = String(api.defaults.baseURL || 'http://localhost:5001/api').replace(/\/+$/, '');
    const apiOrigin = apiBase.replace(/\/api\/?$/, '');
    const absolutePreview = previewUrl.startsWith('http')
      ? previewUrl
      : `${apiOrigin}${previewUrl.startsWith('/') ? '' : '/'}${previewUrl}`;

    setPreviewMeta({ pageCount, previewUrl: absolutePreview });
    setSlideId(Number(data?.slideId || 0) || null);
    setActivePage(1);
    setSelectedPages([]);
    setPreviewFrameLoading(true);
    setPreviewCacheKey(String(Date.now()));
    setStep('select');
  }, []);

  const startPolling = useCallback(
    (id: number) => {
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
            await loadPreviewMeta(id);
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
      setSessionId(createdSessionId || null);
      setSlideId(Number(data?.slideId || 0) || null);

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
      startPolling(createdSessionId);
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

  const pages = useMemo(() => {
    const total = previewMeta?.pageCount || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [previewMeta?.pageCount]);

  const previewSrc = useMemo(() => {
    if (!previewMeta || !slideId) return '';
    const cacheKey = previewCacheKey || 'v3';
    return `${previewMeta.previewUrl}?session=${cacheKey}#page=${activePage}&zoom=page-fit`;
  }, [previewMeta, slideId, activePage, previewCacheKey]);

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
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 'upload' && 'PPT/PPTX yukle'}
              {step === 'converting' && 'LibreOffice ile sayfa onizlemeleri hazirlaniyor'}
              {step === 'select' && '3-7 sayfa sec ve Slideo olustur'}
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

          {step === 'select' && previewMeta && (
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 border border-border rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Secilen: {selectedPages.length}/7 {selectedPages.length < 3 ? '(en az 3)' : ''}
                  </p>
                  <button onClick={() => setSelectedPages([])} className="text-xs text-muted-foreground hover:text-foreground underline">
                    Temizle
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-[45vh] overflow-y-auto pr-1">
                  {pages.map((page) => {
                    const selected = selectedPages.includes(page);
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          setActivePage(page);
                          togglePage(page);
                        }}
                        className={cn(
                          'h-10 rounded-lg border text-xs font-bold transition-colors',
                          activePage === page ? 'border-primary' : 'border-border',
                          selected ? 'bg-primary text-white' : 'bg-muted/40 hover:bg-muted',
                        )}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2 border border-border rounded-xl overflow-hidden bg-muted/20 min-h-[52vh] relative">
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
