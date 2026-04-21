'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Folder, Loader2, X, Plus, Lock, Globe, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { resolveFileUrl } from '@/lib/pdfRenderer';
import { buildCollectionPath } from '@/lib/url';

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

const getSlideCount = (col: any) => {
  if (Number.isFinite(col?._count?.slides)) return Number(col._count.slides);
  if (Array.isArray(col?.slides)) return col.slides.length;
  return 0;
};

function CollectionCard({ col, onDelete }: { col: any; onDelete: (id: number) => void }) {
  const cover = col.slides?.[0]?.slide?.thumbnailUrl || col.slides?.[0]?.slide?.pdfUrl;
  const slideCount = getSlideCount(col);

  return (
    <motion.div variants={fadeUp}>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:border-border/80 hover:shadow-card-hover transition-all group">
        <Link href={buildCollectionPath(col)}>
          <div className="aspect-video bg-muted relative overflow-hidden">
            {cover ? (
              <Image src={resolveFileUrl(cover)!} alt={col.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Folder className="w-12 h-12 text-muted-foreground/20" strokeWidth={1} />
              </div>
            )}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1">
              {col.isPublic ? <Globe className="w-3 h-3 text-white/70" /> : <Lock className="w-3 h-3 text-white/70" />}
              <span className="text-[10px] font-bold text-white/80">{col.isPublic ? 'Herkese Açık' : 'Gizli'}</span>
            </div>
          </div>
        </Link>

        <div className="p-4">
          <Link href={buildCollectionPath(col)}>
            <h3 className="font-bold text-[14px] leading-snug group-hover:text-primary transition-colors mb-1">{col.name}</h3>
          </Link>
          {col.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{col.description}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{slideCount} slayt · {formatDate(col.createdAt)}</span>
            <div className="flex items-center gap-1">
              <Link href={`${buildCollectionPath(col)}/edit`} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => onDelete(col.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (col: any) => void }) {
  const [form, setForm] = useState({ name: '', description: '', isPublic: true });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/collections', form);
      toast.success('Koleksiyon oluşturuldu');
      onCreate(data);
      onClose();
    } catch {
      toast.error('Koleksiyon oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-extrabold text-lg">Yeni Koleksiyon</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Ad *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Koleksiyon adı"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="İsteğe bağlı"
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all resize-none"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer" onClick={() => setForm({ ...form, isPublic: !form.isPublic })}>
            <div className={`w-10 h-5.5 rounded-full transition-colors relative ${form.isPublic ? 'bg-primary' : 'bg-muted-foreground/30'}`} style={{ height: '22px' }}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-semibold">{form.isPublic ? 'Herkese açık' : 'Gizli'}</span>
          </label>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Oluştur
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function CollectionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [followedCollections, setFollowedCollections] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'followed'>('mine');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    Promise.all([api.get('/collections/me'), api.get('/collections/following/me')])
      .then(([mineRes, followedRes]) => {
        setCollections(Array.isArray(mineRes?.data) ? mineRes.data : []);
        setFollowedCollections(Array.isArray(followedRes?.data?.collections) ? followedRes.data.collections : []);
      })
      .catch(() => {
        toast.error('Koleksiyonlar yüklenemedi');
      })
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleDelete = async (id: number) => {
    if (!confirm('Bu koleksiyonu silmek istediğine emin misin?')) return;
    try {
      await api.delete(`/collections/${id}`);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      toast.success('Koleksiyon silindi');
    } catch {
      toast.error('Koleksiyon silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-48 mb-8 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Koleksiyonlarım</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Slaytlarını düzenle ve grupla</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-button hover:opacity-90 transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          Yeni Koleksiyon
        </button>
      </div>

      <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'mine' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Benim Koleksiyonlarım
        </button>
        <button
          onClick={() => setActiveTab('followed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'followed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Takip Ettiklerim
        </button>
      </div>

      {activeTab === 'mine' && collections.length === 0 && (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <Folder className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" strokeWidth={1} />
          <p className="font-bold text-lg mb-1">Koleksiyonun yok</p>
          <p className="text-sm text-muted-foreground mb-6">Slaytlarını koleksiyonlarda grupla</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-button hover:opacity-90 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            İlk Koleksiyonu Oluştur
          </button>
        </div>
      )}

      {activeTab === 'mine' && collections.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => <CollectionCard key={col.id} col={col} onDelete={handleDelete} />)}
        </motion.div>
      )}

      {activeTab === 'followed' && followedCollections.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
          <p className="font-bold mb-1">Takip ettiğin koleksiyon yok</p>
          <p className="text-sm opacity-60">Koleksiyon detayında “Takip Et” ile ekleyebilirsin</p>
        </div>
      )}

      {activeTab === 'followed' && followedCollections.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {followedCollections.map((col) => (
            <motion.div key={col.id} variants={fadeUp}>
              <Link href={buildCollectionPath(col)} className="block bg-card border border-border rounded-2xl p-4 hover:border-border/80 transition-all">
                <h3 className="font-bold text-[14px]">{col.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{col.description || 'Açıklama yok'}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {getSlideCount(col)} slayt · {Number(col?._count?.followers || 0)} takip
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreate={(col) => setCollections((prev) => [col, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
