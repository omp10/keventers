import { useMemo, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/design-system';
import { transitions } from '@/animations';
import { gradients, useTheme } from '@/theme';
import { glass, gradientText } from '@/utils/style';
import { cn } from '@/lib/cn';
import { SearchBar } from '../search';
import type { GeoPoint, PlaceSuggestion } from '../types';

/** Time-of-day greeting — locale-free, white-label copy. */
function daypartGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late-night cravings?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Floating decorative bloom — a soft, blurred brand-tinted circle. Ambient float
 * runs via a CSS keyframe (GPU transform only); scroll parallax is applied by the
 * parent through a MotionValue. Purely decorative → aria-hidden.
 */
function Bloom({
  className,
  tone,
  parallax,
  slow,
}: {
  /** Position + size classes (applied to the absolutely-positioned wrapper). */
  className?: string;
  /** Brand wash class for the bloom itself (e.g. `bg-primary-soft`). */
  tone: string;
  parallax?: MotionValue<number>;
  slow?: boolean;
}) {
  return (
    <motion.span
      aria-hidden
      style={parallax ? { y: parallax } : undefined}
      className={cn('pointer-events-none absolute will-change-transform', className)}
    >
      <span
        className={cn(
          'block h-full w-full rounded-full blur-3xl motion-reduce:animate-none',
          slow ? 'animate-float-slow' : 'animate-float',
          tone,
        )}
      />
    </motion.span>
  );
}

/**
 * Animated QR CTA — the signature entry action on scanner-capable devices. A
 * stylized QR frame with a sweeping scan line (CSS keyframe, reduced-motion safe)
 * over the contrast-guaranteed primary surface.
 */
function ScanCta({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={transitions.snappy}
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-primary p-5 text-left text-primary-foreground shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ backgroundImage: gradients.cta }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">Scan to order</span>
        <span className="mt-0.5 block text-sm opacity-80">At a table? Scan the QR code to start ordering.</span>
        {/* Pill affordance (decorative — the whole card is the button) */}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors group-hover:bg-primary-foreground/25 motion-reduce:transition-none">
          Open scanner
          <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </span>
      {/* QR frame + scan line */}
      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-foreground/15">
        <Icon name="qr" className="h-8 w-8" />
        <span
          aria-hidden
          className="absolute inset-x-1.5 top-1/2 h-0.5 rounded-full bg-primary-foreground/70 animate-scan motion-reduce:hidden"
        />
      </span>
    </motion.button>
  );
}

export type HomeHeroProps = {
  /** Scanner-capable surface → QR CTA leads; otherwise discovery leads. */
  scannerFirst: boolean;
  /** Search wiring (owned by HomeScreen). */
  term: string;
  onTermChange: (v: string) => void;
  onSearchSubmit: (term: string) => void;
  onSuggestionSelect: (s: PlaceSuggestion) => void;
  searchOrigin?: GeoPoint | null;
  /** Trending terms for the search idle panel (derived from loaded data). */
  trendingTerms?: string[];
  /** The location affordance (LocationPrompt), slotted under the search card. */
  locationSlot?: ReactNode;
};

/**
 * HomeHero — the flagship opening moment. An ambient, brand-gradient backdrop
 * with floating parallax blooms, a time-aware greeting, display typography, a
 * frosted-glass search card and the adaptive QR CTA. Everything resolves from
 * theme tokens (gradients / glass / shadows / type) → fully white-label.
 * Motion: transform/opacity only; parallax + float disable under reduced motion.
 */
export function HomeHero(props: HomeHeroProps) {
  const { scannerFirst, term, onTermChange, onSearchSubmit, onSuggestionSelect, searchOrigin, trendingTerms, locationSlot } = props;
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const greeting = useMemo(daypartGreeting, []);
  const { brand } = useTheme();

  // Scroll parallax — decor drifts slower than content as the hero leaves view.
  const { scrollY } = useScroll();
  const yBack = useTransform(scrollY, [0, 480], [0, 90]);
  const yMid = useTransform(scrollY, [0, 480], [0, 50]);
  const contentFade = useTransform(scrollY, [0, 320], [1, 0.35]);

  return (
    <section
      ref={ref}
      aria-label="Welcome"
      className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-6 pt-7 sm:px-6 lg:pb-9 lg:pt-8 lg:rounded-b-3xl"
      style={{ backgroundImage: gradients.surface }}
    >
      {/* Ambient decorative blooms (parallax layers, purely decorative) */}
      <Bloom parallax={reduced ? undefined : yBack} className="-left-16 -top-20 h-56 w-56" tone="bg-primary-soft" />
      <Bloom parallax={reduced ? undefined : yMid} slow className="-right-12 top-6 h-48 w-48" tone="bg-accent-soft" />
      <Bloom
        parallax={reduced ? undefined : yBack}
        slow
        className="left-1/3 top-32 h-40 w-40"
        tone="bg-[var(--kv-color-brand-secondary-soft)]"
      />

      <motion.div
        style={reduced ? undefined : { opacity: contentFade }}
        className="relative mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-none lg:flex-row lg:items-center lg:gap-12"
      >
        {/* Copy + search */}
        <div className="min-w-0 flex-1 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground-muted">
              {greeting}
              {brand.tagline ? <span className="text-foreground-subtle"> · {brand.tagline}</span> : null}
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Ready for a <span className={gradientText}>{brand.appName}</span> treat?
            </h1>
            <p className="max-w-md text-[0.9375rem] text-foreground-muted">
              Scan a table code, or discover great food around you.
            </p>
          </div>

          {/* Frosted search card — `z-30` lifts its stacking context (created by
              the glass backdrop-blur) above the action panel, so the search
              suggestions dropdown always paints over the Scan card. */}
          <div className={glass({ className: 'relative z-30 space-y-3 rounded-2xl p-3 shadow-lg sm:p-4' })}>
            <SearchBar
              value={term}
              onChange={onTermChange}
              onSubmit={onSearchSubmit}
              onSelect={onSuggestionSelect}
              origin={searchOrigin}
              trendingTerms={trendingTerms}
            />
            {locationSlot}
          </div>
        </div>

        {/* Primary action panel */}
        <div className="w-full space-y-3 lg:max-w-sm">
          {scannerFirst ? (
            <>
              <ScanCta onClick={() => navigate('/qr')} />
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <Icon name="search" className="h-4 w-4" />
                Prefer browsing?
                <button
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Explore restaurants
                </button>
              </div>
            </>
          ) : (
            <>
              <motion.button
                type="button"
                onClick={() => navigate('/discover')}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={transitions.snappy}
                className="group flex w-full items-center gap-4 rounded-2xl bg-primary p-5 text-left text-primary-foreground shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ backgroundImage: gradients.cta }}
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-foreground/15">
                  <Icon name="utensils" className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">Explore nearby</span>
                  <span className="block text-sm opacity-80">Restaurants, cafés and more around you</span>
                </span>
                <Icon
                  name="chevronRight"
                  className="h-5 w-5 shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </motion.button>
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <Icon name="qr" className="h-4 w-4" />
                Already at a table?
                <button
                  type="button"
                  onClick={() => navigate('/qr')}
                  className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Scan QR
                </button>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => navigate('/qr/manual')}
                  className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Enter code
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Scroll cue */}
      <div aria-hidden className="relative mt-4 flex justify-center lg:mt-9">
        <Icon name="chevronDown" className="h-5 w-5 text-foreground-subtle animate-bounce-soft motion-reduce:animate-none" />
      </div>
    </section>
  );
}
