'use client';

import Link from 'next/link';
import { X, Lock } from 'lucide-react';

interface Props {
  onClose: () => void;
}

/**
 * Small dismissible modal shown to guests when they try to use
 * a feature that requires authentication (like, save, comment…).
 *
 * - Backdrop click → closes
 * - X button in top-left corner → closes
 * - Links to /login and /register
 */
export function GuestAuthPrompt({ onClose }: Props) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      {/* Card — clicks don't bubble to backdrop */}
      <div
        className="relative bg-card border border-border rounded-2xl p-6 shadow-xl w-[290px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X — top-left */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-lg
                     text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mt-3 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <p className="font-bold text-sm mb-1">Giriş yapman gerekiyor</p>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            Bu özelliği kullanmak için hesabına giriş yap veya ücretsiz kayıt ol.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm
                         text-center hover:bg-primary/90 transition-colors shadow-button"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-border font-semibold text-sm
                         text-center hover:bg-muted transition-colors"
            >
              Ücretsiz Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
