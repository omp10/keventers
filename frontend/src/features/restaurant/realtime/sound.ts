import { useSyncExternalStore } from 'react';

/**
 * Configurable notification sound for new orders. Uses the Web Audio API (no asset
 * files), so it's brand-neutral and instant. Enabled/volume persist in localStorage
 * and are reactive via a tiny store.
 */
type SoundSettings = { enabled: boolean; volume: number };
const KEY = 'kv-staff-sound';
const listeners = new Set<() => void>();

function read(): SoundSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { enabled: true, volume: 0.5, ...(JSON.parse(raw) as Partial<SoundSettings>) } : { enabled: true, volume: 0.5 };
  } catch {
    return { enabled: true, volume: 0.5 };
  }
}
let current = read();

export const soundSettings = {
  get: () => current,
  set(patch: Partial<SoundSettings>) {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

/** Play the new-order chime (respects the enabled flag + volume). */
export function playOrderSound(): void {
  const settings = current;
  if (!settings.enabled) return;
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime;
  // Two short ascending tones — a pleasant, non-jarring alert.
  [
    [880, now, 0.12],
    [1174, now + 0.13, 0.16],
  ].forEach(([freq, start, dur]) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(settings.volume * 0.6, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  });
}

export function useSoundSettings() {
  const settings = useSyncExternalStore(
    (cb) => soundSettings.subscribe(cb),
    () => soundSettings.get(),
    () => soundSettings.get(),
  );
  return {
    ...settings,
    setEnabled: (enabled: boolean) => soundSettings.set({ enabled }),
    setVolume: (volume: number) => soundSettings.set({ volume }),
    test: playOrderSound,
  };
}
