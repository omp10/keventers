import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

/**
 * Tabs — Radix (arrow-key nav, a11y). Two visual styles: `line` (underline,
 * dashboards) and `pill` (segmented control). Token-driven; the active indicator
 * animates via layout when using framer, but CSS is used here for zero-dep speed.
 */
export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: 'line' | 'pill' }
>(function TabsList({ className, variant = 'line', ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      data-variant={variant}
      className={cn(
        'inline-flex items-center',
        variant === 'line' && 'gap-1 border-b border-border w-full',
        variant === 'pill' && 'gap-1 rounded-xl bg-muted p-1',
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { variant?: 'line' | 'pill' }
>(function TabsTrigger({ className, variant = 'line', ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium outline-none transition-all',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 text-foreground-muted',
        variant === 'line' &&
          'relative px-3 py-2.5 -mb-px border-b-2 border-transparent hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground',
        variant === 'pill' &&
          'rounded-lg px-3 py-1.5 hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('mt-4 outline-none data-[state=active]:animate-[kv-fade-in_180ms_ease-out]', className)}
      {...props}
    />
  );
});
