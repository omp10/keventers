import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system/icons';

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  size?: 'sm' | 'md';
};

/** Checkbox — Radix primitive (full keyboard + a11y), token-styled, animated check. */
export const Checkbox = forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  function Checkbox({ className, size = 'md', ...props }, ref) {
    const box = size === 'sm' ? 'size-4' : 'size-[1.15rem]';
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          box,
          'peer shrink-0 grid place-items-center rounded-[0.4em] border border-input bg-surface text-primary-foreground',
          'transition-[background-color,border-color,box-shadow] duration-150 ease-standard',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
          'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="grid place-items-center text-current data-[state=checked]:animate-[kv-fade-in_120ms_ease-out]">
          {props.checked === 'indeterminate' ? (
            <Icon name="remove" size={size === 'sm' ? 'xs' : 'sm'} strokeWidth={3} />
          ) : (
            <Icon name="check" size={size === 'sm' ? 'xs' : 'sm'} strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);
