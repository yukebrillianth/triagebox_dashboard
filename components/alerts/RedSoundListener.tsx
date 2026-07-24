'use client';

import { useEffect } from 'react';

import { useRealtime } from '@/hooks/use-realtime';

/** Minimal silent-ish WAV — HTMLAudioElement.play is mockable in Playwright. */
const BEEP_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

/**
 * Plays a one-shot beep when RealtimeProvider dispatches `triagebox:red-sound`.
 * Cooldown/dedup live in RealtimeProvider; this only respects soundEnabled.
 */
export function RedSoundListener() {
  const { soundEnabled } = useRealtime();

  useEffect(() => {
    const handler = () => {
      if (!soundEnabled) return;
      try {
        const audio = new Audio(BEEP_DATA_URI);
        void audio.play()?.catch(() => {
          /* autoplay policy / missing Audio — ignore */
        });
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('triagebox:red-sound', handler);
    return () => window.removeEventListener('triagebox:red-sound', handler);
  }, [soundEnabled]);

  return null;
}
