'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Şifreler eşleşmiyor');
    if (password.length < 8) return toast.error('Şifre en az 8 karakter olmalı');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Link geçersiz veya süresi dolmuş');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-12 py-3 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[420px]"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">Yeni Şifre</h1>
        <p className="text-muted-foreground text-[15px]">
          {done ? 'Şifren güncellendi!' : 'Hesabın için yeni bir şifre belirle'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-bold mb-2">Başarıyla güncellendi</p>
            <p className="text-sm text-muted-foreground mb-4">Giriş sayfasına yönlendiriliyorsun…</p>
            <Link href="/login" className="text-primary font-bold text-sm hover:underline">
              Hemen giriş yap
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/90">Yeni Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'} required minLength={8}
                  placeholder="En az 8 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/90">Şifre Tekrar</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'} required minLength={8}
                  placeholder="Şifreyi tekrar gir"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-400">Şifreler eşleşmiyor</p>
              )}
            </div>
            <button
              type="submit" disabled={loading || password !== confirm}
              className="w-full mt-2 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
