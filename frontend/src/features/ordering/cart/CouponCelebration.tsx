import { useEffect, useState } from 'react';

/**
 * CouponCelebration — a one-shot balloon-burst + confetti overlay that plays
 * when a coupon is successfully applied. Pure CSS/SVG, no libraries: balloons
 * rise and pop, confetti bursts from the centre, and a badge pops in with the
 * code. Auto-dismisses; `pointer-events-none` so it never blocks the cart.
 *
 * `token` is a changing value (e.g. the applied code + a nonce) — a new token
 * replays the animation even for the same code applied twice.
 */
const BALLOON_COLORS = ['#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];
const CONFETTI_COLORS = ['#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];

export function CouponCelebration({ token, code, savedLabel }: { token: string | number; code?: string; savedLabel?: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (token === '' || token == null) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [token]);

  if (!show) return null;

  // Deterministic spread (no Math.random needed): fan the balloons across the
  // width and stagger their start.
  const balloons = Array.from({ length: 9 }, (_, i) => {
    const leftPct = 8 + (i * 84) / 8; // 8%..92%
    const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
    const delay = (i % 5) * 90;
    const drift = (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 6);
    return { leftPct, color, delay, drift, i };
  });

  const confetti = Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * Math.PI * 2;
    const dist = 90 + (i % 5) * 26;
    const dx = Math.round(Math.cos(angle) * dist);
    const dy = Math.round(Math.sin(angle) * dist);
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const delay = (i % 6) * 20;
    return { dx, dy, color, delay, i };
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[1200] overflow-hidden" aria-hidden>
      <style>{`
        @keyframes kv-balloon-rise { 0% { transform: translateY(20px) scale(0.6); opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 88% { transform: translateY(var(--rise)) translateX(var(--drift)) scale(1); opacity: 1; } 100% { transform: translateY(var(--rise)) translateX(var(--drift)) scale(1.35); opacity: 0; } }
        @keyframes kv-confetti-burst { 0% { transform: translate(0,0) scale(0); opacity: 0; } 15% { opacity: 1; transform: translate(calc(var(--dx)*0.3), calc(var(--dy)*0.3)) scale(1); } 100% { transform: translate(var(--dx), calc(var(--dy) + 120px)) rotate(320deg) scale(0.9); opacity: 0; } }
        @keyframes kv-badge-pop { 0% { transform: scale(0.3); opacity: 0; } 45% { transform: scale(1.15); opacity: 1; } 65% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes kv-badge-out { to { opacity: 0; transform: translateY(-8px) scale(0.9); } }
        @media (prefers-reduced-motion: reduce) { .kv-cel * { animation-duration: 0.01ms !important; } }
      `}</style>

      <div className="kv-cel absolute inset-0">
        {/* Balloons rising from the bottom */}
        {balloons.map((b) => (
          <div
            key={`b${b.i}`}
            className="absolute bottom-[-64px]"
            style={{
              left: `${b.leftPct}%`,
              // rise most of the viewport
              ['--rise' as string]: '-70vh',
              ['--drift' as string]: `${b.drift}px`,
              animation: `kv-balloon-rise 2s cubic-bezier(0.25,0.9,0.4,1) ${b.delay}ms both`,
            }}
          >
            <svg width="34" height="46" viewBox="0 0 34 46" fill="none">
              <ellipse cx="17" cy="17" rx="15" ry="17" fill={b.color} />
              <ellipse cx="12" cy="11" rx="4" ry="5" fill="#ffffff" opacity="0.35" />
              <path d="M17 34 l-3 4 h6 z" fill={b.color} />
              <path d="M17 38 q4 6 0 8" stroke="#94a3b8" strokeWidth="1" fill="none" />
            </svg>
          </div>
        ))}

        {/* Confetti burst from the centre */}
        <div className="absolute left-1/2 top-[38%]">
          {confetti.map((c) => (
            <span
              key={`c${c.i}`}
              className="absolute block h-2 w-2 rounded-[2px]"
              style={{
                background: c.color,
                ['--dx' as string]: `${c.dx}px`,
                ['--dy' as string]: `${c.dy}px`,
                animation: `kv-confetti-burst 1.6s ease-out ${c.delay}ms both`,
              }}
            />
          ))}
        </div>

        {/* Centre badge */}
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
          <div
            className="flex flex-col items-center gap-1 rounded-2xl bg-surface/95 px-5 py-4 text-center shadow-xl ring-1 ring-success/30 backdrop-blur"
            style={{ animation: 'kv-badge-pop 0.5s cubic-bezier(0.2,1.3,0.5,1) both, kv-badge-out 0.4s ease-in 1.7s forwards' }}
          >
            <span className="text-2xl">🎉</span>
            <p className="text-sm font-bold text-foreground">{code ? `${code} applied!` : 'Coupon applied!'}</p>
            {savedLabel && <p className="text-xs font-semibold text-success">You saved {savedLabel}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
