import { useSyncExternalStore } from 'react';

/**
 * KITCHEN AUDIO — configurable alert sounds for the KDS, generated with the Web
 * Audio API (no asset files → brand-neutral, instant). Distinct cues per event
 * (new order / priority / SLA warning / ready). Enabled + volume persist and are
 * reactive. Wired to the Socket Platform + Notification Platform by the realtime hook.
 */
export type KitchenSoundKind = 'new' | 'priority' | 'sla' | 'ready';

type AudioSettings = { enabled: boolean; volume: number };
const KEY = 'kv-kitchen-audio';
const listeners = new Set<() => void>();

function read(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { enabled: true, volume: 0.6, ...(JSON.parse(raw) as Partial<AudioSettings>) } : { enabled: true, volume: 0.6 };
  } catch {
    return { enabled: true, volume: 0.6 };
  }
}
let current = read();

export const kitchenAudio = {
  get: () => current,
  set(patch: Partial<AudioSettings>) {
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

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

// [frequency, startOffsetSec, durationSec] tone sequences per event kind.
const TONES: Record<KitchenSoundKind, [number, number, number][]> = {
  new: [[880, 0, 0.12], [1174, 0.13, 0.16]],
  priority: [[1046, 0, 0.1], [1046, 0.14, 0.1], [1318, 0.28, 0.18]],
  sla: [[660, 0, 0.18], [520, 0.2, 0.24]],
  ready: [[784, 0, 0.12], [988, 0.12, 0.12], [1318, 0.24, 0.18]],
};

export function playKitchenSound(kind: KitchenSoundKind): void {
  if (!current.enabled) return;
  const ac = audioCtx();
  if (!ac) return;
  // Chrome's autoplay policy suspends an AudioContext created before the first
  // user gesture; without this resume the tones are scheduled but never heard.
  if (ac.state === 'suspended') void ac.resume();
  const now = ac.currentTime;
  for (const [freq, start, dur] of TONES[kind]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(current.volume * 0.6, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  }
}

export function useKitchenAudio() {
  const settings = useSyncExternalStore(
    (cb) => kitchenAudio.subscribe(cb),
    () => kitchenAudio.get(),
    () => kitchenAudio.get(),
  );
  return {
    ...settings,
    setEnabled: (enabled: boolean) => kitchenAudio.set({ enabled }),
    setVolume: (volume: number) => kitchenAudio.set({ volume }),
    play: playKitchenSound,
    test: () => playKitchenSound('new'),
  };
}
