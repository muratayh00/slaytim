'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Folder, Globe, Lock, Calendar, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import SlideCard from '@/components/shared/SlideCard';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import toast from 'react-hot-toast';
import { buildCollectionPath, buildProfilePath } from '@/lib/url';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const AVATAR_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

export default function CollectionDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [col, setCol] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    api.get(`/collections/${id}`)
      .then(({ data }) => {
        setCol(data);
        setFollowing(Boolean(data?.isFollowing));
      })
      .catch(() => setCol(null))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-6 w-32 mb-6 rounded-xl" />
        <div className="skeleton h-10 w-2/3 rounded-xl mb-3" />
        <div className="skeleton h-5 w-1/3 rounded-xl mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!col) {
    return <div className="p-8 text-center text-muted-foreground">Koleksiyon bulunamadı.</div>;
  }

  const slides = col.slides?.map((cs: any) => cs.slide) || [];
  const avatarColor = AVATAR_COLORS[col.user.id % AVATAR_COLORS.length];
  const isOwner = user?.id === col.userId;

  const toggleFollow = async () => {
    if (!user) return toast.error('Takip için giriş yapmalısın');
    if (isOwner) return;
    setFollowBusy(true);
    try {
      const { data } = await api.post(`/collections/${col.id}/follow`);
      const next = Boolean(data?.following);
      setFollowing(next);
      setCol((prev: any) => {
        if (!prev) return prev;
        const prevCount = Number(prev?._count?.followers || 0);
        return {
          ...prev,
          _count: {
            ...(prev._count || {}),
            followers: next ? prevCount + 1 : Math.max(0, prevCount - 1),
          },
        };
      });
      toast.success(next ? 'Koleksiyon takip edildi' : 'Takipten çıkıldı');
    } catch {
      toast.error('Takip işlemi başarısız');
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href={isOwner ? '/collections' : buildProfilePath(col.user.username)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isOwner ? 'Koleksiyonlarım' : col.user.username}
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Folder className="w-7 h-7 text-primary/60" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-extrabold tracking-tight leading-tight">{col.name}</h1>
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
                  {col.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {col.isPublic ? 'Herkese Açık' : 'Gizli'}
                </span>
              </div>
              {col.description && <p className="text-muted-foreground text-sm mb-3">{col.description}</p>}
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                <Link href={buildProfilePath(col.user.username)} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <div className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-[8px] font-black text-white`}>
                    {col.user.avatarUrl
                      ? <img src={resolveFileUrl(col.user.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover" />
                      : col.user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-semibold">{col.user.username}</span>
                </Link>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(col.createdAt)}
                </span>
                <span className="font-semibold">{col._count?.slides ?? slides.length} slayt</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isOwner && user && (
                <button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    following
                      ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
                      : 'border-border hover:bg-muted'
                  } disabled:opacity-60`}
                >
                  {followBusy ? '...' : following ? 'Takiptesin' : 'Takip Et'}
                </button>
              )}
              {isOwner && (
                <Link
                  href={`${buildCollectionPath(col)}/edit`}
                  className="px-3.5 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Düzenle
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Slides */}
        {slides.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" strokeWidth={1} />
            <p className="font-bold mb-1">Bu koleksiyon boş</p>
            <p className="text-sm opacity-60">Slayt detay sayfasından koleksiyona ekle</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide: any) => (
              <motion.div key={slide.id} variants={fadeUp}>
                <SlideCard slide={slide} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
