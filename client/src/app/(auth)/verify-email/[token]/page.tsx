'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('Link geçersiz veya süresi dolmuş');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }

    let cancelled = false;

    api
      .get(`/auth/verify-email/${token}`)
      .then(() => {
        if (!cancelled) setState('success');
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err?.response?.data?.error || 'Link geçersiz veya süresi dolmuş');
          setState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[420px]"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2.5 tracking-tight">E-posta Doğrulama</h1>
        <p className="text-muted-foreground text-[15px]">Hesabın doğrulanıyor…</p>
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
            <p className="font-bold text-lg">E-posta Doğrulandı!</p>
            <p className="text-sm text-muted-foreground">
              Hesabın başarıyla onaylandı. Artık tüm özelliklere erişebilirsin.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all"
            >
              Ana sayfaya git
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-bold text-lg">Doğrulama Başarısız</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-accent transition-all"
            >
              Ana sayfaya dön
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
