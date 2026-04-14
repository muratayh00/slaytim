'use client';

import { useState } from 'react';
import { X, Flag, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const REASONS = [
  { value: 'spam', label: 'Spam veya yanıltıcı içerik' },
  { value: 'copyright', label: 'Telif hakkı ihlali' },
  { value: 'inappropriate', label: 'Uygunsuz içerik' },
  { value: 'wrong_category', label: 'Yanlış kategori' },
  { value: 'duplicate', label: 'Kopya / tekrarlayan içerik' },
];

interface Props {
  targetType: 'slide' | 'topic' | 'comment' | 'user' | 'slideo';
  targetId: number;
  onClose: () => void;
}

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return toast.error('Bir neden seçmelisin');
    setLoading(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details: details || undefined });
      toast.success('Raporun alındı, inceleyeceğiz.');
      onClose();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Bu içeriği zaten raporladın.');
        onClose();
      } else {
        toast.error('Rapor gönderilemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const typeLabel: Record<string, string> = {
    slide: 'slaytı',
    topic: 'konuyu',
    comment: 'yorumu',
    user: 'kullanıcıyı',
    slideo: 'slideoyu',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Flag className="w-3.5 h-3.5 text-red-500" />
            </div>
            <h2 className="font-extrabold text-sm">Bu {typeLabel[targetType]} raporla</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Neden raporluyorsun?</p>
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reason === r.value
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border hover:border-border/80 hover:bg-muted/60'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-red-500"
                />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Ek açıklama (opsiyonel)</label>
            <textarea
              rows={2}
              placeholder="Daha fazla detay ver..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 transition-all resize-none"
            />
          </div>

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
              disabled={loading || !reason}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Rapor Et
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
