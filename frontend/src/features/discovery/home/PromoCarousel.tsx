import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/design-system';
import { transitions } from '@/animations';
import { gradients } from '@/theme';
import { cn } from '@/lib/cn';
import { usePromoBanners } from '../hooks';
import type { PromoBanner } from '../types';

/**
 * Carousel slides. ADMIN-MANAGED banners (from /public/banners, curated via
 * /admin/banners) are the primary content; evergreen white-label house slides
 * (QR ordering, loyalty) render only while no banners exist, so the strip is
 * never empty. Banner `theme` maps onto design tokens — no hardcoded colors.
 */
type Slide =
  | { id: string; kind: 'banner'; banner: PromoBanner }
  | { id: string; kind: 'qr' }
  | { id: string; kind: 'loyalty' };

const AUTO_ADVANCE_MS = 5200;

/** A flick past this speed (px/s) commits, however short the drag. */
const SWIPE_VELOCITY = 400;
/** …or a deliberate drag past this fraction of the strip's width. */
const SWIPE_DISTANCE_RATIO = 0.3;

/**
 * Which slide a released swipe lands on: -1 previous, +1 next, 0 stay put.
 *
 * Exported so the thresholds are unit-testable — the gesture itself needs a real
 * finger, but the DECISION is where the bugs live. Judging by distance alone
 * misreads how people actually swipe on a phone: a fast flick barely travels but
 * clearly means "next", so velocity counts too.
 */
export function swipeStep(offsetX: number, velocityX: number, width: number): -1 | 0 | 1 {
  // An unmeasured element (ref not attached yet, display:none) reports 0. Taking
  // that literally made a 5px twitch clear the threshold and flip the banner, so
  // fall back to a typical phone width rather than to "any movement wins".
  const effectiveWidth = width > 0 ? width : 320;
  const flicked = Math.abs(velocityX) > SWIPE_VELOCITY;
  const dragged = Math.abs(offsetX) > effectiveWidth * SWIPE_DISTANCE_RATIO;
  if (!flicked && !dragged) return 0;
  // Dragging LEFT (negative offset) reveals the NEXT slide.
  return offsetX < 0 ? 1 : -1;
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0, transition: transitions.entrance },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, transition: transitions.exit }),
};

const slideShell =
  'group relative flex h-full w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-5 sm:p-6';

/** One admin banner — themed surface via tokens; images render as a framed
 *  thumbnail beside the copy so text never fights an image for contrast. */
function BannerSlide({ banner, onOpen }: { banner: PromoBanner; onOpen: () => void }) {
  const isImageTheme = banner.theme === 'image';
  const accent = banner.theme === 'accent';

  if (isImageTheme && banner.imageUrl) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group relative h-full w-full overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <img
          src={banner.imageUrl}
          alt={banner.title || 'Banner'}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(slideShell, accent ? 'bg-accent text-accent-foreground' : 'text-primary-foreground')}
      style={accent ? undefined : { backgroundImage: gradients.brand }}
    >
      <span
        aria-hidden
        className={cn(
          'absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl',
          accent ? 'bg-accent-foreground/10' : 'bg-primary-foreground/10',
        )}
      />
      <div className="relative min-w-0 flex-1">
        <p className="truncate font-display text-xl font-extrabold leading-tight sm:text-2xl">{banner.title}</p>
        {banner.subtitle && <p className="mt-1 truncate text-sm opacity-85">{banner.subtitle}</p>}
        {banner.cta?.label && (
          <span
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide',
              accent ? 'bg-accent-foreground/15' : 'bg-primary-foreground/15',
            )}
          >
            {banner.cta.label}
            <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        )}
      </div>
    </button>
  );
}

/** Evergreen house slides (fallback while admins haven't curated banners). */
function HouseSlide({ kind, onOpen }: { kind: 'qr' | 'loyalty'; onOpen: () => void }) {
  const loyalty = kind === 'loyalty';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(slideShell, loyalty ? 'bg-accent text-accent-foreground' : 'text-primary-foreground')}
      style={loyalty ? undefined : { backgroundImage: gradients.brand }}
    >
      <span
        aria-hidden
        className={cn('absolute -left-10 -bottom-12 h-40 w-40 rounded-full blur-2xl', loyalty ? 'bg-accent-foreground/10' : 'bg-primary-foreground/10')}
      />
      <span className={cn('relative grid h-12 w-12 shrink-0 place-items-center rounded-xl', loyalty ? 'bg-accent-foreground/15' : 'bg-primary-foreground/15')}>
        <Icon name={loyalty ? 'gift' : 'qr'} className="h-6 w-6" />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
          {loyalty ? 'Earn rewards on every order' : 'Scan. Order. Enjoy.'}
        </p>
        <p className="mt-1 text-sm opacity-85">
          {loyalty ? 'Collect points and redeem them at checkout.' : 'Skip the queue — order straight from your table.'}
        </p>
      </div>
      <Icon name="chevronRight" className="relative h-5 w-5 shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </button>
  );
}

/**
 * PromoCarousel — the animated offers strip, driven by ADMIN-MANAGED banners.
 * Auto-advances (pauses on hover/focus and under reduced motion) with dot
 * controls; every surface resolves from theme tokens (white-label safe).
 */
export function PromoCarousel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const banners = usePromoBanners();
  const [[index, direction], setIndex] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  /**
   * A swipe ends with a pointer-up over the slide, which is a <button> — so
   * without this the gesture that changed the banner ALSO opened it. Set while
   * dragging and cleared on the next tick, after the click would have fired.
   */
  const swiped = useRef(false);

  const slides = useMemo<Slide[]>(() => {
    const admin = [...(banners.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (admin.length > 0) return admin.map((b): Slide => ({ id: `banner-${b.id}`, kind: 'banner', banner: b }));
    return [
      { id: 'house-qr', kind: 'qr' },
      { id: 'house-loyalty', kind: 'loyalty' },
    ];
  }, [banners.data]);

  const count = slides.length;
  const active = slides[Math.min(index, count - 1)];

  /** Move by ±1, wrapping, and remember the direction so the exit matches. */
  const paginate = useCallback(
    (step: number) => setIndex(([i]) => [(i + step + count) % count, step]),
    [count],
  );

  /**
   * Commit a swipe on release. Judging by DISTANCE ALONE misreads the gesture
   * people actually make on a phone — a fast flick travels barely any distance
   * but clearly means "next". Framer reports velocity, so a flick OR a
   * deliberate drag past a third of the width both count, and anything else
   * springs back.
   */
  const onDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      setDragging(false);
      const step = swipeStep(info.offset.x, info.velocity.x, trackRef.current?.offsetWidth ?? 0);
      if (count > 1 && step !== 0) paginate(step);
      // Let the imminent click land, then stop swallowing taps.
      setTimeout(() => { swiped.current = false; }, 0);
    },
    [count, paginate],
  );

  const open = useCallback(
    (slide: Slide) => {
      if (swiped.current) return; // this was a swipe, not a tap
      if (slide.kind === 'qr') return navigate('/qr');
      if (slide.kind === 'loyalty') return navigate('/loyalty');
      const { banner } = slide;
      if (banner.cta?.href?.startsWith('/')) return navigate(banner.cta.href);
      if (banner.branchSlug) return navigate(`/r/${banner.branchSlug}`);
      navigate('/discover');
    },
    [navigate],
  );

  // Auto-advance — skipped under reduced motion, while hovered/focused, or
  // mid-swipe: nothing is worse than the strip moving under your thumb.
  useEffect(() => {
    if (reduced || paused || dragging || count <= 1) return;
    const t = setInterval(() => setIndex(([i]) => [(i + 1) % count, 1]), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [reduced, paused, dragging, count]);

  // Clamp when the slide set shrinks (banners load in).
  useEffect(() => {
    setIndex(([i, d]) => [Math.min(i, Math.max(0, count - 1)), d]);
  }, [count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers and highlights"
      className={cn('space-y-2.5', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div ref={trackRef} className="relative h-56 overflow-hidden rounded-2xl shadow-md xs:h-52 sm:h-64">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={active.id}
            custom={direction}
            variants={reduced ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            /* SWIPE. `drag="x"` makes framer set touch-action: pan-y, so a
               horizontal swipe moves the banner while a vertical one still
               scrolls the page — the thing that makes carousels miserable on
               Android when it is got wrong. Constraints are zero-width so the
               slide rubber-bands back and the pagination does the real move. */
            drag={count > 1 ? 'x' : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragMomentum={false}
            onDragStart={() => { setDragging(true); swiped.current = true; }}
            onDragEnd={onDragEnd}
            className="absolute inset-0 touch-pan-y select-none"
          >
            {active.kind === 'banner' ? (
              <BannerSlide banner={active.banner} onOpen={() => open(active)} />
            ) : (
              <HouseSlide kind={active.kind} onOpen={() => open(active)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1} of ${count}`}
              onClick={() => setIndex(([prev]) => [i, i > prev ? 1 : -1])}
              className={cn(
                'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong hover:bg-foreground-subtle',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
