'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layers, Presentation, ArrowRight, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { buildProfilePath } from '@/lib/url';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';

const LIMIT = 10;

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500', 'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500',
];

function UserSearchCard({ user }: { user: any }) {
  const gradient = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
  return (
    <Link href={buildProfilePath(user.username)}
      className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-card transition-all group">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden`}>
        {user.avatarUrl
          ? <img src={resolveFileUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
          : user.username.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm group-hover:text-primary transition-colors">@{user.username}</p>
        {user.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{user.bio}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-bold">{user._count?.topics ?? 0}</p>
        <p className="text-[10px] text-muted-foreground">konu</p>
      </div>
    </Link>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';

  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<{
    topics: any[];
    slides: any[];
    total: number;
    pages: number;
    totals: { topics: number; slides: number; all: number };
    paging: { topics: number; slides: number; max: number };
  }>({
    topics: [],
    slides: [],
    total: 0,
    pages: 0,
    totals: { topics: 0, slides: 0, all: 0 },
    paging: { topics: 0, slides: 0, max: 0 },
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<'all' | 'topics' | 'slides' | 'users'>('all');
  const [page, setPage] = useState(1);

  const doSearch = useCallback(async (term: string, p = 1) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const [content, usersRes] = await Promise.all([
        api.get(`/topics/search?q=${encodeURIComponent(term)}&page=${p}&limit=${LIMIT}`),
        api.get(`/users/search?q=${encodeURIComponent(term)}`).catch(() => ({ data: [] })),
      ]);
      setResults(content.data);
      setUsers(usersRes.data || []);
    } catch {
      setResults({
        topics: [],
        slides: [],
        total: 0,
        pages: 0,
        totals: { topics: 0, slides: 0, all: 0 },
        paging: { topics: 0, slides: 0, max: 0 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync URL query param → local state + trigger search immediately
  useEffect(() => {
    if (!q) return;
    setQuery(q);
    setPage(1);
    doSearch(q, 1);
  }, [q, doSearch]);

  // Live debounce: fire search 400ms after user stops typing (no URL change per keystroke)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) return;
    debounceRef.current = setTimeout(() => {
      setPage(1);
      doSearch(value.trim(), 1);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    analytics.search({ search_term: query.trim() });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const goPage = (p: number) => {
    setPage(p);
    doSearch(q, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const contentTotal = results.totals?.all ?? results.total;
  const totalCount = contentTotal + users.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-4">Ara</h1>
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Konu veya slayt ara..."
            autoFocus
            className="w-full pl-12 pr-32 py-4 text-base rounded-2xl border border-border bg-card shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-button hover:shadow-button-hover flex items-center gap-1.5"
          >
            Ara <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">&ldquo;{q}&rdquo;</span> için{' '}
              <span className="font-bold text-foreground">{contentTotal}</span> içerik sonucu
            </p>
            {totalCount > 0 && (
              <div className="flex gap-1 bg-muted p-1 rounded-xl flex-wrap">
                {([
                  { id: 'all', label: `Tümü (${totalCount})` },
                  { id: 'topics', label: `Konular (${results.totals?.topics ?? results.topics.length})` },
                  { id: 'slides', label: `Slaytlar (${results.totals?.slides ?? results.slides.length})` },
                  { id: 'users', label: `Kullanıcılar (${users.length})` },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {totalCount === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 border-2 border-dashed border-border rounded-2xl"
              >
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-bold text-muted-foreground mb-1">içerik sonucu bulunamadı</p>
                <p className="text-sm text-muted-foreground/60">Farklı anahtar kelimeler dene</p>
              </motion.div>
            ) : (
              <motion.div
                key={`${tab}-${page}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {(tab === 'all' || tab === 'topics') && results.topics.length > 0 && (
                  <section className="mb-8">
                    {tab === 'all' && (
                      <div className="flex items-center gap-2 mb-4">
                        <Layers className="w-4 h-4 text-primary" />
                        <h2 className="font-extrabold">Konular</h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {results.topics.map((topic) => (
                        <TopicCard key={topic.id} topic={topic} />
                      ))}
                    </div>
                  </section>
                )}

                {(tab === 'all' || tab === 'slides') && results.slides.length > 0 && (
                  <section className="mb-8">
                    {tab === 'all' && (
                      <div className="flex items-center gap-2 mb-4">
                        <Presentation className="w-4 h-4 text-primary" />
                        <h2 className="font-extrabold">Slaytlar</h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {results.slides.map((slide) => (
                        <SlideCard key={slide.id} slide={slide} />
                      ))}
                    </div>
                  </section>
                )}

                {(tab === 'all' || tab === 'users') && users.length > 0 && (
                  <section>
                    {tab === 'all' && (
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-primary" />
                        <h2 className="font-extrabold">Kullanıcılar</h2>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {users.map((u) => (
                        <UserSearchCard key={u.id} user={u} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Pagination */}
                {results.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => goPage(page - 1)}
                      disabled={page <= 1}
                      className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(results.pages, 7) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => goPage(p)}
                          className={`w-9 h-9 rounded-xl border text-sm font-bold transition-all ${
                            p === page
                              ? 'bg-primary text-white border-primary shadow-button'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => goPage(page + 1)}
                      disabled={page >= results.pages}
                      className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {!loading && !searched && (
        <div className="text-center py-24 text-muted-foreground">
          <Search className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold mb-1">Ne aramak istersin?</p>
          <p className="text-sm text-muted-foreground/60">Konu başlığı veya slayt adı yaz</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-16 rounded-2xl mb-8" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl mb-3" />
        ))}
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
