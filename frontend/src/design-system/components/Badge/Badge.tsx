import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/design-system/icons';

/**
 * Badge — status/label pill. Tones map to SEMANTIC colors (soft fills for calm
 * dashboards), plus `dot` for a leading status indicator. Covers Badge + Chip +
 * Tag needs via `variant` (soft | solid | outline) and interactive/removable Tag.
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium whitespace-nowrap rounded-pill border transition-colors',
  {
    variants: {
      tone: {
        neutral: '',
        primary: '',
        success: '',
        warning: '',
        danger: '',
        info: '',
        accent: '',
      },
      variant: { soft: 'border-transparent', solid: 'border-transparent', outline: 'bg-transparent' },
      size: { sm: 'h-5 px-2 text-[0.6875rem]', md: 'h-6 px-2.5 text-xs', lg: 'h-7 px-3 text-sm' },
    },
    compoundVariants: [
      // soft
      { variant: 'soft', tone: 'neutral', class: 'bg-muted text-foreground-muted' },
      { variant: 'soft', tone: 'primary', class: 'bg-primary-soft text-primary' },
      { variant: 'soft', tone: 'success', class: 'bg-success-soft text-success' },
      { variant: 'soft', tone: 'warning', class: 'bg-warning-soft text-warning' },
      { variant: 'soft', tone: 'danger', class: 'bg-danger-soft text-danger' },
      { variant: 'soft', tone: 'info', class: 'bg-info-soft text-info' },
      { variant: 'soft', tone: 'accent', class: 'bg-accent-soft text-accent' },
      // solid
      { variant: 'solid', tone: 'neutral', class: 'bg-foreground text-background' },
      { variant: 'solid', tone: 'primary', class: 'bg-primary text-primary-foreground' },
      { variant: 'solid', tone: 'success', class: 'bg-success text-success-foreground' },
      { variant: 'solid', tone: 'warning', class: 'bg-warning text-warning-foreground' },
      { variant: 'solid', tone: 'danger', class: 'bg-danger text-danger-foreground' },
      { variant: 'solid', tone: 'info', class: 'bg-info text-info-foreground' },
      { variant: 'solid', tone: 'accent', class: 'bg-accent text-accent-foreground' },
      // outline
      { variant: 'outline', tone: 'neutral', class: 'border-border text-foreground-muted' },
      { variant: 'outline', tone: 'primary', class: 'border-primary/40 text-primary' },
      { variant: 'outline', tone: 'success', class: 'border-success/40 text-success' },
      { variant: 'outline', tone: 'warning', class: 'border-warning/40 text-warning' },
      { variant: 'outline', tone: 'danger', class: 'border-danger/40 text-danger' },
      { variant: 'outline', tone: 'info', class: 'border-info/40 text-info' },
      { variant: 'outline', tone: 'accent', class: 'border-accent/40 text-accent' },
    ],
    defaultVariants: { tone: 'neutral', variant: 'soft', size: 'md' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    icon?: IconName;
    dot?: boolean;
    /** Renders a remove button — turns the Badge into a removable Tag/Chip. */
    onRemove?: () => void;
  };

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, variant, size, icon, dot, onRemove, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(badgeVariants({ tone, variant, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {icon && <Icon name={icon} size="xs" />}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="-mr-1 ml-0.5 grid size-4 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/15"
        >
          <Icon name="close" size="xs" strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
});
