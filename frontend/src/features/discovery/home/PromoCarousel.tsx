import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  const accent = banner.theme === 'accent';
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
      {banner.theme === 'image' && banner.imageUrl && (
        <img
          src={banner.imageUrl}
          alt=""
          loading="lazy"
          className="relative hidden h-full max-h-28 w-36 shrink-0 rounded-xl object-cover shadow-lg xs:block sm:w-44"
        />
      )}
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

  // Auto-advance — skipped entirely under reduced motion or while hovered/focused.
  useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const t = setInterval(() => setIndex(([i]) => [(i + 1) % count, 1]), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [reduced, paused, count]);

  // Clamp when the slide set shrinks (banners load in).
  useEffect(() => {
    setIndex(([i, d]) => [Math.min(i, Math.max(0, count - 1)), d]);
  }, [count]);

  const open = (slide: Slide) => {
    if (slide.kind === 'qr') return navigate('/qr');
    if (slide.kind === 'loyalty') return navigate('/loyalty');
    const { banner } = slide;
    if (banner.cta?.href?.startsWith('/')) return navigate(banner.cta.href);
    if (banner.branchSlug) return navigate(`/r/${banner.branchSlug}`);
    navigate('/discover');
  };

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
      <div className="relative h-36 overflow-hidden rounded-2xl shadow-md xs:h-32 sm:h-36">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={active.id}
            custom={direction}
            variants={reduced ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
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
