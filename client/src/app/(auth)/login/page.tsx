'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, Loader2, ArrowRight,
  Zap, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { analytics } from '@/lib/analytics';
import api from '@/lib/api';

type Tab = 'password' | 'magic';

// ─── 6-digit OTP input ────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null)); // eslint-disable-line react-hooks/rules-of-hooks

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = char;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (char && i < 5) {
      refs[i + 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      refs[focusIdx].current?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className={`w-11 h-14 text-center text-xl font-bold rounded-xl border
            bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30
            focus:border-primary/60 focus:bg-card transition-all
            ${value[i] ? 'border-primary/50 text-foreground' : 'border-border text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, hydrate } = useAuthStore();
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

  // OTP code
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

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
      setCode('');
      setAttemptsLeft(null);
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

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setCodeLoading(true);
    try {
      const { data } = await api.post('/auth/magic-code', { email: magicEmail, code });
      if (data?.token) {
        await hydrate().catch(() => {});
      }
      analytics.login();
      toast.success('Hoş geldin!');
      router.push('/');
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      const serverErr: string = err?.response?.data?.error || '';
      const left: number | undefined = err?.response?.data?.attemptsLeft;

      if (status === 429) {
        toast.error('Çok fazla deneme. Lütfen bekle.');
      } else if (left !== undefined) {
        setAttemptsLeft(left);
        setCode('');
        toast.error(serverErr || `Kod yanlış. ${left} deneme hakkın kaldı.`);
      } else if (serverErr.includes('Yeni kod')) {
        // Token fully invalidated — force resend
        setMagicSent(false);
        setCode('');
        setAttemptsLeft(null);
        toast.error('Çok fazla yanlış deneme. Lütfen yeni kod talep et.');
      } else {
        toast.error(serverErr || 'Kod geçersiz veya süresi dolmuş.');
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const resetMagic = () => {
    setMagicSent(false);
    setCode('');
    setAttemptsLeft(null);
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
            {/* ── Step 1: email form ── */}
            {!magicSent && (
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
                  {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {magicLoading ? 'Gönderiliyor…' : 'Giriş Bağlantısı Gönder'}
                </button>
              </form>
            )}

            {/* ── Step 2: sent state + OTP entry ── */}
            {magicSent && (
              <div className="space-y-6">
                {/* Sent confirmation */}
                <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">E-posta gönderildi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <strong className="text-foreground/70">{magicEmail}</strong> adresine
                      giriş bağlantısı ve 6 haneli kod gönderdik.
                    </p>
                  </div>
                </div>

                {/* OTP entry */}
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground/90 mb-0.5">
                        Bu cihazda giriş yapmak için kodu gir
                      </p>
                      <p className="text-xs text-muted-foreground">
                        E-postadaki 6 haneli kodu gir
                        {attemptsLeft !== null && (
                          <span className="text-amber-400 font-semibold ml-1">
                            · {attemptsLeft} deneme hakkın kaldı
                          </span>
                        )}
                      </p>
                    </div>

                    <OtpInput value={code} onChange={setCode} />
                  </div>

                  <button
                    type="submit"
                    disabled={codeLoading || code.length !== 6}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {codeLoading ? 'Doğrulanıyor…' : 'Kodu Onayla ve Giriş Yap'}
                  </button>
                </form>

                {/* Resend / back */}
                <div className="border-t border-border pt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    E-posta gelmedi mi veya link&apos;i başka cihazda kullandın mı?{' '}
                    <button
                      type="button"
                      onClick={resetMagic}
                      className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Yeni kod gönder
                    </button>
                  </p>
                </div>
              </div>
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
