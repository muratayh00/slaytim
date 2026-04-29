'use client';

/**
 * RewardedAdModal.tsx — Kullanıcı opt-in tabanlı rewarded reklam.
 *
 * Kullanıcı reklamı izlemeyi seçtiğinde (indirme kilidi açma, vb.)
 * bir video/tam sayfa reklam gösterilir ve tamamlanınca ödül verilir.
 *
 * Kurallar:
 *  - optInRequired: true → kullanıcı kendi seçmeden reklam başlamaz
 *  - Varsayılan sessiz (mutedByDefault değil; rewarded reklamda ses açık olabilir)
 *  - 5 saniye sonra geçilebilir (videoSkipAfterSeconds)
 *  - onComplete callback → ödülü ver (indirme izni vb.)
 *
 * Kullanım:
 *   <RewardedAdModal
 *     open={showRewardedAd}
 *     onComplete={() => triggerDownload()}
 *     onClose={() => setShowRewardedAd(false)}
 *     rewardLabel="İndirme kilidini aç"
 *   />
 *
 * Not: AdSense rewarded birim gerçek video reklam yönetimi sağlar.
 * Bu bileşen opt-in UI + fallback zamanlayıcıyı yönetir.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Gift, Loader2 } from 'lucide-react';
import { useConsentStore } from '@/store/consent';
import { useAdContext } from '@/components/ads/AdProvider';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';
import { AD_CONFIG } from '@/lib/adConfig';
import { adEvents, getDeviceType } from '@/lib/adEvents';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;
const SLOT = AD_CONFIG.slotIds.REWARDED_AD;

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

// Simüle reward süresi (gerçek AdSense video rewarded kullanılıyorsa AdSense callback'i devralır)
const SIMULATED_AD_DURATION_MS = 15_000;
const SKIP_AFTER_MS = AD_CONFIG.slideo.videoSkipAfterSeconds * 1000;

interface RewardedAdModalProps {
  open: boolean;
  /** Reklam tamamlandığında ödülü ver */
  onComplete: () => void;
  /** Modal kapatıldı (ödül verilmedi) */
  onClose: () => void;
  /** "İndirme kilidini aç" gibi kullanıcıya gösterilen ödül açıklaması */
  rewardLabel?: string;
}

type Phase = 'opt_in' | 'loading' | 'playing' | 'complete';

export default function RewardedAdModal({
  open,
  onComplete,
  onClose,
  rewardLabel = 'İçeriğin kilidini aç',
}: RewardedAdModalProps) {
  const { pageType, pageContext } = useAdContext();
  const advertising = useConsentStore((s) => s.advertising);
  const { recordVideoImpression, canShowVideoAd, sessionAdCount } = useAdFrequencyStore();

  const [phase, setPhase] = useState<Phase>('opt_in');
  const [elapsed, setElapsed] = useState(0);
  const [skipAvailable, setSkipAvailable] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const placementLabel = `${pageType}_rewarded`;

  const canShow = advertising && Boolean(PUBLISHER_ID) && Boolean(SLOT);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase('opt_in');
      setElapsed(0);
      setSkipAvailable(false);
      initialized.current = false;
    }
  }, [open]);

  // Reklam başlat
  const startAd = useCallback(() => {
    if (!canShow || !canShowVideoAd()) {
      // Ödülü direkt ver (reklam gösterilemez durumda)
      setPhase('complete');
      onComplete();
      return;
    }

    setPhase('loading');

    setTimeout(() => {
      setPhase('playing');
      if (!initialized.current && PUBLISHER_ID && SLOT) {
        try {
          initialized.current = true;
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          recordVideoImpression();
          adEvents.rewardedStarted({
            ad_slot: SLOT,
            placement: placementLabel,
            page_type: pageType,
            device_type: getDeviceType(),
            session_ad_count: sessionAdCount,
            category_id: pageContext.categoryId,
            topic_id: pageContext.topicId,
            slide_id: pageContext.slideId,
          });
        } catch {
          // AdSense hazır değil — fallback timer devreye giriyor
        }
      }

      // Skip butonu ve ilerleme için timer
      tickRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 100;
          if (next >= SKIP_AFTER_MS) setSkipAvailable(true);
          if (next >= SIMULATED_AD_DURATION_MS) {
            clearInterval(tickRef.current!);
            handleComplete();
          }
          return next;
        });
      }, 100);
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShow, canShowVideoAd, placementLabel, pageType, sessionAdCount, recordVideoImpression, pageContext]);

  const handleComplete = useCallback(() => {
    setPhase('complete');
    if (SLOT) {
      adEvents.rewardedCompleted({
        ad_slot: SLOT,
        placement: placementLabel,
        page_type: pageType,
        device_type: getDeviceType(),
        reward_type: AD_CONFIG.rewarded.rewardType,
      });
    }
    onComplete();
  }, [placementLabel, pageType, onComplete]);

  const handleSkip = useCallback(() => {
    if (!skipAvailable) return;
    clearInterval(tickRef.current!);
    adEvents.skipped({
      ad_slot: SLOT || '',
      placement: placementLabel,
      page_type: pageType,
      device_type: getDeviceType(),
      watched_seconds: elapsed / 1000,
    });
    onClose();
  }, [skipAvailable, elapsed, placementLabel, pageType, onClose]);

  const handleClose = () => {
    clearInterval(tickRef.current!);
    if (phase === 'playing') {
      adEvents.closed({
        ad_slot: SLOT || '',
        placement: placementLabel,
        page_type: pageType,
        device_type: getDeviceType(),
      });
    }
    onClose();
  };

  useEffect(() => () => clearInterval(tickRef.current!), []);

  const progress = Math.min(100, (elapsed / SIMULATED_AD_DURATION_MS) * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl bg-card border border-border overflow-hidden shadow-2xl"
          >
            {/* Opt-in aşaması */}
            {phase === 'opt_in' && (
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-extrabold mb-2">{rewardLabel}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Kısa bir reklam izleyerek bu içeriğe ücretsiz erişebilirsin. (~15 saniye)
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={startAd}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                    Reklamı İzle
                  </button>
                </div>
              </div>
            )}

            {/* Yükleniyor */}
            {phase === 'loading' && (
              <div className="p-8 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Reklam yükleniyor...</p>
              </div>
            )}

            {/* Oynatılıyor */}
            {phase === 'playing' && (
              <div>
                {/* AdSense rewarded slot */}
                <div ref={containerRef} className="w-full bg-black aspect-video flex items-center justify-center relative">
                  <ins
                    className="adsbygoogle"
                    style={{ display: 'block', width: '100%', height: '100%' }}
                    data-ad-client={PUBLISHER_ID || ''}
                    data-ad-slot={SLOT || ''}
                    data-ad-format="fluid"
                    data-full-width-responsive="true"
                  />
                  {/* Fallback içerik (AdSense dolmazsa görünür) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white/30">
                      <Play className="w-10 h-10 mx-auto mb-2" fill="currentColor" />
                      <p className="text-xs">Reklam yükleniyor...</p>
                    </div>
                  </div>
                </div>

                {/* İlerleme + geç butonu */}
                <div className="p-4">
                  <div className="w-full h-1 bg-muted rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {Math.ceil((SIMULATED_AD_DURATION_MS - elapsed) / 1000)}s kaldı
                    </span>
                    <button
                      onClick={handleSkip}
                      disabled={!skipAvailable}
                      className="text-xs font-bold text-primary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                    >
                      {skipAvailable ? 'Geç →' : `${Math.ceil((SKIP_AFTER_MS - elapsed) / 1000)}s sonra geç`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tamamlandı */}
            {phase === 'complete' && (
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-extrabold mb-2">Kilit Açıldı!</h3>
                <p className="text-sm text-muted-foreground mb-4">İçerik hazır.</p>
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                >
                  Devam Et
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
