'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import TopicCard from '@/components/shared/TopicCard';
import { TopicCardSkeleton } from '@/components/shared/Skeleton';
import { useAuthStore } from '@/store/auth';
import { buildTopicCreatePath } from '@/lib/url';

const SORTS = [
  { value: 'latest', label: 'Yeni' },
  { value: 'popular', label: 'Popüler' },
  { value: 'views', label: 'Çok Görüntülenen' },
];

function TopicsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [topics, setTopics] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const categoriesLoadedRef = useRef(false);

  const sort = searchParams.get('sort') || 'latest';
  const category = searchParams.get('category') || '';

  // Kategoriler bir kez yükle
  useEffect(() => {
    if (categoriesLoadedRef.current) return;
    categoriesLoadedRef.current = true;
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/topics?sort=${sort}&category=${category}&page=${page}&limit=12`);
        setTopics(data.topics || []);
        setPages(data.pages || 1);
      } catch { setTopics([]); }
      finally { setLoading(false); }
    };
    load();
  }, [sort, category, page]);

  const update = (params: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.push(`/topics?${next}`);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">Konular</h1>
          <p className="text-sm text-muted-foreground">Topluluğun paylaştığı tüm konuları keşfet</p>
        </div>
        {user && (
          <Link
            href={buildTopicCreatePath()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:shadow-primary/25 text-sm"
          >
            <Plus className="w-4 h-4" />
            Konu Aç
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filtrele & Sırala</span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => update({ sort: s.value })}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  sort === s.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => update({ category: '' })}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all ${
                !category ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              Tümü
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => update({ category: c.slug })}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  category === c.slug ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <TopicCardSkeleton key={i} />)}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <p className="text-xl font-extrabold mb-2">Konu bulunamadı</p>
          <p className="text-sm mb-6">Filtreni değiştir veya ilk konuyu aç</p>
          {user && (
            <Link href={buildTopicCreatePath()} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
              Konu Aç
            </Link>
          )}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            {topics.map((t) => <TopicCard key={t.id} topic={t} />)}
          </motion.div>

          {pages > 1 && (
            <div className="flex justify-center gap-2">
              {[...Array(pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                    page === i + 1
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'border border-border hover:bg-muted hover:border-primary/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TopicsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="skeleton h-10 w-48 rounded-xl mb-8" />
        <div className="skeleton h-20 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <TopicCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <TopicsContent />
    </Suspense>
  );
}
