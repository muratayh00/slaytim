'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, Sparkles, MailCheck, Check, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/* ── Turkish character detection ─────────────────────────────────────────── */
const TURKISH_CHARS = /[ğüşıöçĞÜŞİÖÇ]/;

function hasTurkishChar(val: string) {
  return TURKISH_CHARS.test(val);
}

/* ── Password rules ───────────────────────────────────────────────────────── */
const PASSWORD_RULES = [
  {
    key: 'length',
    label: 'En az 8 karakter',
    test: (p: string) => p.length >= 8,
  },
  {
    key: 'digit',
    label: 'En az bir rakam (0–9)',
    test: (p: string) => /\d/.test(p),
  },
  {
    key: 'upper',
    label: 'En az bir büyük harf (A–Z)',
    test: (p: string) => /[A-Z]/.test(p),
  },
] as const;

/* ── Username rules ───────────────────────────────────────────────────────── */
function getUsernameError(val: string): string | null {
  if (!val) return null;
  if (hasTurkishChar(val))
    return 'Kullanıcı adında Türkçe karakter (ğ, ö, ü, ş, ı, ç…) kullanılamaz.';
  if (!/^[a-z0-9_.]+$/.test(val))
    return 'Yalnızca küçük harf, rakam, alt çizgi (_) ve nokta (.) kullanabilirsin.';
  if (val.length < 3)
    return 'Kullanıcı adı en az 3 karakter olmalıdır.';
  if (val.length > 30)
    return 'Kullanıcı adı en fazla 30 karakter olabilir.';
  return null;
}

/* ── ChecklistItem ────────────────────────────────────────────────────────── */
function CheckItem({ ok, label, visible }: { ok: boolean; label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.li
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 text-xs"
    >
      <span
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200',
          ok
            ? 'bg-emerald-500/15 text-emerald-600'
            : 'bg-muted-foreground/10 text-muted-foreground/40',
        )}
      >
        {ok ? <Check className="w-2.5 h-2.5 stroke-[2.5]" /> : <X className="w-2.5 h-2.5 stroke-[2]" />}
      </span>
      <span className={cn('transition-colors duration-200', ok ? 'text-emerald-600 font-medium' : 'text-muted-foreground')}>
        {label}
      </span>
    </motion.li>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const { register } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);

  /* ── Derived validations ── */
  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(form.password) })),
    [form.password],
  );
  const allPasswordOk = passwordChecks.every((r) => r.ok);
  const usernameError = useMemo(() => getUsernameError(form.username), [form.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched(true);
    setUsernameTouched(true);

    if (usernameError) return toast.error(usernameError);
    if (!allPasswordOk) {
      const first = passwordChecks.find((r) => !r.ok);
      if (first) toast.error(first.label + ' kuralına uyulmuyor.');
      return;
    }

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      analytics.signUp();
      setRegisteredEmail(form.email);
      setTimeout(() => router.push('/'), 3500);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Kayıt başarısız. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full pl-10 pr-4 py-3 text-sm rounded-xl border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all';

  /* ── Success screen ── */
  if (registeredEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">Hesabın oluşturuldu!</h1>
          <p className="text-muted-foreground text-[15px]">Bir adım kaldı</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-7 h-7 text-primary" />
          </div>
          <p className="font-bold text-lg mb-2">E-postanı kontrol et</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            <strong>{registeredEmail}</strong> adresine bir doğrulama bağlantısı gönderdik.
            Bağlantıya tıklayarak hesabını aktifleştir.
          </p>
          <p className="text-xs text-muted-foreground">
            Şimdi doğrulama zorunlu değil — ana sayfaya yönlendiriliyorsun…
          </p>
        </div>
      </motion.div>
    );
  }

  /* ── Register form ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[420px]"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Ücretsiz, Reklamsız
        </div>
        <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">Slaytim&apos;e katıl</h1>
        <p className="text-muted-foreground text-[15px]">Slayt paylaş, topluluğu büyüt</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* ── Username ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">Kullanıcı adı</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                name="username"
                type="text"
                required
                placeholder="kullaniciadiniz"
                value={form.username}
                onChange={(e) => {
                  // strip spaces, lowercase, keep only allowed chars + Turkish for detection
                  const val = e.target.value.replace(/\s/g, '').toLowerCase();
                  setForm({ ...form, username: val });
                  if (!usernameTouched) setUsernameTouched(true);
                }}
                className={cn(
                  inputBase,
                  usernameTouched && usernameError
                    ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive/60'
                    : 'border-border',
                )}
              />
            </div>
            <AnimatePresence>
              {usernameTouched && usernameError && (
                <motion.p
                  key="username-err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive font-medium flex items-start gap-1.5 pt-0.5"
                >
                  <X className="w-3.5 h-3.5 shrink-0 mt-px" />
                  {usernameError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ── Email ── */}
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
                className={cn(inputBase, 'border-border')}
              />
            </div>
          </div>

          {/* ── Password ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="En az 8 karakter"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                className={cn(
                  'w-full pl-10 pr-12 py-3 text-sm rounded-xl border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all',
                  passwordTouched && !allPasswordOk
                    ? 'border-amber-400/60 focus:ring-amber-400/20 focus:border-amber-400/60'
                    : passwordTouched && allPasswordOk
                    ? 'border-emerald-500/50 focus:ring-emerald-500/20 focus:border-emerald-500/50'
                    : 'border-border',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password checklist — appears once user starts typing */}
            <AnimatePresence>
              {passwordTouched && (
                <motion.div
                  key="pw-checklist"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-2 space-y-1.5 bg-muted/50 rounded-xl px-3.5 py-3">
                    {passwordChecks.map((rule) => (
                      <CheckItem key={rule.key} ok={rule.ok} label={rule.label} visible />
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-button hover:opacity-90 hover:shadow-button-hover transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Hesap oluşturuluyor…' : 'Ücretsiz Başla'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">veya</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Zaten üye misin?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline underline-offset-2">
            Giriş yap
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
