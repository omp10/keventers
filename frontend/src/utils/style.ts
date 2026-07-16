/**
 * Design UTILITIES — composable helpers that emit token-driven Tailwind class
 * strings so recurring visual treatments (glass, elevation, focus ring, gradient
 * text) are defined ONCE and never hand-rolled. All reference semantic tokens,
 * so they rebrand + dark-mode automatically.
 */
import { cn } from '@/lib/cn';
import type { ElevationRole } from '@/theme';

/** Frosted-glass surface — navbars, command palette, floating panels. */
export function glass(opts?: { border?: boolean; className?: string }) {
  return cn(
    'bg-[var(--kv-glass-bg)] backdrop-blur-[var(--kv-blur,20px)] backdrop-saturate-150',
    opts?.border !== false && 'border border-[var(--kv-glass-border)]',
    opts?.className,
  );
}

/** Semantic elevation → the matching shadow utility. */
const ELEVATION_CLASS: Record<ElevationRole, string> = {
  flat: 'shadow-none',
  card: 'shadow-sm',
  cardHover: 'shadow-md',
  raised: 'shadow-md',
  dropdown: 'shadow-lg',
  popover: 'shadow-lg',
  drawer: 'shadow-xl',
  modal: 'shadow-xl',
  toast: 'shadow-lg',
  command: 'shadow-2xl',
};
export function elevation(role: ElevationRole, className?: string) {
  return cn(ELEVATION_CLASS[role], className);
}

/** The canonical keyboard focus ring — one look for every focusable control. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Inner focus ring (for inputs where an offset ring would clip). */
export const focusRingInset = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Brand-gradient text (hero headings, marketing flourishes). */
export const gradientText =
  'bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent';

/** A soft, brand-tinted surface (subtle callouts, active nav items). */
export function softSurface(tone: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' = 'primary', className?: string) {
  const map = {
    primary: 'bg-primary-soft text-primary',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  } as const;
  return cn(map[tone], className);
}

/** Truncate helpers. */
export const truncate = 'truncate';
export const lineClamp = (lines: number) => `overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:${lines}]`;

/** Visually-hidden (screen-reader only) — accessible labels without visual noise. */
export const srOnly =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 [clip:rect(0,0,0,0)]';
