import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

const avatarVariants = cva('relative inline-flex shrink-0 overflow-hidden select-none items-center justify-center bg-muted text-foreground-muted font-semibold', {
  variants: {
    size: {
      xs: 'size-6 text-[0.625rem]',
      sm: 'size-8 text-xs',
      md: 'size-10 text-sm',
      lg: 'size-12 text-base',
      xl: 'size-16 text-xl',
    },
    shape: { circle: 'rounded-full', square: 'rounded-lg' },
  },
  defaultVariants: { size: 'md', shape: 'circle' },
});

export type AvatarProps = VariantProps<typeof avatarVariants> & {
  src?: string;
  alt?: string;
  /** Fallback initials/glyph shown while loading or when no src. */
  fallback?: ReactNode;
  /** Presence dot. */
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
};

const STATUS = { online: 'bg-success', offline: 'bg-foreground-subtle', busy: 'bg-danger', away: 'bg-warning' };

/** Avatar — Radix (graceful image fallback), token-styled, with presence dot. */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, alt, fallback, size, shape, status, className },
  ref,
) {
  return (
    <span ref={ref} className="relative inline-flex">
      <AvatarPrimitive.Root className={cn(avatarVariants({ size, shape }), className)}>
        {src && <AvatarPrimitive.Image src={src} alt={alt} className="aspect-square size-full object-cover" />}
        <AvatarPrimitive.Fallback delayMs={src ? 400 : 0} className="grid size-full place-items-center">
          {fallback ?? initials(alt)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status && (
        <span
          className={cn('absolute bottom-0 right-0 block size-[28%] rounded-full ring-2 ring-surface', STATUS[status])}
          aria-label={status}
        />
      )}
    </span>
  );
});

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** AvatarGroup — overlapping stack with a "+N" overflow chip. */
export function AvatarGroup({ children, max = 4, size = 'md', className }: { children: ReactNode[]; max?: number; size?: AvatarProps['size']; className?: string }) {
  const items = Array.isArray(children) ? children : [children];
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {shown.map((child, i) => (
        <span key={i} className="ring-2 ring-surface rounded-full">
          {child}
        </span>
      ))}
      {extra > 0 && (
        <span className="ring-2 ring-surface rounded-full">
          <Avatar size={size} fallback={`+${extra}`} />
        </span>
      )}
    </div>
  );
}
