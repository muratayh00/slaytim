'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { analytics } from '@/lib/analytics';
import api from '@/lib/api';

type Tab = 'password' | 'magic';

export default function LoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('password');

  // Password login
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Magic link
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      analytics.login();
      toast.success('Hoş geldin!');
      router.push('/');
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      if (status === 400 || status === 401) {
        toast.error('E-posta veya şifre yanlış.');
      } else if (isTimeout || status === 503) {
        toast.error('Sunucu yanıt vermiyor. Lütfen birkaç saniye bekleyip tekrar dene.');
      } else if (!status) {
        toast.error('Bağlantı hatası. İnternet bağlantını ve sunucu durumunu kontrol et.');
      } else {
        toast.error('Giriş yapılamadı. Lütfen tekrar dene.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicLoading(true);
    try {
      await api.post('/auth/magic-link', { email: magicEmail });
      setMagicSent(true);
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 429) {
        toast.error('Lütfen bir dakika bekleyip tekrar dene.');
      } else {
        toast.error('Bir hata oluştu, tekrar dene.');
      }
    } finally {
      setMagicLoading(false);
    }
  };

  const tabClass = (t: Tab) =>
    `flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
      tab === t
        ? 'bg-primary text-white shadow'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[420px]"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">Tekrar hoş geldin</h1>
        <p className="text-muted-foreground text-[15px]">Hesabına giriş yap, keşfetmeye devam et</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/40 mb-6">
          <button type="button" className={tabClass('password')} onClick={() => setTab('password')}>
            Şifre ile Giriş
          </button>
          <button type="button" className={tabClass('magic')} onClick={() => setTab('magic')}>
            <span className="flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Magic Link
            </span>
          </button>
        </div>

        {/* ── Password tab ── */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/90">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ornek@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/90">Şifre</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary font-semibold hover:underline underline-offset-2"
                >
                  Şifremi unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="********"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 hover:shadow-button-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>
        )}

        {/* ── Magic link tab ── */}
        {tab === 'magic' && (
          <>
            {magicSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="font-bold mb-2">E-posta gönderildi</p>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>{magicEmail}</strong> adresine giriş bağlantısı gönderdik.
                  Linke tıkladığında otomatik giriş yapılır.
                </p>
                <p className="text-xs text-muted-foreground">
                  E-posta gelmedi mi?{' '}
                  <button
                    onClick={() => setMagicSent(false)}
                    className="text-primary font-semibold hover:underline"
                  >
                    Tekrar gönder
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleMagicSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  E-posta adresini gir, şifre gerekmeden tek kullanımlık bir giriş
                  bağlantısı gönderelim.
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground/90">E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="ornek@email.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={magicLoading}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {magicLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {magicLoading ? 'Gönderiliyor…' : 'Giriş Bağlantısı Gönder'}
                </button>
              </form>
            )}
          </>
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">veya</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Hesabın yok mu?{' '}
          <Link href="/register" className="text-primary font-bold hover:underline underline-offset-2">
            Ücretsiz kayıt ol
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
