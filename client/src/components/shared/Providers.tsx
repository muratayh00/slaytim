'use client';

import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { startTelemetryBuffer, stopTelemetryBuffer } from '@/lib/telemetryBuffer';

export default function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    startTelemetryBuffer();
    return () => stopTelemetryBuffer();
  }, [hydrate]);

  return <MotionConfig reducedMotion="always">{children}</MotionConfig>;
}
