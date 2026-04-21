'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { buildCollectionPath } from '@/lib/url';

export default function EditCollectionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [colSlug, setColSlug] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isPublic: true });

  useEffect(() => {
    api.get(`/collections/${id}`)
      .then(({ data }) => {
        setForm({
          name: data?.name || '',
          description: data?.description || '',
          isPublic: Boolean(data?.isPublic),
        });
        // Store slug for navigation (may be backfilled 'col-{id}' for old collections)
        setColSlug(data?.slug || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/collections/${id}`, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        isPublic: form.isPublic,
      });
      toast.success('Koleksiyon güncellendi');
      // Navigate to slug-based URL (backend returns updated slug after name change)
      const newSlug = data?.slug;
      router.push(newSlug ? buildCollectionPath({ id: Number(id), slug: newSlug }) : `/collections/${id}`);
    } catch {
      toast.error('Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu koleksiyonu kalıcı olarak silmek istediğine emin misin?')) return;
    setDeleting(true);
    try {
      await api.delete(`/collections/${id}`);
      toast.success('Koleksiyon silindi');
      router.push('/collections');
    } catch {
      toast.error('Koleksiyon silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-muted-foreground">Yukleniyor...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={colSlug ? buildCollectionPath({ id: Number(id), slug: colSlug }) : `/collections/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" />
        Koleksiyona Don
      </Link>
      <div className="border border-border rounded-2xl p-5 bg-card space-y-4">
        <h1 className="text-xl font-extrabold">Koleksiyon Duzenle</h1>
        <div>
          <label className="text-sm font-semibold block mb-1">Ad</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1">Aciklama</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-border bg-muted/50 focus:outline-none resize-none"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
          />
          Herkese acik
        </label>
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-600 text-sm font-semibold hover:bg-red-500/10 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Siliniyor...' : 'Koleksiyonu Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}

