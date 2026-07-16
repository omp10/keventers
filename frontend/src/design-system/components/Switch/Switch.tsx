import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'md';
};

/** Switch — Radix toggle. Token-styled, spring-like thumb via CSS transition. */
export const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  function Switch({ className, size = 'md', ...props }, ref) {
    const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
    const thumb = size === 'sm' ? 'size-4 data-[state=checked]:translate-x-4' : 'size-5 data-[state=checked]:translate-x-5';
    return (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          track,
          'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5',
          'transition-colors duration-200 ease-standard',
          'bg-input data-[state=checked]:bg-primary',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            thumb,
            'pointer-events-none block rounded-full bg-white shadow-sm ring-0 translate-x-0',
            'transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          )}
        />
      </SwitchPrimitive.Root>
    );
  },
);
