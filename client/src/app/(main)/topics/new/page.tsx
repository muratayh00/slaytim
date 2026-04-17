'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { buildTopicPath } from '@/lib/url';

const TITLE_MAX = 200;
const DESC_MAX  = 1000;

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

function NewTopicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuthStore();

  const [categories, setCategories]       = useState<any[]>([]);
  const [catError, setCatError]           = useState(false);
  const [catLoading, setCatLoading]       = useState(true);
  const [room, setRoom]                   = useState<any>(null);
  const [form, setForm]                   = useState({ title: '', description: '', categoryId: '' });
  const [loading, setLoading]             = useState(false);

  const roomId = searchParams.get('roomId');

  /* Auth guard */
  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  /* Load categories */
  useEffect(() => {
    setCatLoading(true);
    setCatError(false);
    api.get('/categories')
      .then((r) => {
        setCategories(Array.isArray(r.data) ? r.data : []);
        setCatError(false);
      })
      .catch(() => {
        setCategories([]);
        setCatError(true);
      })
      .finally(() => setCatLoading(false));
  }, []);

  /* Load room info */
  useEffect(() => {
    if (!roomId) { setRoom(null); return; }
    api.get(`/rooms/${roomId}`)
      .then((r) => setRoom(r.data))
      .catch(() => setRoom(null));
  }, [roomId]);

  /* Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Başlık zorunludur');
    if (!form.categoryId) return toast.error('Lütfen bir kategori seç');
    setLoading(true);
    try {
      const payload: any = {
        title: form.title.trim().slice(0, TITLE_MAX),
        description: form.description.trim().slice(0, DESC_MAX) || undefined,
        categoryId: form.categoryId,
      };
      if (roomId) {
        const rid = Number(roomId);
        if (Number.isInteger(rid) && rid > 0) payload.roomId = rid;
      }
      const { data } = await api.post('/topics', payload);
      toast.success('Konu başarıyla açıldı!');
      const targetPath = buildTopicPath({ id: data.id, slug: data.slug, title: data.title });
      navigateSafely(router, targetPath);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Konu açılamadı');
    } finally {
      setLoading(false);
    }
  };

  const titleLen = form.title.length;
  const descLen  = form.description.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href={roomId ? `/rooms/${roomId}` : '/kesfet'}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {roomId ? 'Odaya dön' : 'Konulara dön'}
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Yeni Konu Aç</h1>
            <p className="text-sm text-muted-foreground">Konunu oluştur ve topluluğunla paylaş.</p>
          </div>
        </div>

        <div className="h-px bg-border my-6" />

        {/* Room mode banner */}
        {roomId && (
          <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="font-semibold">Oda modu:</span>{' '}
            <span className="text-muted-foreground">
              {room?.name ? `"${room.name}"` : 'Seçili oda'} için konu açıyorsun.
            </span>
          </div>
        )}

        {/* Category load error */}
        {catError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-start gap-2.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Kategoriler yüklenemedi.{' '}
              <button
                type="button"
                className="underline font-semibold"
                onClick={() => {
                  setCatError(false);
                  setCatLoading(true);
                  api.get('/categories')
                    .then((r) => { setCategories(Array.isArray(r.data) ? r.data : []); setCatError(false); })
                    .catch(() => setCatError(true))
                    .finally(() => setCatLoading(false));
                }}
              >
                Tekrar dene
              </button>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">
                Başlık <span className="text-primary">*</span>
              </label>
              <span className={`text-xs tabular-nums ${titleLen > TITLE_MAX * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {titleLen}/{TITLE_MAX}
              </span>
            </div>
            <input
              required
              maxLength={TITLE_MAX}
              placeholder="Konu başlığını yaz..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm disabled:opacity-60"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">
                Açıklama <span className="text-muted-foreground font-normal">(opsiyonel)</span>
              </label>
              <span className={`text-xs tabular-nums ${descLen > DESC_MAX * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {descLen}/{DESC_MAX}
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={DESC_MAX}
              placeholder="Konuyu kısaca açıkla..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm resize-none disabled:opacity-60"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold">
              Kategori <span className="text-primary">*</span>
            </label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              disabled={loading || catLoading}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm disabled:opacity-60"
            >
              <option value="">
                {catLoading ? 'Kategoriler yükleniyor…' : 'Kategori seç...'}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || catLoading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Yayınlanıyor…
              </>
            ) : (
              'Konuyu Yayınla'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function NewTopicPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-10 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Yükleniyor...
      </div>
    }>
      <NewTopicContent />
    </Suspense>
  );
}

