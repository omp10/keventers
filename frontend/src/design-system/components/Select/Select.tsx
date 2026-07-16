import * as SelectPrimitive from '@radix-ui/react-select';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system/icons';

/** Select — Radix (typeahead, keyboard, a11y). Token-styled trigger + menu. */
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: 'sm' | 'md' | 'lg' }
>(function SelectTrigger({ className, size = 'md', children, ...props }, ref) {
  const h = size === 'sm' ? 'h-8 text-sm' : size === 'lg' ? 'h-11 text-base' : 'h-10 text-[0.9375rem]';
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        h,
        'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 text-foreground',
        'outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60',
        'data-[placeholder]:text-foreground-subtle disabled:opacity-50 disabled:cursor-not-allowed',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <Icon name="chevronsUpDown" size="sm" className="text-foreground-subtle" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

export const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent({ className, children, position = 'popper', ...props }, ref) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        className={cn(
          'z-[1300] max-h-72 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-surface p-1 text-foreground shadow-lg',
          'data-[state=open]:animate-[kv-pop-in_150ms_ease-out]',
          position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

export const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-2.5 pr-8 text-sm outline-none',
        'focus:bg-[var(--kv-hover)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2.5 inline-flex">
        <SelectPrimitive.ItemIndicator>
          <Icon name="check" size="sm" className="text-primary" strokeWidth={2.5} />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
});

export const SelectLabel = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(function SelectLabel({ className, ...props }, ref) {
  return <SelectPrimitive.Label ref={ref} className={cn('px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground-subtle', className)} {...props} />;
});

export const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(function SelectSeparator({ className, ...props }, ref) {
  return <SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
});
