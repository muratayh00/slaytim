'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useConsentStore } from '@/store/consent';
import { useAuthStore } from '@/store/auth';

export default function CookieBanner() {
  const { user, isLoading } = useAuthStore();
  const { decided, hasHydrated, acceptAll, rejectAll, setConsent, analytics, advertising } =
    useConsentStore();
  const [showDetails, setShowDetails] = useState(false);
  const [localAnalytics, setLocalAnalytics] = useState(analytics);
  const [localAds, setLocalAds] = useState(advertising);

  if (!hasHydrated || isLoading) return null;
  if (user) return null;
  if (decided) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl" aria-hidden>🍪</span>
            <div>
              <h2 className="font-semibold text-card-foreground text-sm md:text-base">
                Çerez Tercihleriniz
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                Slaytim olarak deneyiminizi iyileştirmek, site kullanımını analiz etmek ve kişiselleştirilmiş
                reklamlar sunmak için çerezler kullanıyoruz. Tercihlerinizi yönetebilir ya da tümünü kabul
                edebilirsiniz.{' '}
                <Link href="/cerez-politikasi" className="text-primary underline underline-offset-2 hover:opacity-80">
                  Çerez Politikası
                </Link>{' '}
                ve{' '}
                <Link href="/kvkk" className="text-primary underline underline-offset-2 hover:opacity-80">
                  KVKK Aydınlatma
                </Link>
              </p>
            </div>
          </div>

          {showDetails && (
            <div className="mb-4 space-y-3 border border-border/60 rounded-xl p-4 bg-muted/30">
              <ConsentToggle
                label="Zorunlu Çerezler"
                description="Oturum ve güvenlik için gerekli. Kapatılamaz."
                checked={true}
                disabled
              />
              <ConsentToggle
                label="Analitik Çerezler"
                description="Sayfa görüntüleme ve trafik analizi (Google Analytics vb.)."
                checked={localAnalytics}
                onChange={setLocalAnalytics}
              />
              <ConsentToggle
                label="Reklam Çerezleri"
                description="Kişiselleştirilmiş reklam gösterimi (Google AdSense vb.)."
                checked={localAds}
                onChange={setLocalAds}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="text-xs md:text-sm px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted/50 transition-colors"
            >
              {showDetails ? 'Gizle' : 'Özelleştir'}
            </button>
            <button
              onClick={rejectAll}
              className="text-xs md:text-sm px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted/50 transition-colors"
            >
              Yalnızca Zorunlu
            </button>
            {showDetails ? (
              <button
                onClick={() => setConsent({ analytics: localAnalytics, advertising: localAds })}
                className="text-xs md:text-sm px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Seçimi Kaydet
              </button>
            ) : (
              <button
                onClick={acceptAll}
                className="text-xs md:text-sm px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Tümünü Kabul Et
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-card-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative flex-shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
