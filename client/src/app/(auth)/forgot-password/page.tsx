'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Bir hata oluştu, tekrar dene');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[420px]"
    >
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Girişe dön
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">Şifre Sıfırla</h1>
        <p className="text-muted-foreground text-[15px]">
          {sent ? 'E-posta gönderildi' : 'E-postanı gir, sıfırlama bağlantısı gönderelim'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-bold mb-2">Kontrol et</p>
            <p className="text-sm text-muted-foreground mb-6">
              Eğer <strong>{email}</strong> kayıtlıysa, sıfırlama bağlantısı 30 dakika geçerlidir.
            </p>
            <p className="text-xs text-muted-foreground">
              E-posta gelmediyse spam klasörünü kontrol et veya{' '}
              <button onClick={() => setSent(false)} className="text-primary font-semibold hover:underline">tekrar dene</button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/90">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email" required
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all"
                />
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
