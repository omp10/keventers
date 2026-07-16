import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type SeparatorProps = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & {
  /** Optional centered label ("OR"). */
  label?: ReactNode;
};

/** Separator — Radix rule (a11y orientation). Optional inline label. */
export const Separator = forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, SeparatorProps>(
  function Separator({ className, orientation = 'horizontal', label, decorative = true, ...props }, ref) {
    if (label && orientation === 'horizontal') {
      return (
        <div className={cn('flex items-center gap-3', className)}>
          <SeparatorPrimitive.Root className="h-px flex-1 bg-border" {...props} />
          <span className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">{label}</span>
          <SeparatorPrimitive.Root className="h-px flex-1 bg-border" />
        </div>
      );
    }
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        orientation={orientation}
        decorative={decorative}
        className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
        {...props}
      />
    );
  },
);
