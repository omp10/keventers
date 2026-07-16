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
      {/* steam */}
      <Steam x={116} delay={0} reduced={reduced} />
      <Steam x={126} delay={0.7} reduced={reduced} />
      <Steam x={136} delay={1.4} reduced={reduced} />

      {/* chef (bobs while stirring) */}
      <motion.g
        {...loop(reduced, { y: [0, -2.5, 0] }, { duration: 1.6, repeat: Infinity, ease: 'easeInOut' })}
      >
        {/* hat */}
        <path
          d="M42 34 q0 -12 12 -12 q3 -8 12 -8 q9 0 12 8 q12 0 12 12 l-2 8 h-44 z"
          fill="var(--kv-color-surface)"
          stroke="var(--kv-color-border-strong)"
          strokeWidth={2.5}
        />
        {/* face */}
        <circle cx="66" cy="52" r="13" fill="var(--kv-color-surface-raised)" stroke="var(--kv-color-border-strong)" strokeWidth={2.5} />
        <circle cx="61.5" cy="51" r="1.6" fill="var(--kv-color-foreground)" />
        <circle cx="70.5" cy="51" r="1.6" fill="var(--kv-color-foreground)" />
        <path d="M62 57 q4 3 8 0" fill="none" stroke="var(--kv-color-foreground)" strokeWidth={1.8} strokeLinecap="round" />
        {/* apron body */}
        <path d="M50 66 q16 -8 32 0 l4 30 h-40 z" fill="var(--kv-color-primary)" />
        <path d="M58 72 h16" stroke="var(--kv-color-primary-foreground)" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        {/* stirring arm */}
        <motion.g
          style={{ originX: '58px', originY: '74px' }}
          {...loop(reduced, { rotate: [0, 14, 0] }, { duration: 1.6, repeat: Infinity, ease: 'easeInOut' })}
        >
          <path d="M58 74 q18 4 40 6" fill="none" stroke="var(--kv-color-primary)" strokeWidth={7} strokeLinecap="round" />
          {/* spoon */}
          <line x1="98" y1="80" x2="112" y2="66" stroke="var(--kv-color-border-strong)" strokeWidth={3.4} strokeLinecap="round" />
        </motion.g>
      </motion.g>

      {/* pan on stove */}
      <g>
        <rect x="102" y="82" width="48" height="12" rx="6" fill="var(--kv-color-brand-secondary)" />
        <line x1="102" y1="86" x2="88" y2="82" stroke="var(--kv-color-brand-secondary)" strokeWidth={4.5} strokeLinecap="round" />
        {/* flame flicker */}
        <motion.path
          d="M120 102 q3 -7 6 0 q3 7 -3 8 q-6 -1 -3 -8"
          fill="var(--kv-color-accent)"
          {...loop(reduced, { scaleY: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }, { duration: 0.9, repeat: Infinity, ease: 'easeInOut' })}
          style={{ originX: '123px', originY: '110px' }}
        />
        <rect x="108" y="108" width="36" height="4" rx="2" fill="var(--kv-color-border)" />
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
