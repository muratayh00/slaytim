'use client';

/**
 * SlideoAdInjector.tsx
 *
 * Slideo feed'ine reklam enjekte eden hook ve bileşenler.
 *
 * useSlideoFeedWithAds():
 *   Gerçek slideo öğelerini ve reklam slotlarını adConfig'deki
 *   adSchedule'a göre karıştırır. Döndürülen dizi doğrudan
 *   snap scroll container'ına render edilebilir.
 *
 * Kurallar (AD_CONFIG.slideo):
 *   - İlk 5 içerikten sonra static reklam
 *   - Her 10 içerikten sonra video reklam
 *   - Session başına max 4 video / 8 static
 *   - İki video arasında min 90 saniye
 *   - Video reklamlar varsayılan sessiz başlar
 *   - Video 5 saniye sonra geçilebilir
 */

import { useMemo } from 'react';
import { useAdEligibility } from '@/hooks/useAdEligibility';
import { useAdFrequencyStore } from '@/lib/adFrequencyManager';
import { AD_CONFIG, type SlideoAdScheduleEntry } from '@/lib/adConfig';
import type { SlideoItem } from '@/components/slideo/SlideoViewer';

// ── Feed item tipleri ─────────────────────────────────────────────────────────

export type SlideoFeedItem =
  | { kind: 'slideo'; item: SlideoItem; originalIndex: number }
  | { kind: 'static_ad'; key: string; scheduleEntry: SlideoAdScheduleEntry }
  | { kind: 'video_ad'; key: string; scheduleEntry: SlideoAdScheduleEntry };

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Slideo listesini adSchedule'a göre reklam slotlarıyla karıştırır.
 * Frekans limitlerini de kontrol eder — limit aşılmışsa reklam eklenmez.
 */
export function useSlideoFeedWithAds(slideos: SlideoItem[]): SlideoFeedItem[] {
  const { eligible } = useAdEligibility('slideo');
  const { canShowVideoAd, sessionVideoAdCount } = useAdFrequencyStore();

  const schedule = AD_CONFIG.slideo.adSchedule;
  const maxStatic = AD_CONFIG.slideo.maxStaticAdsPerSession;

  // Session başına static reklam sayısını takip et
  // (sessionVideoAdCount zaten store'dan geliyor)
  // Static sayısını yaklaşık olarak session_ad_count - sessionVideoAdCount'tan çıkar
  const { sessionAdCount } = useAdFrequencyStore();
  const staticShownSoFar = Math.max(0, sessionAdCount - sessionVideoAdCount);

  return useMemo(() => {
    // Reklam uygun değilse saf slideo listesi döner
    if (!eligible || slideos.length === 0) {
      return slideos.map((item, i) => ({
        kind: 'slideo' as const,
        item,
        originalIndex: i,
      }));
    }

    const result: SlideoFeedItem[] = [];
    let staticCount = staticShownSoFar;
    let videoCount = sessionVideoAdCount;

    for (let i = 0; i < slideos.length; i++) {
      const contentPosition = i + 1; // 1-indexed

      // Gerçek içerik ekle
      result.push({ kind: 'slideo', item: slideos[i], originalIndex: i });

      // Bu pozisyonda reklam var mı?
      const scheduled = schedule.find((entry: SlideoAdScheduleEntry) => entry.position === contentPosition);
      if (!scheduled) continue;

      if (scheduled.type === 'SLIDEO_STATIC_CARD') {
        if (staticCount >= maxStatic) continue;
        result.push({
          kind: 'static_ad',
          key: `static-ad-pos-${contentPosition}`,
          scheduleEntry: scheduled,
        });
        staticCount++;
      } else if (scheduled.type === 'SLIDEO_VIDEO_AD') {
        if (!canShowVideoAd()) continue;
        if (videoCount >= AD_CONFIG.slideo.maxVideoAdsPerSession) continue;
        result.push({
          kind: 'video_ad',
          key: `video-ad-pos-${contentPosition}`,
          scheduleEntry: scheduled,
        });
        videoCount++;
      }
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideos, eligible, staticShownSoFar, sessionVideoAdCount, canShowVideoAd, schedule, maxStatic]);
}

// ── Video Ad Card bileşeni ───────────────────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from 'react';
import { useConsentStore } from '@/store/consent';
import { useAdContext } from '@/components/ads/AdProvider';
import { observeAdViewability } from '@/lib/adViewability';
import { adEvents, getDeviceType } from '@/lib/adEvents';
import { Play, Volume2, VolumeX } from 'lucide-react';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;
const VIDEO_SLOT = AD_CONFIG.slotIds.SLIDEO_VIDEO_AD;
const STATIC_SLOT = AD_CONFIG.slotIds.SLIDEO_STATIC_CARD;

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

/**
 * Slideo feed'indeki video reklam kartı.
 * Gerçek slideo item'larıyla aynı snap noktasını kaplar.
 */
export function SlideoVideoAdCard({ adKey }: { adKey: string }) {
  const { pageType } = useAdContext();
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);
  const { recordVideoImpression, sessionAdCount, canShowVideoAd } = useAdFrequencyStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const viewabilityCleanup = useRef<(() => void) | null>(null);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState<boolean>(AD_CONFIG.slideo.mutedByDefault);
  const skipAfterMs = AD_CONFIG.slideo.videoSkipAfterSeconds * 1000;
  const placementLabel = 'slideo_video_ad';

  const initAd = useCallback(() => {
    if (initialized.current || !advertising || !decided || !PUBLISHER_ID || !VIDEO_SLOT) return;
    if (!canShowVideoAd()) return;
    try {
      initialized.current = true;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      recordVideoImpression();
      adEvents.impression({
        ad_slot: VIDEO_SLOT,
        placement: placementLabel,
        page_type: pageType,
        device_type: getDeviceType(),
        session_ad_count: sessionAdCount,
      });
    } catch {
      initialized.current = false;
    }
  }, [advertising, decided, pageType, sessionAdCount, canShowVideoAd, recordVideoImpression]);

  useEffect(() => {
    if (!advertising || !decided || !PUBLISHER_ID || !VIDEO_SLOT || !containerRef.current) return;

    const lazyObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          initAd();
          lazyObserver.disconnect();
          // Skip timer başlat
          const tick = setInterval(() => {
            setElapsed((p) => {
              const next = p + 100;
              if (next >= skipAfterMs) setSkipAvailable(true);
              return next;
            });
          }, 100);
          return () => clearInterval(tick);
        }
      },
      { threshold: 0.5 },
    );
    lazyObserver.observe(containerRef.current);

    viewabilityCleanup.current = observeAdViewability(
      containerRef.current,
      VIDEO_SLOT,
      (sid, visibleMs) =>
        adEvents.viewable({
          ad_slot: sid,
          placement: placementLabel,
          page_type: pageType,
          device_type: getDeviceType(),
          visible_ms: visibleMs,
          session_ad_count: sessionAdCount,
        }),
    );

    return () => {
      lazyObserver.disconnect();
      viewabilityCleanup.current?.();
    };
  }, [advertising, decided, skipAfterMs, pageType, sessionAdCount, initAd]);

  // Consent yok → invisible spacer (snap scroll'u bozmaz)
  if (!decided || !advertising || !PUBLISHER_ID || !VIDEO_SLOT) {
    return <div className="snap-start shrink-0 slideo-h bg-black" aria-hidden="true" />;
  }

  return (
    <div
      ref={containerRef}
      className="snap-start shrink-0 slideo-h bg-black flex flex-col items-center justify-center relative"
      data-slideo-video-ad={adKey}
    >
      {/* Etiket */}
      <span className="absolute top-3 left-4 z-10 text-[10px] font-bold text-white/50 tracking-widest uppercase select-none">
        {AD_CONFIG.global.sponsoredLabel}
      </span>

      {/* Ses kontrolü */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-3 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
      >
        {muted
          ? <VolumeX className="w-4 h-4 text-white" />
          : <Volume2 className="w-4 h-4 text-white" />
        }
      </button>

      {/* AdSense video slot */}
      <div className="w-full h-full flex items-center justify-center px-4">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={VIDEO_SLOT}
          data-ad-format="fluid"
          data-ad-layout-key="-fb+5w+4e-db+86"
          data-full-width-responsive="true"
        />
      </div>

      {/* Geç butonu */}
      {skipAvailable && (
        <button
          onClick={() => {
            adEvents.skipped({
              ad_slot: VIDEO_SLOT,
              placement: placementLabel,
              page_type: pageType,
              device_type: getDeviceType(),
              watched_seconds: elapsed / 1000,
            });
          }}
          className="absolute bottom-6 right-4 z-10 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-bold backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center gap-2"
        >
          Geç <Play className="w-3 h-3" fill="currentColor" />
        </button>
      )}

      {/* Skip countdown */}
      {!skipAvailable && (
        <div className="absolute bottom-6 right-4 z-10 px-3 py-1.5 rounded-xl bg-black/50 text-white/60 text-xs font-medium">
          {Math.ceil((skipAfterMs - elapsed) / 1000)}s sonra geç
        </div>
      )}
    </div>
  );
}
