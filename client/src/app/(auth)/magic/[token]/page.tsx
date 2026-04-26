'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type State = 'loading' | 'success' | 'error';

export default function MagicLoginPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { hydrate } = useAuthStore();
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('Link geçersiz veya süresi dolmuş');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }

    let cancelled = false;

    api
      .post(`/auth/magic/${token}`)
      .then(async (res) => {
        if (cancelled) return;
        // Persist token/user to Zustand store via hydrate
        if (res.data?.token) {
          // Store sets cookie via API; just sync local state
          await hydrate().catch(() => {});
        }
        setState('success');
        setTimeout(() => {
          if (!cancelled) router.push('/');
        }, 2000);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(
          err?.response?.data?.error || 'Link geçersiz veya süresi dolmuş',
        );
        setState('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[420px]"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">Giriş Yapılıyor</h1>
        <p className="text-muted-foreground text-[15px]">Magic link doğrulanıyor…</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card text-center">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Lütfen bekle…</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-bold text-lg">Giriş başarılı!</p>
            <p className="text-sm text-muted-foreground">Ana sayfaya yönlendiriliyorsun…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-bold text-lg">Giriş Yapılamadı</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all"
            >
              Giriş sayfasına dön
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
