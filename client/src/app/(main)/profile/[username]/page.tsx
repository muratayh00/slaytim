'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Bookmark, Tag, Users, Clock,
  Calendar, Loader2, UserPlus, UserCheck, LayoutGrid, Pencil, UserX, Award, Play, Eye,
  Link2, TrendingUp, Layers, Flag,
} from 'lucide-react';
import api from '@/lib/api';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { useAuthStore } from '@/store/auth';
import { formatDate, getInitials } from '@/lib/utils';
import TopicCard from '@/components/shared/TopicCard';
import SlideCard from '@/components/shared/SlideCard';
import EditProfileModal from '@/components/shared/EditProfileModal';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import ReportModal from '@/components/shared/ReportModal';
import toast from 'react-hot-toast';
import { buildCategoryPath, buildProfilePath, buildSlideoPath, buildTopicPath } from '@/lib/url';

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
];

type ProfilePageProps = {
  forcedUsername?: string;
};

export default function ProfilePage({ forcedUsername }: ProfilePageProps) {
  const params = useParams();
  const rawUsername = forcedUsername || String((params as { username?: string })?.username || '');
  const username = decodeURIComponent(rawUsername).replace(/^@+/, '').trim();
  const { user: me } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [myTopics, setMyTopics] = useState<any[]>([]);
  const [mySlideos, setMySlideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('topics');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, d, t, sl, b] = await Promise.all([
          api.get(`/users/${username}`),
          api.get(`/users/${username}/details`),
          api.get(`/users/${username}/topics`),
          api.get(`/users/${username}/slideos`).catch(() => ({ data: [] })),
          api.get(`/badges/user/${username}`).catch(() => ({ data: { badges: [] } })),
        ]);
        setProfile(p.data);
        setDetails(d.data);
        setMyTopics(t.data);
        setMySlideos(sl.data);
        setBadges(b.data.badges || []);

        if (me && me.username !== username) {
          const [follows, blockStatus] = await Promise.all([
            api.get('/follows/me'),
            api.get(`/blocks/check/${p.data.id}`),
          ]);
          setFollowing(follows.data.users.includes(p.data.id));
          setBlocked(blockStatus.data.blocked);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, me]);

  const handleFollow = async () => {
    if (!me) return toast.error('Giriş yapmalısın');
    setFollowLoading(true);
    try {
      const sourceSlideId = localStorage.getItem('follow_source_slide_id');
      const sourcePageNumber = localStorage.getItem('follow_source_slide_page');
      const sessionId = sourceSlideId ? sessionStorage.getItem(`slide:view:session:${sourceSlideId}`) : null;
      const payload = sourceSlideId
        ? { sourceSlideId: Number(sourceSlideId), sourcePageNumber: Number(sourcePageNumber || 1) }
        : {};
      const { data } = await api.post(
        `/follows/user/${profile.id}`,
        payload,
        sessionId ? { headers: { 'X-View-Session': sessionId } } : undefined,
      );
      setFollowing(data.following);
      setProfile((p: any) => ({
        ...p,
        _count: {
          ...p._count,
          followers: Math.max(0, p._count.followers + (data.following ? 1 : -1)),
        },
      }));
      if (data.following && sourceSlideId) {
        localStorage.removeItem('follow_source_slide_id');
        localStorage.removeItem('follow_source_slide_page');
      }
      toast.success(data.following ? 'Takip edildi' : 'Takipten çıkıldı');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}${buildProfilePath(String(username))}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success('Profil linki kopyalandı');
  };

  const handleBlock = async () => {
    if (!me) return toast.error('Giriş yapmalısın');
    setBlockLoading(true);
    try {
      const { data } = await api.post(`/blocks/${profile.id}`);
      setBlocked(data.blocked);
      if (data.blocked) setFollowing(false);
      toast.success(data.blocked ? 'Kullanıcı engellendi' : 'Engel kaldırıldı');
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-56 rounded-2xl mb-6" />
        <div className="skeleton h-12 w-full rounded-xl mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Kullanıcı bulunamadı.</div>;

  const isOwn = me?.username === username;
  const avatarGradient = AVATAR_COLORS[profile.id % AVATAR_COLORS.length];

  // Tabs with dynamic counts
  const TABS = [
    { id: 'topics', label: 'Konular', icon: LayoutGrid, count: myTopics.length },
    { id: 'slideos', label: 'Slideo', icon: Play, count: mySlideos.length },
    { id: 'liked-slides', label: 'Beğenilen Slaytlar', icon: Heart, count: details?.likedSlides?.length },
    { id: 'liked-topics', label: 'Beğenilen Konular', icon: Heart, count: details?.likedTopics?.length },
    { id: 'saved', label: 'Kaydedilenler', icon: Bookmark, count: details?.savedSlides?.length },
    { id: 'categories', label: 'Kategoriler', icon: Tag, count: details?.followedCategories?.length },
    { id: 'following', label: 'Takip', icon: Users, count: details?.followedUsers?.length },
    { id: 'followers', label: 'Takipçiler', icon: Users, count: details?.followers?.length },
    { id: 'visited', label: 'Son Ziyaretler', icon: Clock, count: details?.visitedTopics?.length },
    { id: 'badges', label: 'Rozetler', icon: Award, count: badges.length },
  ];

  const renderTab = () => {
    if (!details) return null;
    switch (activeTab) {
      case 'topics':
        return myTopics.length === 0 ? (
          <Empty message="Henüz konu açılmadı" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myTopics.map((t: any) => <TopicCard key={t.id} topic={{ ...t, user: profile }} />)}
          </div>
        );
      case 'slideos':
        return mySlideos.length === 0 ? (
          <Empty message="Henüz slideo yok" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mySlideos.map((s: any) => (
              <Link key={s.id} href={buildSlideoPath({ id: s.id, title: s.title })} prefetch={false}
                className="group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-card transition-all"
              >
                <div className="aspect-video bg-black/80 flex items-center justify-center relative">
                  {s.slide?.thumbnailUrl ? (
                    <img src={resolveFileUrl(s.slide.thumbnailUrl)}
                      alt={s.title} className="w-full h-full object-cover opacity-80"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Play className="w-10 h-10 text-white/30" fill="currentColor" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white text-xs font-bold line-clamp-2 drop-shadow">{s.title}</p>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white/80 font-bold">
                    {Number(s.pageIndices?.length || 0)} sayfa
                  </div>
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{s.likesCount}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{s.viewsCount}</span>
                  </div>
                  {s.slide?.topic?.category && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate max-w-[90px]">
                      {s.slide.topic.category.name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        );
      case 'liked-slides':
        return details.likedSlides.length === 0 ? <Empty message="Beğenilen slayt yok" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {details.likedSlides.map((s: any) => <SlideCard key={s.id} slide={s} />)}
          </div>
        );
      case 'liked-topics':
        return details.likedTopics.length === 0 ? <Empty message="Beğenilen konu yok" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {details.likedTopics.map((t: any) => <TopicCard key={t.id} topic={{ ...t, user: { username: t.user?.username || '?', id: 0 } }} />)}
          </div>
        );
      case 'saved':
        return details.savedSlides.length === 0 ? <Empty message="Kaydedilen slayt yok" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {details.savedSlides.map((s: any) => <SlideCard key={s.id} slide={s} />)}
          </div>
        );
      case 'categories':
        return details.followedCategories.length === 0 ? <Empty message="Takip edilen kategori yok" /> : (
          <div className="flex flex-wrap gap-2.5">
            {details.followedCategories.map((c: any) => (
              <Link key={c.id} href={buildCategoryPath(c.slug)}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {c.name}
              </Link>
            ))}
          </div>
        );
      case 'following':
        return details.followedUsers.length === 0 ? <Empty message="Takip edilen kullanıcı yok" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {details.followedUsers.map((u: any) => <UserCard key={u.id} user={u} />)}
          </div>
        );
      case 'followers':
        return !details.followers || details.followers.length === 0 ? <Empty message="Henüz takipçi yok" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {details.followers.map((u: any) => <UserCard key={u.id} user={u} />)}
          </div>
        );
      case 'visited':
        return details.visitedTopics.length === 0 ? <Empty message="Son ziyaret yok" /> : (
          <div className="space-y-2.5">
            {details.visitedTopics.map((t: any) => (
              <Link key={t.id} href={buildTopicPath({ id: t.id, slug: t.slug, title: t.title })}
                className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-card transition-all group">
                <div className="min-w-0">
                  <p className="font-semibold text-sm group-hover:text-primary transition line-clamp-1">{t.title}</p>
                  {t.category && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {t.category.name}
                    </p>
                  )}
                </div>
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        );
      case 'badges':
        return <BadgeDisplay badges={badges} showAll />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden mb-6 shadow-card"
      >
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-primary/20 via-violet-500/15 to-indigo-500/10" />

        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <div className="flex items-end justify-between gap-4 -mt-10 mb-5 flex-wrap">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-2xl font-bold text-white ring-4 ring-card shadow-lg overflow-hidden`}>
              {profile.avatarUrl ? (
                <img src={resolveFileUrl(profile.avatarUrl)} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                getInitials(profile.username)
              )}
            </div>
            {isOwn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border border-border hover:bg-muted transition-all"
                >
                  <Pencil className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={handleShareProfile}
                  title="Profil linkini kopyala"
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            ) : me ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFollow}
                  disabled={followLoading || blocked}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                    following
                      ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                      : 'bg-primary text-primary-foreground shadow-button hover:shadow-button-hover hover:-translate-y-0.5'
                  }`}
                >
                  {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {following ? 'Takip Ediliyor' : 'Takip Et'}
                </button>
                <button
                  onClick={handleBlock}
                  disabled={blockLoading}
                  title={blocked ? 'Engeli Kaldır' : 'Engelle'}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border font-bold text-sm transition-all ${
                    blocked
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/15'
                      : 'border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5'
                  }`}
                >
                  {blockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  title="Raporla"
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">@{profile.username}</h1>
          {profile.bio && <p className="text-muted-foreground mt-1.5 max-w-md text-[15px]">{profile.bio}</p>}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(profile.createdAt)} tarihinde katıldı
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-5 pt-5 border-t border-border/60 flex-wrap">
            <Stat label="Konu" value={profile._count?.topics || 0} />
            <Stat label="Slayt" value={profile._count?.slides || 0} />
            <Stat label="Slideo" value={profile._count?.slideos || 0} />
            <Stat label="Takipçi" value={profile._count?.followers || 0} />
            <Stat label="Takip" value={profile._count?.following || 0} />
          </div>

          {/* Portfolio stats */}
          {profile.stats && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <PortfolioStat
                icon={<Eye className="w-3.5 h-3.5 text-blue-500" />}
                iconBg="bg-blue-500/10"
                label="Toplam Görüntülenme"
                value={(profile.stats.totalSlideViews + profile.stats.totalSlideoViews).toLocaleString()}
              />
              <PortfolioStat
                icon={<Bookmark className="w-3.5 h-3.5 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                label="Toplam Kaydetme"
                value={profile.stats.totalSlideSaves.toLocaleString()}
              />
              <PortfolioStat
                icon={<Heart className="w-3.5 h-3.5 text-rose-500" />}
                iconBg="bg-rose-500/10"
                label="Toplam Beğeni"
                value={(profile.stats.totalSlideLikes + profile.stats.totalSlideoLikes).toLocaleString()}
              />
              {profile.stats.topCategory ? (
                <PortfolioStat
                  icon={<Layers className="w-3.5 h-3.5 text-violet-500" />}
                  iconBg="bg-violet-500/10"
                  label="Ana Kategori"
                  value={profile.stats.topCategory.name}
                />
              ) : (
                <PortfolioStat
                  icon={<TrendingUp className="w-3.5 h-3.5 text-orange-500" />}
                  iconBg="bg-orange-500/10"
                  label="Slideo Görüntülenme"
                  value={profile.stats.totalSlideoViews.toLocaleString()}
                />
              )}
            </div>
          )}

          {/* Share link — visible to all */}
          {!isOwn && (
            <button
              onClick={handleShareProfile}
              className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Profil linkini kopyala
            </button>
          )}

          {/* Badge pills preview */}
          {badges.length > 0 && (
            <div className="mt-4">
              <BadgeDisplay badges={badges} limit={8} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-max min-w-full sm:min-w-0">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {renderTab()}
        </motion.div>
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEdit && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEdit(false)}
            onSuccess={(updated) => setProfile((p: any) => ({ ...p, ...updated }))}
          />
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <ReportModal
            targetType="user"
            targetId={profile.id}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserCard({ user }: { user: any }) {
  const uGradient = [
    'from-indigo-500 to-violet-500', 'from-violet-500 to-purple-500',
    'from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500',
    'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500',
  ][user.id % 6];
  return (
    <Link href={buildProfilePath(user.username)}
      className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-card transition-all">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${uGradient} flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden`}>
        {user.avatarUrl
          ? <img src={resolveFileUrl(user.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover" />
          : user.username.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm">@{user.username}</p>
        {user.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{user.bio}</p>}
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-extrabold text-lg">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PortfolioStat({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/30">
      <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold truncate">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
      <p className="font-semibold">{message}</p>
    </div>
  );
}
