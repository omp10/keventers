import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Provider — mount ONCE near the app root (delay + skip config). */
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 6, children, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-[1400] max-w-xs rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg',
          'select-none data-[state=delayed-open]:animate-[kv-pop-in_140ms_ease-out]',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});

/** Convenience one-liner: `<Tooltip content="…"><Button/></Tooltip>`. */
export function Tooltip({ content, children, side = 'top', delayDuration }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; delayDuration?: number }) {
  if (!content) return <>{children}</>;
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  );
}
