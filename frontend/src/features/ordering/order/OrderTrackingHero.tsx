import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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

/**
 * The chef — a dotLottie animation. Replaces the hand-built SVG chef: this is
 * the same scene the client picked, and it's SELF-HOSTED (public/animations)
 * rather than pulled from lottie.host, so it still renders offline in the PWA
 * and adds no third-party runtime dependency.
 *
 * Under reduced motion it renders the first frame and never plays, matching the
 * other scenes.
 *
 * The tile is deliberately literal WHITE (not a surface token): this artwork is
 * drawn for a light backdrop and carries its own near-white bed, which read as a
 * dirty rectangle floating on the themed card — worst in dark mode. Pinning the
 * tile to white makes that bed disappear into an intentional framed illustration
 * in both schemes. The hairline border gives it an edge in LIGHT mode, where a
 * white tile on a near-white card would otherwise have none.
 */
function ChefScene({ reduced }: { reduced: boolean }) {
  return (
    <div
      role="img"
      aria-label="Chef preparing your order"
      className="grid h-40 w-44 place-items-center overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/15"
    >
      <DotLottieReact
        src="/animations/chef.lottie"
        loop={!reduced}
        autoplay={!reduced}
        className="h-full w-full"
      />
    </div>
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
