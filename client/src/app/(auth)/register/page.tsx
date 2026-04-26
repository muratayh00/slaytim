'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, Sparkles, MailCheck } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { analytics } from '@/lib/analytics';

export default function RegisterPage() {
  const { register } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Şifre en az 8 karakter olmalı');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      analytics.signUp();
      setRegisteredEmail(form.email);
      // Redirect after brief delay so user sees the success notice
      setTimeout(() => router.push('/'), 3500);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 focus:bg-card transition-all';

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
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Kullanıcı adı', type: 'text', icon: User, key: 'username', placeholder: 'kullaniciadiniz' },
            { label: 'E-posta', type: 'email', icon: Mail, key: 'email', placeholder: 'ornek@email.com' },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/90">{field.label}</label>
              <div className="relative">
                <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  name={field.key}
                  type={field.type}
                  required
                  placeholder={field.placeholder}
                  value={(form as any)[field.key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field.key]:
                        field.key === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/90">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="En az 8 karakter"
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
