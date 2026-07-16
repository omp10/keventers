import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Icon, type IconName } from '@/design-system';
import { Reveal } from '@/animations';
import { softSurface } from '@/utils/style';
import { cn } from '@/lib/cn';

export type SectionTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/**
 * HomeSection — the shared shell that gives every homepage section its
 * personality: a toned icon chip, an animated heading, an optional "See all"
 * affordance, and a one-shot scroll reveal. Content (rails, grids, cards) slots
 * in as children so sections stay purely compositional.
 */
export function HomeSection({
  title,
  subtitle,
  icon,
  tone = 'primary',
  seeAllHref,
  seeAllLabel = 'See all',
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  tone?: SectionTone;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal>
      <section className={cn('space-y-3', className)} aria-label={title}>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={softSurface(tone, 'grid h-8 w-8 shrink-0 place-items-center rounded-lg')}>
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">{title}</h2>
              {subtitle && <p className="truncate text-xs text-foreground-muted">{subtitle}</p>}
            </div>
          </div>
          {seeAllHref && (
            <Link
              to={seeAllHref}
              className="group flex shrink-0 items-center gap-1 rounded-md text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:underline underline-offset-2"
            >
              {seeAllLabel}
              <Icon
                name="chevronRight"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          )}
        </div>
        {children}
      </section>
    </Reveal>
  );
}
