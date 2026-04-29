/**
 * adConfig.ts — Merkezi reklam konfigürasyonu.
 *
 * Tüm reklam davranışları bu dosyadan yönetilir.
 * Component koduna hiçbir zaman hardcoded placement mantığı ekleme.
 * Yeni placement veya kural eklemek için sadece bu dosyayı değiştir.
 */

// ── Tip tanımları ────────────────────────────────────────────────────────────

export type PageType =
  | 'home'
  | 'explore'
  | 'category'
  | 'topic_detail'
  | 'slide_detail'
  | 'slide_viewer'
  | 'slideo'
  | 'room_public'
  | 'room_private'
  | 'search'
  | 'profile'
  | 'collections'
  | 'upload'
  | 'auth'
  | 'admin'
  | 'legal'
  | 'notifications'
  | 'unknown';

export type AdPlacementType =
  | 'TOP_BANNER'
  | 'IN_FEED_NATIVE'
  | 'RIGHT_RAIL_1'
  | 'RIGHT_RAIL_2'
  | 'RIGHT_RAIL_3'
  | 'BOTTOM_BANNER'
  | 'STICKY_BOTTOM_MOBILE'
  | 'SLIDEO_STATIC_CARD'
  | 'SLIDEO_VIDEO_AD'
  | 'REWARDED_AD'
  | 'SPONSOR_CARD'
  | 'PREMIUM_UPSELL_CARD';

/** Reklamların tamamen kapalı olduğu sayfalar */
export const DISABLED_AD_PAGES: PageType[] = [
  'auth',
  'admin',
  'legal',
  'notifications',
  'room_private',
  'upload',
];

// ── Slideo ad schedule tipi ──────────────────────────────────────────────────

export interface SlideoAdScheduleEntry {
  /** 1-indexed content position after which the ad appears */
  position: number;
  type: 'SLIDEO_STATIC_CARD' | 'SLIDEO_VIDEO_AD';
}

// ── Ana config ───────────────────────────────────────────────────────────────

export const AD_CONFIG = {
  global: {
    /** Premium kullanıcılar asla reklam görmez */
    disabledForPremium: true,
    /** Admin kullanıcılar asla reklam görmez */
    disabledForAdmin: true,
    /** Bu sayfalarda reklamlar tamamen kapalı */
    disabledPages: DISABLED_AD_PAGES,
    /** Tüm reklam slotları lazy-load */
    lazyLoad: true,
    /** Aynı sayfada iki reklam arasındaki minimum süre (saniye) */
    minSecondsBetweenAds: 45,
    /** Reklam etiket metni */
    adLabel: 'Reklam',
    /** Sponsorlu içerik etiket metni */
    sponsoredLabel: 'Sponsorlu',
    /** Reklam yüklenemezse premium CTA göster */
    fallbackToPremiumUpsell: true,
  },

  mobile: {
    /** Mobilde ilk ekranda reklam gösterme */
    noAdsAboveTheFold: true,
    /** Sayfa başına max reklam sayısı */
    maxAdsPerPage: 3,
    /** Sticky bottom banner aktif mi */
    stickyBottomEnabled: true,
    /** Sticky banner ilk gösterim gecikmesi (saniye) */
    stickyBottomDelaySeconds: 30,
    /** Oturum başına max sticky gösterim */
    maxStickyPerSession: 1,
  },

  desktop: {
    maxAdsPerPage: 6,
    rightRailEnabled: true,
  },

  /** Sayfa bazlı placement kuralları */
  pages: {
    home: {
      desktop: {
        topBanner: true,
        /** Her N içerik kartından sonra 1 native */
        inFeedEvery: 8,
        rightRail: true,
        bottomBanner: true,
      },
      mobile: {
        firstAdAfterCard: 6,
        secondAdAfterCard: 16,
        bottomBanner: true,
      },
    },

    explore: {
      desktop: {
        /** İlk kaç kartta reklam yok */
        noAdBeforeCard: 5,
        /** Explicit pozisyonlar (1-indexed) */
        inFeedPositions: [6, 14, 24] as number[],
        rightRailCount: 2,
      },
      mobile: {
        noAdBeforeCard: 5,
        inFeedEvery: 10,
        firstAdAfterCard: 5,
        stickyBottomDelaySeconds: 30,
      },
    },

    category: {
      desktop: {
        topBanner: true,
        inFeedEvery: 8,
        rightRailCount: 3,
        bottomBanner: true,
      },
      mobile: {
        firstAdAfterCard: 7,
        secondAdAfterCard: 18,
        bottomBanner: true,
      },
      /** Kategori sponsorluğu: "Bu kategori X markasının katkılarıyla sunulur." */
      categorySponsorshipEnabled: true,
    },

    topic_detail: {
      desktop: {
        topBanner: true,
        /** Belirli entry/yorum pozisyonlarında (1-indexed) native */
        inFeedPositions: [3, 10] as number[],
        rightRailCount: 3,
        bottomBanner: true,
      },
      mobile: {
        firstAdAfterEntry: 4,
        secondAdAfterEntry: 12,
        bottomBanner: true,
        /** Uzun oturumda sticky bottom göster */
        stickyOnLongSession: true,
      },
    },

    slide_detail: {
      desktop: {
        topBanner: true,
        rightRail: true,
        midContent: true,
        /** Benzer slaytlar feed'inde her N kartta native */
        relatedFeedEvery: 8,
        bottomBanner: true,
      },
      mobile: {
        firstAdAfterPreview: true,
        afterDescription: true,
        relatedFeedNative: true,
      },
      /** İndirme butonu yanında premium CTA */
      showPremiumDownloadCta: true,
    },

    slide_viewer: {
      desktop: {
        rightExternalRail: true,
        /** N. slayttan sonra içerik akışında düz reklam kartı */
        adCardAfterSlide: 7,
        /** Tam ekran modunda asla reklam gösterme */
        noFullscreenAds: true,
      },
      mobile: {
        firstAdAfterSlide: 4,
        secondAdAfterSlide: 10,
        noFullscreenAds: true,
      },
    },

    room_public: {
      desktop: {
        listPageNative: true,
        topicsListEvery: 8,
        rightRailCount: 2,
      },
      /** Sponsorlu oda kartları */
      sponsoredRoomCard: true,
    },

    search: {
      desktop: {
        /** Sonuçların en üstünde sponsorlu sonuç */
        sponsoredResults: true,
        firstAdAfterResult: 5,
        secondAdAfterResult: 12,
        rightRailCount: 2,
      },
      mobile: {
        firstAdAfterResult: 5,
        secondAdAfterResult: 12,
        bottomBanner: true,
      },
    },

    profile: {
      desktop: {
        slideListEvery: 10,
        rightRail: true,
      },
      mobile: {
        firstAdAfterCard: 10,
      },
    },

    collections: {
      desktop: {
        gridEvery: 10,
        rightRailCount: 2,
      },
      mobile: {
        gridEvery: 12,
      },
    },
  },

  /**
   * AdSense slot ID'leri — env var'lardan runtime'da okunur.
   * Boş string = o slot henüz tanımlanmamış → sessizce atla.
   */
  slotIds: {
    TOP_BANNER:           process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP_BANNER     || '',
    IN_FEED_NATIVE:       process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_FEED        || '',
    RIGHT_RAIL_1:         process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT_RAIL_1   || '',
    RIGHT_RAIL_2:         process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT_RAIL_2   || '',
    RIGHT_RAIL_3:         process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT_RAIL_3   || '',
    BOTTOM_BANNER:        process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM_BANNER  || '',
    STICKY_BOTTOM_MOBILE: process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY_MOBILE  || '',
    SLIDEO_STATIC_CARD:   process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDEO_INFEED  || '',
    SLIDEO_VIDEO_AD:      process.env.NEXT_PUBLIC_ADSENSE_SLOT_SLIDEO_VIDEO   || '',
    REWARDED_AD:          process.env.NEXT_PUBLIC_ADSENSE_SLOT_REWARDED       || '',
    SPONSOR_CARD:         process.env.NEXT_PUBLIC_ADSENSE_SLOT_SPONSOR_CARD   || '',
    PREMIUM_UPSELL_CARD:  '',
  } as Record<AdPlacementType, string>,

  /** Slideo feed reklam kuralları — session-scoped, sayfa tipinden bağımsız */
  slideo: {
    /** İlk N içerikten sonra ilk reklam */
    firstAdAfterItems: 5,
    staticAdEvery: 5,
    videoAdEvery: 10,
    /** Video reklamı geçilebilir olma süresi (saniye) */
    videoSkipAfterSeconds: 5,
    /** Oturum başına max video reklam */
    maxVideoAdsPerSession: 4,
    /** Oturum başına max static reklam */
    maxStaticAdsPerSession: 8,
    /** İki video reklam arasında minimum süre (saniye) */
    minSecondsBetweenVideoAds: 90,
    /** Video reklamlar varsayılan sessiz başlar */
    mutedByDefault: true,
    /**
     * Mutlak pozisyon takvimi (1-indexed içerik sayısı).
     * position:5 → 5. gerçek içerikten SONRA bu reklam slotu eklenir.
     */
    adSchedule: [
      { position: 5,  type: 'SLIDEO_STATIC_CARD' as const },
      { position: 10, type: 'SLIDEO_VIDEO_AD'    as const },
      { position: 15, type: 'SLIDEO_STATIC_CARD' as const },
      { position: 20, type: 'SLIDEO_VIDEO_AD'    as const },
      { position: 25, type: 'SLIDEO_STATIC_CARD' as const },
      { position: 30, type: 'SLIDEO_VIDEO_AD'    as const },
    ] as SlideoAdScheduleEntry[],
  },

  rewarded: {
    enabledForDownloads: true,
    optInRequired: true,
    rewardType: 'download_unlock' as const,
  },
} as const;
