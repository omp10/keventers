import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

/** RadioGroup — Radix (roving focus, arrow-key nav). Compose with RadioGroupItem. */
export const RadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(function RadioGroup({ className, ...props }, ref) {
  return <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2.5', className)} {...props} />;
});

export const RadioGroupItem = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(function RadioGroupItem({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square size-[1.15rem] rounded-full border border-input bg-surface text-primary',
        'transition-[border-color,box-shadow] duration-150 ease-standard',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-[state=checked]:border-primary disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="grid place-items-center after:size-[0.6rem] after:rounded-full after:bg-primary after:content-[''] after:animate-[kv-fade-in_120ms_ease-out]" />
    </RadioGroupPrimitive.Item>
  );
});
