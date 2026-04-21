'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useConsentStore } from '@/store/consent';
import { useAuthStore } from '@/store/auth';

export default function CookieBanner() {
  const { user, isLoading } = useAuthStore();
  const {
    decided,
    hasHydrated,
    panelOpen,
    acceptAll,
    rejectAll,
    setConsent,
    analytics,
    advertising,
    closePanel,
  } = useConsentStore();

  const [showDetails, setShowDetails] = useState(false);
  const [localAnalytics, setLocalAnalytics] = useState(analytics);
  const [localAds, setLocalAds] = useState(advertising);

  useEffect(() => {
    setLocalAnalytics(analytics);
    setLocalAds(advertising);
  }, [analytics, advertising, panelOpen]);

  if (!hasHydrated || isLoading) return null;
  if (user && !panelOpen) return null;
  if (!panelOpen && decided) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-5">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm text-foreground">Çerez Tercihleriniz</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Deneyiminizi iyileştirmek ve kişiselleştirilmiş içerik sunmak için çerezler kullanıyoruz.{' '}
                <Link href="/cerez-politikasi" className="text-primary hover:underline font-medium">
                  Çerez Politikası
                </Link>{' '}
                ve{' '}
                <Link href="/kvkk" className="text-primary hover:underline font-medium">
                  KVKK Aydınlatma
                </Link>{' '}
                metinlerimizi inceleyebilirsiniz.
              </p>
            </div>
            {panelOpen && decided && (
              <button
                type="button"
                onClick={closePanel}
                className="shrink-0 w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Detailed toggles */}
          {showDetails && (
            <div className="mt-4 space-y-2 border border-border/60 rounded-xl p-4 bg-muted/20">
              <ConsentToggle
                label="Zorunlu Çerezler"
                description="Oturum ve güvenlik için gerekli. Devre dışı bırakılamaz."
                checked={true}
                disabled
              />
              <div className="h-px bg-border/60" />
              <ConsentToggle
                label="Analitik Çerezler"
                description="Sayfa görüntüleme ve trafik analizi (Google Analytics)."
                checked={localAnalytics}
                onChange={setLocalAnalytics}
              />
              <div className="h-px bg-border/60" />
              <ConsentToggle
                label="Reklam Çerezleri"
                description="Kişiselleştirilmiş reklam gösterimi (Google AdSense)."
                checked={localAds}
                onChange={setLocalAds}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 px-5 pb-4 justify-between">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? 'Gizle' : 'Özelleştir'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={rejectAll}
              className="text-xs px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors font-semibold"
            >
              Yalnızca Zorunlu
            </button>
            {showDetails ? (
              <button
                onClick={() => setConsent({ analytics: localAnalytics, advertising: localAds })}
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                Seçimi Kaydet
              </button>
            ) : (
              <button
                onClick={acceptAll}
                className="text-xs px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
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
    <div className="flex items-start justify-between gap-4 py-0.5">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative shrink-0 mt-0.5 w-10 h-[22px] rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? 'bg-primary' : 'bg-border'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
