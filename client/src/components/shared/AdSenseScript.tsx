'use client';

import Script from 'next/script';
import { useConsentStore } from '@/store/consent';

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export default function AdSenseScript() {
  const advertising = useConsentStore((s) => s.advertising);
  const decided = useConsentStore((s) => s.decided);

  // Reklam çerezleri onaylanmadıysa veya henüz karar verilmediyse script yükleme.
  if (!decided || !advertising || !PUBLISHER_ID) return null;

  return (
    <Script
      id="adsense-script"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`}
      crossOrigin="anonymous"
    />
  );
}
