'use client';

import { useEffect, useRef } from 'react';

import { useRealtime } from '@/hooks/use-realtime';

/**
 * Short dual-tone RED alert WAV (PCM 16-bit mono @ 22.05 kHz).
 * Built once at module load so every play path shares the same non-silent buffer.
 */
function buildRedAlertWavDataUri(): string {
  const sampleRate = 22_050;
  const durationSec = 0.42;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 40) * Math.max(0, 1 - t / durationSec);
    const toneA = Math.sin(2 * Math.PI * 880 * t);
    const toneB = Math.sin(2 * Math.PI * 1175 * t);
    const pulse = Math.sin(2 * Math.PI * 8 * t) > 0 ? 1 : 0.35;
    const sample = (toneA * 0.55 + toneB * 0.45) * envelope * pulse * 0.85;
    const intSample = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      44 + i * 2,
      intSample < 0 ? intSample * 0x8000 : intSample * 0x7fff,
      true
    );
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const BEEP_DATA_URI = buildRedAlertWavDataUri();

/**
 * Plays a one-shot beep when RealtimeProvider dispatches `triagebox:red-sound`.
 * Cooldown/dedup live in RealtimeProvider; this only respects soundEnabled.
 */
export function RedSoundListener() {
  const { soundEnabled } = useRealtime();
  const unlockedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ensureAudioElement = () => {
      if (audioRef.current) return audioRef.current;
      const audio = new Audio(BEEP_DATA_URI);
      audio.preload = 'auto';
      audio.volume = 1;
      audioRef.current = audio;
      return audio;
    };

    const unlock = async () => {
      if (unlockedRef.current) return;
      try {
        const audio = ensureAudioElement();
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;

        const AudioContextCtor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (AudioContextCtor) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContextCtor();
          }
          if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
        }

        unlockedRef.current = true;
      } catch (error) {
        console.warn('TriageBox RED sound unlock failed.', error);
      }
    };

    const playFallbackTone = async () => {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('Web Audio API unavailable');
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextCtor();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      gain.connect(ctx.destination);

      const oscA = ctx.createOscillator();
      oscA.type = 'square';
      oscA.frequency.setValueAtTime(880, now);
      oscA.connect(gain);
      oscA.start(now);
      oscA.stop(now + 0.4);

      const oscB = ctx.createOscillator();
      oscB.type = 'square';
      oscB.frequency.setValueAtTime(1175, now);
      oscB.connect(gain);
      oscB.start(now + 0.08);
      oscB.stop(now + 0.4);
    };

    const playBeep = async () => {
      if (!soundEnabled) return;
      try {
        const audio = ensureAudioElement();
        audio.currentTime = 0;
        audio.volume = 1;
        await audio.play();
      } catch (primaryError) {
        console.warn(
          'TriageBox RED sound HTMLAudio playback failed.',
          primaryError
        );
        try {
          await playFallbackTone();
        } catch (fallbackError) {
          console.error('TriageBox RED sound playback failed.', fallbackError);
        }
      }
    };

    const onRedSound = () => {
      void playBeep();
    };

    const gestureEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
    ];
    const onGesture = () => {
      void unlock();
    };

    for (const eventName of gestureEvents) {
      window.addEventListener(eventName, onGesture, { passive: true });
    }
    window.addEventListener('triagebox:red-sound', onRedSound);

    return () => {
      for (const eventName of gestureEvents) {
        window.removeEventListener(eventName, onGesture);
      }
      window.removeEventListener('triagebox:red-sound', onRedSound);
    };
  }, [soundEnabled]);

  return null;
}
