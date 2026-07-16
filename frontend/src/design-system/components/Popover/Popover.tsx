import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

/** Popover — Radix floating panel (collision-aware), token surface + animation. */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = 'center', sideOffset = 8, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[1300] w-72 rounded-xl border border-border bg-surface p-4 text-foreground shadow-lg outline-none',
          'origin-[--radix-popover-content-transform-origin] data-[state=open]:animate-[kv-pop-in_150ms_ease-out]',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
