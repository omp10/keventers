import { Command } from 'cmdk';
import { useEffect, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/design-system/icons';
import { Dialog, DialogPortal, DialogOverlay } from '@/design-system/components/Dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';

/**
 * Command Palette — a ⌘K launcher (cmdk fuzzy search + keyboard) inside a themed
 * dialog. The frosted, elevated surface + brand accents make it feel like Linear/
 * Raycast. Register the global shortcut with `useCommandShortcut`.
 */
export type CommandItem = {
  id: string;
  label: string;
  icon?: IconName;
  shortcut?: string;
  keywords?: string[];
  onSelect: () => void;
};
export type CommandGroup = { heading?: string; items: CommandItem[] };

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  placeholder?: string;
  emptyMessage?: ReactNode;
  /** Controlled search text — pass with `onSearchChange` to drive async search (e.g. global search). */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** When controlling search externally, disable cmdk's built-in client filtering. */
  shouldFilter?: boolean;
};

export function CommandPalette({ open, onOpenChange, groups, placeholder = 'Type a command or search…', emptyMessage = 'No results found.', searchValue, onSearchChange, shouldFilter }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-label="Command palette"
          className={cn(
            'fixed left-1/2 top-[15vh] z-[1600] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2',
            'rounded-2xl border border-[var(--kv-glass-border)] bg-[var(--kv-glass-bg)] backdrop-blur-[24px] shadow-2xl',
            'data-[state=open]:animate-[kv-pop-in_180ms_cubic-bezier(0.16,1,0.3,1)] focus:outline-none',
          )}
        >
          <Command loop shouldFilter={shouldFilter} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-foreground-subtle">
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Icon name="search" size="sm" className="text-foreground-subtle" />
              <Command.Input value={searchValue} onValueChange={onSearchChange} placeholder={placeholder} className="h-14 flex-1 bg-transparent text-[0.9375rem] text-foreground outline-none placeholder:text-foreground-subtle" />
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border px-1.5 text-[0.6875rem] font-medium text-foreground-subtle">ESC</kbd>
            </div>
            <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="py-12 text-center text-sm text-foreground-muted">{emptyMessage}</Command.Empty>
              {groups.map((group, gi) => (
                <Command.Group key={gi} heading={group.heading}>
                  {group.items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${(item.keywords ?? []).join(' ')}`}
                      onSelect={() => {
                        item.onSelect();
                        onOpenChange(false);
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-primary-soft data-[selected=true]:text-primary"
                    >
                      {item.icon && <Icon name={item.icon} size="sm" className="text-foreground-muted data-[selected=true]:text-primary" />}
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && <span className="text-xs text-foreground-subtle">{item.shortcut}</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** Registers the global ⌘K / Ctrl-K shortcut to toggle the palette. */
export function useCommandShortcut(onToggle: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onToggle]);
}
