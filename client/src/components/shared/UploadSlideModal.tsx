'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { analytics } from '@/lib/analytics';
import { buildSlidePath } from '@/lib/url';

interface Props {
  topicId: number;
  onSuccess: (slide: any) => void;
  onClose: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CONVERSION_TIMEOUT_MS = 180_000; // 3 dakika
type UploadPhase = 'uploading' | 'converting';

function navigateSafely(router: ReturnType<typeof useRouter>, path: string) {
  try {
    router.push(path);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const expectedPath = path.split('?')[0];
        if (window.location.pathname !== expectedPath) {
          window.location.assign(path);
        }
      }
    }, 1200);
  } catch {
    if (typeof window !== 'undefined') {
      window.location.assign(path);
    }
  }
}

export default function UploadSlideModal({ topicId, onSuccess, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [conversionPercent, setConversionPercent] = useState(0);
  const [phase, setPhase] = useState<UploadPhase>('uploading');
  const [conversionStatus, setConversionStatus] = useState<string>('');

  const validateAndSetFile = useCallback((picked: File | null) => {
    if (!picked) return;
    const ext = picked.name.split('.').pop()?.toLowerCase() || '';
    if (!['ppt', 'pptx', 'pdf'].includes(ext)) {
      toast.error('Sadece .ppt, .pptx veya .pdf yükleyebilirsin');
      return;
    }
    if (picked.size > MAX_FILE_SIZE) {
      toast.error('Dosya boyutu 50MB sınırını aşıyor');
      return;
    }
    setFile(picked);
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    validateAndSetFile(accepted[0] || null);
  }, [validateAndSetFile]);

  const onDropRejected = useCallback(() => {
    toast.error('Dosya formatı geçersiz veya dosya 50MB sınırını aşıyor');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!file) return toast.error('Dosya seç');

    const title = form.title.trim();
    if (!title) return toast.error('Başlık gir');

    setLoading(true);
    setUploadPercent(5);
    setConversionPercent(0);
    setPhase('uploading');
    setConversionStatus('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (ext !== 'pdf') {
        void api.get('/health/conversion', { timeout: 1500 })
          .then((health) => {
            const hasLibre = Boolean(health?.data?.converters?.libreOffice);
            const hasPowerPoint = Boolean(health?.data?.converters?.powerPoint);
            if (!hasLibre && !hasPowerPoint) {
              toast('Sunucuda dönüştürücü görünmüyor. Önizleme gecikebilir.', { icon: '⚠️' });
            }
          })
          .catch((healthErr) => {
            console.warn('[upload] conversion health check failed:', healthErr?.message || healthErr);
          });
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title);
      fd.append('description', form.description.trim());
      fd.append('topicId', String(topicId));

      const { data } = await api.post('/slides', fd, {
        onUploadProgress: (ev) => {
          const total = ev.total || file.size || 0;
          if (!total) return;
          const pct = Math.max(1, Math.min(100, Math.round((ev.loaded / total) * 100)));
          setUploadPercent(pct);
        },
      });

      setUploadPercent(100);
      setPhase('converting');
      setConversionPercent(5);

      const startedAt = Date.now();
      const slideId = Number(data?.id);
      let converted = false;

      if (Number.isInteger(slideId) && slideId > 0) {
        while (Date.now() - startedAt < CONVERSION_TIMEOUT_MS) {
          const elapsed = Date.now() - startedAt;
          // Logaritmik eğri: başta hızlı, sonra yavaşlıyor — daha doğal görünür
          const logPct = Math.max(5, Math.min(92, Math.round(Math.log1p(elapsed / 2500) * 30)));
          setConversionPercent((prev) => Math.max(prev, logPct));

          const statusRes = await api.get(`/slides/${slideId}`);
          const status = String(statusRes?.data?.conversionStatus || '');
          setConversionStatus(status);

          if (status === 'done') {
            setConversionPercent(100);
            converted = true;
            break;
          }
          if (status === 'failed') {
            throw new Error(
              statusRes?.data?.conversionJob?.lastError ||
              'PDF dönüşümü başarısız. Sunucuda LibreOffice kurulu olmalı.'
            );
          }
          if (status === 'unsupported') {
            throw new Error('Bu dosya formatı için önizleme desteklenmiyor.');
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        if (!converted) {
          // Timeout — dönüşüm hâlâ devam ediyor olabilir, yine de yönlendir
          toast('Dönüşüm devam ediyor, slayt sayfasına yönlendiriliyorsunuz…', { icon: '⏳' });
        }
      }

      analytics.uploadComplete({ slide_id: data.id, title: data.title });
      if (converted) toast.success('Slayt yüklendi!');
      onSuccess(data);
      onClose();
      if (data?.id) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`slideo:prompt:${data.id}`, '1');
        }
        const slidePath = buildSlidePath({ id: data.id, slug: data.slug, title: data.title });
        navigateSafely(router, `${slidePath}?fromUpload=1`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Yükleme başarısız';
      toast.error(msg);
    } finally {
      setUploadPercent(0);
      setConversionPercent(0);
      setLoading(false);
    }
  };

  // Yükleme = %60, Dönüştürme = %40 payı
  const overallPercent = Math.min(
    100,
    Math.max(0, Math.round(
      phase === 'uploading'
        ? uploadPercent * 0.6
        : 60 + conversionPercent * 0.4
    )),
  );
  const shownPercent = loading ? Math.max(1, overallPercent) : overallPercent;

  const phaseLabel = phase === 'uploading'
    ? `Yükleniyor %${shownPercent}`
    : conversionStatus === 'processing'
      ? `PPTX → PDF dönüştürülüyor %${shownPercent}`
      : `Önizleme hazırlanıyor %${shownPercent}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Slayt Yükle</h2>
          <button
            type="button"
            onClick={!loading ? onClose : undefined}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : file
                ? 'border-green-500 bg-green-500/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-10 h-10" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Upload className="w-10 h-10" />
                <div>
                  <p className="font-medium text-sm">
                    {isDragActive ? 'Dosyayı bırak' : 'Dosyayı sürükle veya tıkla'}
                  </p>
                  <p className="text-xs mt-1">.ppt, .pptx ve .pdf desteklenir · Maks. 50MB</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Başlık <span className="text-primary">*</span>
            </label>
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Slayt başlığı..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Açıklama</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Slaytı kısaca anlat..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm resize-none"
            />
          </div>

          {loading && (
            <div className="space-y-2 bg-muted/40 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{phaseLabel}</span>
                <span className="text-muted-foreground tabular-nums">{shownPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${shownPercent}%` }}
                />
              </div>
              {phase === 'converting' && (
                <p className="text-[11px] text-muted-foreground text-center mt-1">
                  {conversionStatus === 'processing'
                    ? 'LibreOffice ile PPTX → PDF dönüşümü devam ediyor…'
                    : 'Dönüşüm kuyruğuna alındı, bekleniyor…'}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-muted transition text-sm disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? phase === 'uploading' ? 'Yükleniyor…' : 'Dönüştürülüyor…'
                : 'Yükle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
