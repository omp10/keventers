import { useEffect, useRef, useState } from 'react';

import { qk, useQueryResource } from '@/platform/query';
import { loyaltyService } from '../services';
import type { LoyaltyAccount } from '../types';

/**
 * LoyaltyEarnBurst — the "toing app" points pop on the order screen. Loyalty is
 * awarded server-side on payment capture (async), so this polls the balance for
 * a short window after the order lands; the moment it jumps, it plays a coin
 * burst and counts the delta up to the new total. Renders nothing for cash /
 * unpaid orders where no points are earned.
 */
export function LoyaltyEarnBurst({ active = true }: { active?: boolean }) {
  const [polling, setPolling] = useState(active);
  const q = useQueryResource<LoyaltyAccount>(
    qk('loyalty', 'account'),
    () => loyaltyService.account(),
    { retry: false, refetchInterval: polling ? 2500 : false },
  );

  const baseline = useRef<number | null>(null);
  const tries = useRef(0);
  const [earned, setEarned] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  // Watch the balance: set a baseline on first read, then wait for it to rise.
  useEffect(() => {
    const bal = q.data?.balance;
    if (bal == null) return;
    if (baseline.current == null) {
      baseline.current = bal;
    } else if (earned == null && bal > baseline.current) {
      setEarned(bal - baseline.current);
      setPolling(false);
    }
    tries.current += 1;
    if (tries.current > 8) setPolling(false); // give up after ~20s
  }, [q.data?.balance, earned]);

  // Count the earned points up over ~1.2s once we know the delta.
  useEffect(() => {
    if (earned == null || earned <= 0) return;
    const steps = Math.min(earned, 40);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(Math.round((earned * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 1200 / steps);
    return () => clearInterval(id);
  }, [earned]);

  if (earned == null || earned <= 0) return null;

  const coins = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dx = Math.round(Math.cos(angle) * 70);
    const dy = Math.round(Math.sin(angle) * 70);
    return { dx, dy, delay: (i % 4) * 60, i };
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 to-primary-soft/30 p-4 text-center">
      <style>{`
        @keyframes kv-coin { 0% { transform: translate(0,0) scale(0); opacity: 0; } 20% { opacity: 1; transform: translate(calc(var(--dx)*0.4), calc(var(--dy)*0.4)) scale(1); } 100% { transform: translate(var(--dx), var(--dy)) scale(0.7); opacity: 0; } }
        @keyframes kv-points-pop { 0% { transform: scale(0.4); opacity: 0; } 55% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .kv-earn * { animation: none !important; } }
      `}</style>
      <div className="kv-earn">
        <div className="pointer-events-none absolute left-1/2 top-6">
          {coins.map((c) => (
            <span key={c.i} className="absolute text-lg" style={{ ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px`, animation: `kv-coin 1.4s ease-out ${c.delay}ms both` }}>⭐</span>
          ))}
        </div>
        <div style={{ animation: 'kv-points-pop 0.5s cubic-bezier(0.2,1.3,0.5,1) both' }}>
          <p className="text-3xl font-black tabular-nums text-primary">+{count}</p>
          <p className="text-sm font-semibold text-foreground">loyalty points earned!</p>
          {q.data?.balance != null && <p className="mt-0.5 text-xs text-foreground-muted">New balance: {q.data.balance} points</p>}
        </div>
      </div>
    </div>
  );
}
