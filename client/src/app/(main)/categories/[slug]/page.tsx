'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tag, LayoutGrid, Loader2, ArrowLeft, Bookmark } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import TopicCard from '@/components/shared/TopicCard';
import { TopicCardSkeleton } from '@/components/shared/Skeleton';
import toast from 'react-hot-toast';
import { buildTopicCreatePath } from '@/lib/url';

export default function CategoryPage({
  initialCategory,
  initialTopics,
}: {
  initialCategory?: any;
  initialTopics?: any[];
} = {}) {
  const { slug } = useParams();
  const { user } = useAuthStore();
  const [category, setCategory] = useState<any>(initialCategory || null);
  const [topics, setTopics] = useState<any[]>(initialTopics || []);
  const [loading, setLoading] = useState(!initialCategory);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  // Skip the first API fetch when SSR initial data is provided; still run on
  // subsequent slug/user changes (e.g. navigation to a different category).
  const hasInitialDataRef = useRef(Boolean(initialCategory));

  useEffect(() => {
    if (hasInitialDataRef.current) {
      hasInitialDataRef.current = false;
      // Initial data came from SSR — only resolve follow state client-side.
      if (user && category) {
        api.get('/follows/me')
          .then(({ data }) => setFollowing((data.categories || []).includes(category.id)))
          .catch(() => {});
      }
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [cat, t] = await Promise.all([
          api.get(`/categories/${slug}`),
          api.get(`/topics?category=${slug}&limit=24`),
        ]);
        setCategory(cat.data);
        setTopics(t.data.topics || []);

        if (user) {
          const follows = await api.get('/follows/me');
          setFollowing(follows.data.categories.includes(cat.data.id));
        }
      } catch {
        setCategory(null);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFollow = async () => {
    if (!user) return toast.error('Giriş yapmalısın');
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/follows/category/${category.id}`);
      setFollowing(data.following);
      toast.success(data.following ? 'Kategori takip edildi' : 'Takipten çıkıldı');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-40 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <TopicCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!category) {
    return <div className="p-8 text-center text-muted-foreground">Kategori bulunamadı.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/kategori"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tüm Kategoriler
      </Link>

      <section className="border border-border rounded-2xl p-6 md:p-8 mb-8 bg-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Tag className="w-4 h-4 text-primary" />
              </span>
              <span className="text-sm font-semibold text-primary">Kategori</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1">{category.name}</h1>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <LayoutGrid className="w-4 h-4" />
              {category._count?.topics || 0} konu
            </p>
          </div>

          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              following
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
            }`}
          >
            {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className={`w-4 h-4 ${following ? 'fill-current' : ''}`} />}
            {following ? 'Takip ediliyor' : 'Takip et'}
          </button>
        </div>
      </section>

      {topics.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <p className="text-lg font-semibold mb-1">Bu kategoride henüz konu yok</p>
          <p className="text-sm mb-5">İlk konuyu açarak katkı sağlayabilirsin.</p>
          <Link
            href={buildTopicCreatePath()}
            className="inline-block px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Konu Aç
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}
