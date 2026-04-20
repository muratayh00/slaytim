'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, UserPlus, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

type NotifPrefs = {
  notifyOnLike: boolean;
  notifyOnComment: boolean;
  notifyOnFollow: boolean;
};

function ToggleRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  busy,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none mb-0.5">{label}</p>
          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        </div>
      </div>
      <button
        onClick={() => !busy && onChange(!value)}
        disabled={busy}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          value ? 'bg-primary' : 'bg-muted-foreground/30'
        } disabled:opacity-50`}
        aria-checked={value}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    api
      .get('/users/me/notification-prefs')
      .then(({ data }) => setPrefs(data))
      .catch(() => toast.error('Tercihler yüklenemedi'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const update = async (key: keyof NotifPrefs, value: boolean) => {
    if (!prefs) return;
    setBusyKey(key);
    const prev = prefs[key];
    setPrefs((p) => p && { ...p, [key]: value });
    try {
      await api.patch('/users/me/notification-prefs', { [key]: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setPrefs((p) => p && { ...p, [key]: prev });
      toast.error('Güncellenemedi');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-40 rounded-xl mb-8" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ayarlar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hesap ve bildirim tercihlerini yönet</p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <Check className="w-3.5 h-3.5" />
            Kaydedildi
          </span>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-2.5 mb-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-extrabold text-base">Bildirim Tercihleri</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Hangi etkinlikler için bildirim almak istediğini seç
        </p>

        <ToggleRow
          icon={Heart}
          label="Beğeni bildirimleri"
          description="Biri içeriğini beğendiğinde bildirim al"
          value={prefs.notifyOnLike}
          onChange={(v) => update('notifyOnLike', v)}
          busy={busyKey === 'notifyOnLike'}
        />
        <ToggleRow
          icon={MessageCircle}
          label="Yorum bildirimleri"
          description="Biri içeriğine yorum yaptığında bildirim al"
          value={prefs.notifyOnComment}
          onChange={(v) => update('notifyOnComment', v)}
          busy={busyKey === 'notifyOnComment'}
        />
        <ToggleRow
          icon={UserPlus}
          label="Takip bildirimleri"
          description="Biri seni takibe aldığında bildirim al"
          value={prefs.notifyOnFollow}
          onChange={(v) => update('notifyOnFollow', v)}
          busy={busyKey === 'notifyOnFollow'}
        />
      </div>

      {/* Topic Subscriptions hint */}
      <div className="mt-4 bg-muted/50 border border-border/60 rounded-2xl px-5 py-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Konu abonelikleri</span> — Abone olduğun konulardaki yeni slayt bildirimlerini konu sayfasından yönetebilirsin.
        </p>
      </div>
    </div>
  );
}
