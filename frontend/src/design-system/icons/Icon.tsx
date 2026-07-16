import { forwardRef, type SVGProps } from 'react';

import { cn } from '@/lib/cn';
import { iconRegistry, type IconName } from './registry';

const SIZE = { xs: 14, sm: 16, md: 18, lg: 20, xl: 24, '2xl': 32 } as const;
export type IconSize = keyof typeof SIZE;

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  size?: IconSize | number;
  /** Decorative by default (aria-hidden). Pass a label to make it meaningful. */
  label?: string;
};

/**
 * The ONLY way to render an icon in the app. Resolves a semantic name from the
 * registry, applies a token-consistent size, and handles accessibility
 * (decorative → aria-hidden; labeled → role="img"). Colors via `currentColor`,
 * so `text-primary` etc. tint it.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 'md', label, className, strokeWidth = 2, ...props },
  ref,
) {
  const Cmp = iconRegistry[name];
  const px = typeof size === 'number' ? size : SIZE[size];
  return (
    <Cmp
      ref={ref}
      width={px}
      height={px}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      {...props}
    />
  );
});
