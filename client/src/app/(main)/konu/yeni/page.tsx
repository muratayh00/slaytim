'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, FileText, AlertCircle, Search, Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { buildTopicPath, slugifyTr } from '@/lib/url';
import { cn } from '@/lib/utils';

const TITLE_MAX = 200;
const DESC_MAX = 1000;
const RECENT_MAIN_CATEGORY_KEY = 'slaytim:recent-main-categories:v1';

type Category = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  isMain?: boolean;
  sortOrder?: number;
  topicCount?: number;
};

function navigateSafely(router: ReturnType<typeof useRouter>, path: string) {
  try {
    router.push(path);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const expectedPath = path.split('?')[0];
        if (window.location.pathname !== expectedPath) window.location.assign(path);
      }
    }, 1200);
  } catch {
    if (typeof window !== 'undefined') window.location.assign(path);
  }
}

function CategoryPicker({
  categories,
  loading,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  categories: Category[];
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = categories.find((c) => String(c.id) === value);

  const filtered = query.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : categories;

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const select = (cat: Category) => {
    onChange(String(cat.id));
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-background text-sm transition-all disabled:opacity-60',
          open ? 'border-primary/50 ring-2 ring-primary/30' : 'border-border hover:border-border/80'
        )}
      >
        <span className={cn(!selected && 'text-muted-foreground')}>
          {loading ? 'Kategoriler yükleniyor...' : selected ? selected.name : placeholder || 'Kategori seç...'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
                if (e.key === 'Enter' && filtered.length === 1) select(filtered[0]);
              }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground text-xs">
                x
              </button>
            )}
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-2.5 text-sm text-muted-foreground">Sonuc bulunamadi</li>
            ) : (
              filtered.map((cat) => {
                const isSelected = String(cat.id) === value;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => select(cat)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted',
                        isSelected && 'font-semibold text-primary'
                      )}
                    >
                      {cat.name}
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function NewTopicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuthStore();

  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catError, setCatError] = useState(false);
  const [catLoading, setCatLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    mainCategoryId: '',
    subcategoryId: '',
  });
  const [recentMainCategoryIds, setRecentMainCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const roomId = searchParams.get('roomId');

  const subcategories = useMemo(() => {
    const mainId = Number(form.mainCategoryId);
    if (!Number.isInteger(mainId) || mainId <= 0) return [];
    return allCategories
      .filter((c) => c.parentId === mainId)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
  }, [allCategories, form.mainCategoryId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_MAIN_CATEGORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const ids = parsed.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0).slice(0, 3);
      setRecentMainCategoryIds(ids);
    } catch {
      // Ignore malformed localStorage value.
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigateSafely(router, '/login');
  }, [user, isLoading, router]);

  const loadCategories = () => {
    setCatLoading(true);
    setCatError(false);
    api
      .get('/categories?tree=1')
      .then((r) => {
        const mains = Array.isArray(r?.data?.mainCategories)
          ? r.data.mainCategories.map((x: any) => ({
              id: Number(x.id),
              name: String(x.name || ''),
              slug: String(x.slug || ''),
              parentId: x.parentId == null ? null : Number(x.parentId),
              isMain: Boolean(x.isMain ?? true),
              sortOrder: Number(x.sortOrder || 0),
              topicCount: Number(x?._count?.topics || 0),
            }))
          : [];

        const all = Array.isArray(r?.data?.categories)
          ? r.data.categories.map((x: any) => ({
              id: Number(x.id),
              name: String(x.name || ''),
              slug: String(x.slug || ''),
              parentId: x.parentId == null ? null : Number(x.parentId),
              isMain: Boolean(x.isMain ?? false),
              sortOrder: Number(x.sortOrder || 0),
              topicCount: Number(x?._count?.topics || 0),
            }))
          : [];

        setMainCategories(mains);
        setAllCategories(all);
        setCatError(false);
      })
      .catch(() => {
        setMainCategories([]);
        setAllCategories([]);
        setCatError(true);
      })
      .finally(() => setCatLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }
    api
      .get(`/rooms/${roomId}`)
      .then((r) => setRoom(r.data))
      .catch(() => setRoom(null));
  }, [roomId]);

  const topMainCategories = useMemo(
    () =>
      [...mainCategories]
        .sort((a, b) => Number(b.topicCount || 0) - Number(a.topicCount || 0))
        .slice(0, 5),
    [mainCategories],
  );

  const recentMainCategories = useMemo(() => {
    if (!recentMainCategoryIds.length) return [];
    return recentMainCategoryIds
      .map((id) => mainCategories.find((c) => c.id === id))
      .filter((c): c is Category => Boolean(c));
  }, [mainCategories, recentMainCategoryIds]);

  const selectMainCategory = (id: string) => {
    const numeric = Number(id);
    setForm((prev) => ({
      ...prev,
      mainCategoryId: id,
      subcategoryId: '',
    }));
    if (!Number.isInteger(numeric) || numeric <= 0) return;
    const merged = [numeric, ...recentMainCategoryIds.filter((x) => x !== numeric)].slice(0, 3);
    setRecentMainCategoryIds(merged);
    try {
      window.localStorage.setItem(RECENT_MAIN_CATEGORY_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage failures.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Baslik zorunludur');
    if (!form.mainCategoryId) return toast.error('Lutfen bir ana kategori sec');

    setLoading(true);
    try {
      const payload: any = {
        title: form.title.trim().slice(0, TITLE_MAX),
        description: form.description.trim().slice(0, DESC_MAX) || undefined,
        mainCategoryId: Number(form.mainCategoryId),
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : undefined,
      };

      if (roomId) {
        const rid = Number(roomId);
        if (Number.isInteger(rid) && rid > 0) payload.roomId = rid;
      }

      const { data } = await api.post('/topics', payload);
      toast.success('Konu basariyla acildi');
      const targetPath = buildTopicPath({ id: data.id, slug: data.slug, title: data.title });
      navigateSafely(router, targetPath);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Konu acilamadi');
    } finally {
      setLoading(false);
    }
  };

  const titleLen = form.title.length;
  const descLen = form.description.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href={roomId ? `/rooms/${roomId}` : '/kesfet'}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {roomId ? 'Odaya don' : 'Konulara don'}
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Yeni Konu Ac</h1>
            <p className="text-sm text-muted-foreground">Ana kategori sec, alt kategoriyi ister duzenle ister bos birak.</p>
          </div>
        </div>

        <div className="h-px bg-border my-6" />

        {roomId && (
          <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="font-semibold">Oda modu:</span>{' '}
            <span className="text-muted-foreground">{room?.name ? `"${room.name}"` : 'Secili oda'} icin konu aciyorsun.</span>
          </div>
        )}

        {catError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-start gap-2.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Kategoriler yuklenemedi.{' '}
              <button type="button" className="underline font-semibold" onClick={loadCategories}>
                Tekrar dene
              </button>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">
                Baslik <span className="text-primary">*</span>
              </label>
              <span className={`text-xs tabular-nums ${titleLen > TITLE_MAX * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {titleLen}/{TITLE_MAX}
              </span>
            </div>
            <input
              required
              maxLength={TITLE_MAX}
              placeholder="Konu basligini yaz..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm disabled:opacity-60"
            />
            {form.title.trim() && (
              <p className="text-xs text-muted-foreground mt-1.5">
                URL: <span className="font-mono text-foreground/70">slaytim.com/konular/{slugifyTr(form.title)}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">Aciklama</label>
              <span className={`text-xs tabular-nums ${descLen > DESC_MAX * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {descLen}/{DESC_MAX}
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={DESC_MAX}
              placeholder="Konuyu kisaca acikla..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm resize-none disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold">
              Ana kategori <span className="text-primary">*</span>
            </label>
            {recentMainCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {recentMainCategories.map((cat) => (
                  <button
                    key={`recent-${cat.id}`}
                    type="button"
                    onClick={() => selectMainCategory(String(cat.id))}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      String(cat.id) === form.mainCategoryId
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80',
                    )}
                  >
                    Son secilen: {cat.name}
                  </button>
                ))}
              </div>
            )}
            {topMainCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {topMainCategories.map((cat) => (
                  <button
                    key={`top-${cat.id}`}
                    type="button"
                    onClick={() => selectMainCategory(String(cat.id))}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      String(cat.id) === form.mainCategoryId
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <CategoryPicker
              categories={mainCategories}
              loading={catLoading}
              value={form.mainCategoryId}
              onChange={selectMainCategory}
              disabled={loading}
              placeholder="Ana kategori sec..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold">
              Alt kategori <span className="text-muted-foreground font-normal">(opsiyonel)</span>
            </label>
            <CategoryPicker
              categories={subcategories}
              loading={catLoading}
              value={form.subcategoryId}
              onChange={(id) => setForm((prev) => ({ ...prev, subcategoryId: id }))}
              disabled={loading || !form.mainCategoryId || subcategories.length === 0}
              placeholder={subcategories.length ? 'Alt kategori sec...' : 'Bu ana kategori icin alt kategori yok'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || catLoading}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Yayinlaniyor...
              </>
            ) : (
              'Konuyu Yayinla'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function NewTopicPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Yükleniyor...
        </div>
      }
    >
      <NewTopicContent />
    </Suspense>
  );
}
