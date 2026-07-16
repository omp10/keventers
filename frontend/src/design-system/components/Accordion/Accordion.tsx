import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system/icons';

/** Accordion — Radix (a11y, keyboard). Height animates via Radix CSS variables. */
export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return <AccordionPrimitive.Item ref={ref} className={cn('border-b border-border', className)} {...props} />;
});

export const AccordionTrigger = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          'flex flex-1 items-center justify-between gap-4 py-4 text-left text-[0.9375rem] font-medium outline-none transition-colors',
          'hover:text-primary focus-visible:ring-2 focus-visible:ring-ring rounded-md',
          '[&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <Icon name="chevronDown" size="sm" className="shrink-0 text-foreground-muted transition-transform duration-200 ease-standard" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

export const AccordionContent = forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        'overflow-hidden text-sm text-foreground-muted',
        'data-[state=open]:animate-[kv-accordion-down_220ms_ease-standard] data-[state=closed]:animate-[kv-accordion-up_180ms_ease-standard]',
      )}
      {...props}
    >
      <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
});
