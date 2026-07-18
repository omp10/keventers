import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';

import { Badge } from '@/design-system';
import { transitions } from '@/animations';
import { cn } from '@/lib/cn';
import { formatMinutes, ORDER_STATUS_PRESENTATION } from '../format';
import type { Order, OrderStatus } from '../types';

/**
 * OrderTrackingHero — the live, animated heart of the tracking page. One scene
 * per status (receipt → check → CHEF COOKING → bag → celebration), cross-faded
 * as realtime updates land. Everything is inline SVG on theme tokens (no image
 * assets, white-label safe) and every loop collapses to a static frame under
 * reduced motion.
 */

/* ── tiny shared pieces ──────────────────────────────────────────────────── */

const loop = (reduced: boolean, animate: TargetAndTransition, transition: Transition) =>
  reduced ? {} : { animate, transition };

/** Rising steam line (used by the cooking + ready scenes). */
function Steam({ delay = 0, x, reduced }: { delay?: number; x: number; reduced: boolean }) {
  return (
    <motion.path
      d={`M ${x} 46 q -3 -6 0 -12 q 3 -6 0 -12`}
      fill="none"
      stroke="var(--kv-color-foreground-subtle)"
      strokeWidth={2.4}
      strokeLinecap="round"
      initial={{ opacity: reduced ? 0.5 : 0, y: 0 }}
      {...loop(
        reduced,
        { opacity: [0, 0.7, 0], y: [4, -8] },
        { duration: 2.2, delay, repeat: Infinity, ease: 'easeInOut' },
      )}
    />
  );
}

/** The chef — hat, face, primary apron — gently working over a steaming pan. */
function ChefScene({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 160 120" className="h-36 w-44" role="img" aria-label="Chef preparing your order">
      {/* Steam rising from wok */}
      {[
        { x: 114, delay: 0 },
        { x: 124, delay: 0.6 },
        { x: 134, delay: 1.2 },
      ].map((s, i) => (
        <motion.path
          key={i}
          d={`M ${s.x} 74 q -4 -8 0 -16 q 4 -8 0 -16`}
          fill="none"
          stroke="var(--kv-color-foreground-subtle)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ opacity: 0, y: 0 }}
          {...loop(reduced, { opacity: [0, 0.6, 0], y: [-2, -18] }, { duration: 2, delay: s.delay, repeat: Infinity, ease: 'easeInOut' })}
        />
      ))}

      {/* Chef head, hat, body group (bobs gently) */}
      <motion.g
        {...loop(reduced, { y: [0, -2, 0] }, { duration: 1.8, repeat: Infinity, ease: 'easeInOut' })}
      >
        {/* Hat */}
        <rect x="42" y="32" width="36" height="8" rx="2" fill="var(--kv-color-surface)" stroke="var(--kv-color-border-strong)" strokeWidth={2.5} />
        <path
          d="M 44 33 C 35 23, 40 8, 52 13 C 55 3, 75 3, 78 13 C 90 8, 95 23, 86 33 Z"
          fill="var(--kv-color-surface)"
          stroke="var(--kv-color-border-strong)"
          strokeWidth={2.5}
        />

        {/* Face */}
        <circle cx="60" cy="58" r="15" fill="var(--kv-color-surface-raised)" stroke="var(--kv-color-border-strong)" strokeWidth={2.5} />
        {/* Smiling Eyes */}
        <path d="M 50 56 Q 54 60 58 56" fill="none" stroke="var(--kv-color-border-strong)" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M 62 56 Q 66 60 70 56" fill="none" stroke="var(--kv-color-border-strong)" strokeWidth={2.2} strokeLinecap="round" />
        {/* Blush cheeks */}
        <circle cx="47" cy="61" r="2.5" fill="var(--kv-color-danger)" opacity={0.35} />
        <circle cx="73" cy="61" r="2.5" fill="var(--kv-color-danger)" opacity={0.35} />
        {/* Cute Smile */}
        <path d="M 56 64 Q 60 68 64 64" fill="none" stroke="var(--kv-color-border-strong)" strokeWidth={2} strokeLinecap="round" />
        {/* Nose */}
        <circle cx="60" cy="60" r="1.5" fill="var(--kv-color-border-strong)" />

        {/* Body (Apron) */}
        <path d="M 44 76 C 44 72, 76 72, 76 76 L 80 115 L 40 115 Z" fill="var(--kv-color-primary)" />
        {/* Scarf / Kerchief */}
        <path d="M 52 75 L 68 75 L 60 84 Z" fill="var(--kv-color-danger)" />
        <circle cx="60" cy="76" r="3.5" fill="var(--kv-color-danger)" />
      </motion.g>

      {/* Left Arm and Salt Shaker (shakes over the pan) */}
      <g>
        {/* Arm extending from chef's shoulder (bobbing with chef body) */}
        <motion.path
          d="M 44 82 Q 70 55 92 52"
          fill="none"
          stroke="var(--kv-color-primary)"
          strokeWidth={6}
          strokeLinecap="round"
          {...loop(reduced, { d: ["M 44 82 Q 70 55 92 52", "M 44 80 Q 70 53 92 50", "M 44 82 Q 70 55 92 52"] }, { duration: 1.8, repeat: Infinity, ease: 'easeInOut' })}
        />
        {/* Shaker holding/shaking group */}
        <motion.g
          style={{ originX: '95px', originY: '50px' }}
          {...loop(reduced, { rotate: [135, 155, 135, 155, 135], y: [0, -2, 0] }, { duration: 1.2, repeat: Infinity, ease: 'easeInOut' })}
        >
          {/* Salt Shaker Body (Upside Down) */}
          <rect x="91" y="34" width="8" height="11" rx="1.5" fill="var(--kv-color-surface-raised)" stroke="var(--kv-color-border-strong)" strokeWidth={1.5} />
          <rect x="92" y="45" width="6" height="2" fill="var(--kv-color-border-strong)" />
          {/* Shaker holes detail */}
          <circle cx="93.5" cy="46" r="0.5" fill="var(--kv-color-surface)" />
          <circle cx="95" cy="46" r="0.5" fill="var(--kv-color-surface)" />
          <circle cx="96.5" cy="46" r="0.5" fill="var(--kv-color-surface)" />
          {/* Hand holding the shaker */}
          <circle cx="95" cy="50" r="4.5" fill="var(--kv-color-surface-raised)" stroke="var(--kv-color-border-strong)" strokeWidth={1.5} />
        </motion.g>
      </g>

      {/* Falling Salt Particles */}
      <motion.circle
        cx={93} cy={54} r={1.2} fill="var(--kv-color-foreground)"
        {...loop(reduced, { y: [0, 32], opacity: [0, 0.8, 0] }, { duration: 1.2, repeat: Infinity, ease: 'easeIn', delay: 0.1 })}
      />
      <motion.circle
        cx={96} cy={54} r={1.2} fill="var(--kv-color-foreground)"
        {...loop(reduced, { y: [0, 32], opacity: [0, 0.8, 0] }, { duration: 1.2, repeat: Infinity, ease: 'easeIn', delay: 0.5 })}
      />
      <motion.circle
        cx={99} cy={54} r={1.2} fill="var(--kv-color-foreground)"
        {...loop(reduced, { y: [0, 32], opacity: [0, 0.8, 0] }, { duration: 1.2, repeat: Infinity, ease: 'easeIn', delay: 0.9 })}
      />

      {/* Flying/Tossing Veggies */}
      <g>
        {/* Carrot Slice */}
        <motion.rect
          x={110} y={80} width={6} height={6} rx={1.5}
          fill="var(--kv-color-accent)"
          style={{ originX: '113px', originY: '83px' }}
          {...loop(reduced, { y: [0, -32, 0], rotate: [0, 180, 360], x: [0, -4, 0] }, { duration: 1.4, repeat: Infinity, ease: 'easeInOut' })}
        />
        {/* Pea */}
        <motion.circle
          cx={122} cy={80} r={2.8}
          fill="var(--kv-color-success)"
          {...loop(reduced, { y: [0, -44, 0], x: [0, 3, 0] }, { duration: 1.4, delay: 0.2, repeat: Infinity, ease: 'easeInOut' })}
        />
        {/* Pepper Slice */}
        <motion.path
          d="M 130 80 Q 133 76 136 80"
          fill="none"
          stroke="var(--kv-color-primary)"
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{ originX: '133px', originY: '80px' }}
          {...loop(reduced, { y: [0, -25, 0], rotate: [0, -120, -240], x: [0, 5, 0] }, { duration: 1.4, delay: 0.45, repeat: Infinity, ease: 'easeInOut' })}
        />
      </g>

      {/* Right Arm & Pan Wok (Tosses/Bobs) */}
      <motion.g
        style={{ originX: '72px', originY: '84px' }}
        {...loop(reduced, { rotate: [0, 5, -3, 0], y: [0, 4, -2, 0] }, { duration: 1.4, repeat: Infinity, ease: 'easeInOut' })}
      >
        {/* Arm */}
        <path d="M 72 84 Q 85 92 92 88" fill="none" stroke="var(--kv-color-primary)" strokeWidth={7} strokeLinecap="round" />
        {/* Hand */}
        <circle cx="92" cy="88" r="4.5" fill="var(--kv-color-surface-raised)" stroke="var(--kv-color-border-strong)" strokeWidth={1.5} />
        {/* Pan Handle */}
        <line x1="92" y1="88" x2="106" y2="88" stroke="var(--kv-color-border-strong)" strokeWidth={3.5} strokeLinecap="round" />
        {/* Pan / Wok Body */}
        <path d="M 104 84 C 104 100, 140 100, 140 84 Z" fill="var(--kv-color-secondary)" stroke="var(--kv-color-border-strong)" strokeWidth={2.5} />
      </motion.g>

      {/* Stove Burner & Flickering Flame */}
      <g>
        {/* Burner Plate */}
        <rect x="110" y="102" width="24" height="4" rx="2" fill="var(--kv-color-border)" />
        {/* Flame 1 */}
        <motion.path
          d="M 116 102 C 114 96, 118 92, 118 92 C 118 92, 122 96, 120 102 Z"
          fill="var(--kv-color-accent)"
          {...loop(reduced, { scaleY: [1, 1.3, 0.9, 1.2, 1], opacity: [0.8, 1, 0.7, 1, 0.8] }, { duration: 0.8, repeat: Infinity, ease: 'easeInOut' })}
          style={{ originX: '118px', originY: '102px' }}
        />
        {/* Flame 2 */}
        <motion.path
          d="M 122 102 C 120 95, 124 90, 124 90 C 124 90, 128 95, 126 102 Z"
          fill="var(--kv-color-danger)"
          {...loop(reduced, { scaleY: [1, 0.8, 1.25, 0.95, 1], opacity: [0.9, 0.75, 1, 0.85, 0.9] }, { duration: 0.7, delay: 0.15, repeat: Infinity, ease: 'easeInOut' })}
          style={{ originX: '124px', originY: '102px' }}
        />
        {/* Flame 3 */}
        <motion.path
          d="M 128 102 C 126 97, 130 93, 130 93 C 130 93, 134 97, 132 102 Z"
          fill="var(--kv-color-accent)"
          {...loop(reduced, { scaleY: [1, 1.2, 0.85, 1.1, 1], opacity: [0.75, 0.95, 0.7, 1, 0.75] }, { duration: 0.9, delay: 0.3, repeat: Infinity, ease: 'easeInOut' })}
          style={{ originX: '130px', originY: '102px' }}
        />
      </g>
    </svg>
  );
}

/** Receipt scene — placed / awaiting confirmation. */
function ReceiptScene({ reduced }: { reduced: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="h-32 w-32"
      role="img"
      aria-label="Order received"
      {...loop(reduced, { y: [0, -4, 0] }, { duration: 2.4, repeat: Infinity, ease: 'easeInOut' })}
    >
      <path
        d="M36 18 h48 v78 l-8 -6 -8 6 -8 -6 -8 6 -8 -6 -8 6 z"
        fill="var(--kv-color-surface)"
        stroke="var(--kv-color-primary)"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {[38, 50, 62].map((y) => (
        <line key={y} x1="46" y1={y} x2="74" y2={y} stroke="var(--kv-color-border-strong)" strokeWidth={3} strokeLinecap="round" />
      ))}
      <motion.circle
        cx="86"
        cy="86"
        r="14"
        fill="var(--kv-color-info)"
        {...loop(reduced, { scale: [1, 1.12, 1] }, { duration: 1.4, repeat: Infinity, ease: 'easeInOut' })}
        style={{ originX: '86px', originY: '86px' }}
      />
      <path d="M80 86 l4 4 l8 -8" fill="none" stroke="var(--kv-color-info-foreground)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

/** Ready scene — the bag is packed and waiting. */
function ReadyScene({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 140 120" className="h-32 w-36" role="img" aria-label="Order ready">
      <Steam x={62} delay={0} reduced={reduced} />
      <Steam x={78} delay={0.8} reduced={reduced} />
      <motion.g
        {...loop(reduced, { y: [0, -5, 0] }, { duration: 1.1, repeat: Infinity, ease: 'easeInOut' })}
      >
        <path d="M44 54 h52 l-5 52 h-42 z" fill="var(--kv-color-accent)" />
        <path d="M56 54 q0 -14 14 -14 q14 0 14 14" fill="none" stroke="var(--kv-color-accent)" strokeWidth={5} strokeLinecap="round" />
        <path d="M56 78 q14 10 28 0" fill="none" stroke="var(--kv-color-accent-foreground)" strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
      </motion.g>
    </svg>
  );
}

/** Celebration scene — served / completed. */
function ServedScene({ reduced }: { reduced: boolean }) {
  const dots = [
    { x: 24, y: 30, c: 'var(--kv-color-primary)' },
    { x: 104, y: 24, c: 'var(--kv-color-accent)' },
    { x: 34, y: 84, c: 'var(--kv-color-info)' },
    { x: 110, y: 78, c: 'var(--kv-color-success)' },
    { x: 66, y: 14, c: 'var(--kv-color-brand-secondary)' },
  ];
  return (
    <svg viewBox="0 0 132 110" className="h-32 w-36" role="img" aria-label="Order served">
      {dots.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={4}
          fill={d.c}
          initial={{ opacity: reduced ? 0.8 : 0, scale: 0 }}
          animate={reduced ? { opacity: 0.8, scale: 1 } : { opacity: [0, 1, 0], scale: [0, 1.15, 0.6], y: [0, -10] }}
          transition={reduced ? undefined : { duration: 1.8, delay: i * 0.25, repeat: Infinity, repeatDelay: 0.6 }}
        />
      ))}
      <motion.g
        initial={reduced ? undefined : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={transitions.bouncy}
      >
        <circle cx="66" cy="60" r="30" fill="var(--kv-color-success)" />
        <path d="M52 60 l10 10 l18 -20" fill="none" stroke="var(--kv-color-success-foreground)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}

/* ── scene selection + copy ──────────────────────────────────────────────── */

type SceneKey = 'placed' | 'preparing' | 'ready' | 'served';

const SCENE_FOR: Partial<Record<OrderStatus, SceneKey>> = {
  placed: 'placed',
  confirmed: 'placed',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  completed: 'served',
};

const HEADLINE: Partial<Record<OrderStatus, { title: string; sub: string }>> = {
  placed: { title: 'Order received', sub: 'Waiting for the restaurant to confirm…' },
  confirmed: { title: 'Confirmed!', sub: 'Your order is heading to the kitchen.' },
  preparing: { title: 'The chef is on it', sub: 'Your order is being freshly prepared.' },
  ready: { title: 'Almost there!', sub: 'Your order is packed and on its way to you.' },
  served: { title: 'Served — enjoy!', sub: 'Thanks for ordering with us.' },
  completed: { title: 'All done — enjoy!', sub: 'Thanks for ordering with us.' },
};

/**
 * The hero card. Cross-fades the scene as the status changes; shows the order
 * number, live status badge and the backend's ETA while food is in flight.
 */
export function OrderTrackingHero({ order, className }: { order: Order; className?: string }) {
  const reduced = Boolean(useReducedMotion());
  const scene = SCENE_FOR[order.status];
  if (!scene) return null; // cancelled/refund states are handled by the timeline

  const pres = ORDER_STATUS_PRESENTATION[order.status];
  const copy = HEADLINE[order.status]!;
  const showEta = order.estimatedMinutes && ['placed', 'confirmed', 'preparing'].includes(order.status);

  return (
    <section
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface-raised px-5 py-6 text-center shadow-md',
        className,
      )}
    >
      {/* soft brand wash behind the scene */}
      <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary-soft blur-3xl" />

      <div className="relative flex flex-col items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={scene}
            initial={reduced ? false : { opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.94, y: -8 }}
            transition={transitions.gentle}
            className="grid place-items-center"
          >
            {scene === 'placed' && <ReceiptScene reduced={reduced} />}
            {scene === 'preparing' && <ChefScene reduced={reduced} />}
            {scene === 'ready' && <ReadyScene reduced={reduced} />}
            {scene === 'served' && <ServedScene reduced={reduced} />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={order.status}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={transitions.default}
            className="mt-2"
          >
            <h1 className="font-display text-2xl font-extrabold text-foreground">{copy.title}</h1>
            <p className="mt-1 text-sm text-foreground-muted">{copy.sub}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Badge tone={pres.tone} variant="soft">{pres.label}</Badge>
          <span className="font-mono text-foreground-subtle">{order.orderNumber}</span>
          {showEta && (
            <Badge tone="neutral" variant="outline">≈ {formatMinutes(order.estimatedMinutes!)} </Badge>
          )}
        </div>
      </div>
    </section>
  );
}
