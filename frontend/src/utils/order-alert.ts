/**
 * ORDER ALERT — the real "ring" for new orders, shared by the KDS and the
 * staff app. Plays /sounds/new-order.mp3 (Mixkit service bell, free license).
 *
 * Browser autoplay policy: audio can only start after a user gesture, so the
 * first pointer/key interaction "unlocks" the element by playing it muted once.
 * A kitchen tablet or a staff phone is always touched at least once (login,
 * navigation), so by the time an order actually arrives the bell is unlocked.
 * `play()` failures are swallowed — callers keep their WebAudio fallback.
 */
const SRC = '/sounds/new-order.mp3';

let el: HTMLAudioElement | null = null;
let unlocked = false;

/**
 * Whether the browser is still blocking audio. A kitchen that thinks it will be
 * alerted but is silently muted is worse than no alert at all, so surfaces can
 * subscribe and show a "tap to enable sound" prompt.
 */
const lockListeners = new Set<(locked: boolean) => void>();
let audioLocked = true;
export function isAudioLocked(): boolean {
  return audioLocked;
}
export function onAudioLockChange(fn: (locked: boolean) => void): () => void {
  lockListeners.add(fn);
  return () => lockListeners.delete(fn);
}
function setLocked(v: boolean) {
  if (audioLocked === v) return;
  audioLocked = v;
  lockListeners.forEach((l) => { try { l(v); } catch { /* ignore */ } });
}

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio(SRC);
    el.preload = 'auto';
  }
  return el;
}

function unlock() {
  if (unlocked) return;
  const a = element();
  a.muted = true;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      unlocked = true;
      setLocked(false);
    })
    .catch(() => {
      /* not yet — the next gesture retries */
    });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

/**
 * Ring the bell. Resolves true if the file actually played, false otherwise —
 * callers use that to fall back to their synthesized tones.
 */
export async function playOrderAlert(volume = 1): Promise<boolean> {
  try {
    const a = element();
    a.volume = Math.min(1, Math.max(0, volume));
    a.currentTime = 0;
    await a.play();
    setLocked(false);
    return true;
  } catch {
    // Blocked by the autoplay policy — tell the UI so it can prompt, instead of
    // leaving the kitchen believing it will be alerted.
    setLocked(true);
    return false;
  }
}
