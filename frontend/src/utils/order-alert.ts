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
    return true;
  } catch {
    return false;
  }
}
