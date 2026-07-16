import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/design-system/icons';

/**
 * Dropdown menu — Radix (typeahead, arrow-nav, submenus). Token-styled items with
 * icon + shortcut slots. Full keyboard + screen-reader support out of the box.
 */
export const Dropdown = DropdownMenuPrimitive.Root;
export const DropdownTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownGroup = DropdownMenuPrimitive.Group;
export const DropdownSub = DropdownMenuPrimitive.Sub;
export const DropdownRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-[1300] min-w-[11rem] overflow-hidden rounded-xl border border-border bg-surface p-1 text-foreground shadow-lg outline-none',
          'origin-[--radix-dropdown-menu-content-transform-origin] data-[state=open]:animate-[kv-pop-in_150ms_ease-out]',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

const itemBase =
  'relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-[var(--kv-hover)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export type DropdownItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  icon?: IconName;
  shortcut?: string;
  destructive?: boolean;
};

export const DropdownItem = forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, DropdownItemProps>(
  function DropdownItem({ className, icon, shortcut, destructive, children, ...props }, ref) {
    return (
      <DropdownMenuPrimitive.Item ref={ref} className={cn(itemBase, destructive && 'text-danger focus:bg-danger-soft', className)} {...props}>
        {icon && <Icon name={icon} size="sm" className="text-foreground-muted" />}
        <span className="flex-1">{children}</span>
        {shortcut && <span className="text-xs text-foreground-subtle tracking-wide">{shortcut}</span>}
      </DropdownMenuPrimitive.Item>
    );
  },
);

export const DropdownLabel = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownLabel({ className, ...props }, ref) {
  return <DropdownMenuPrimitive.Label ref={ref} className={cn('px-2.5 py-1.5 text-xs font-semibold text-foreground-subtle uppercase tracking-wider', className)} {...props} />;
});

export const DropdownSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownSeparator({ className, ...props }, ref) {
  return <DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
});
