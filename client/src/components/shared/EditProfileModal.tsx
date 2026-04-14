'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, User, FileText } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

// Re-export store setter for profile update
const updateUserStore = (updated: any) => {
  useAuthStore.setState((state) => ({
    user: state.user ? { ...state.user, ...updated } : state.user,
  }));
};

interface Props {
  profile: { bio?: string; avatarUrl?: string; username: string };
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

export default function EditProfileModal({ profile, onClose, onSuccess }: Props) {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    bio: profile.bio || '',
    avatarUrl: profile.avatarUrl || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/me', form);
      updateUserStore({ bio: data.bio, avatarUrl: data.avatarUrl });
      toast.success('Profil güncellendi!');
      onSuccess(data);
      onClose();
    } catch {
      toast.error('Güncelleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="font-extrabold">Profili Düzenle</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Avatar URL
              <span className="font-normal text-muted-foreground">(opsiyonel)</span>
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            {form.avatarUrl && (
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={form.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover border border-border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span className="text-xs text-muted-foreground">Önizleme</span>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Hakkında
              <span className="font-normal text-muted-foreground">(opsiyonel)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Kendini kısaca tanıt..."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.bio.length}/200</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-button disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Kaydet
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
