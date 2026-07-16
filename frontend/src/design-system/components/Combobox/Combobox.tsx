import { Command } from 'cmdk';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system/icons';
import { Popover, PopoverTrigger, PopoverContent } from '@/design-system/components/Popover';

/**
 * Combobox / Autocomplete — a searchable single-select (cmdk filtering inside a
 * Popover). Covers Combobox + Autocomplete + async Search needs. Fully keyboard
 * accessible; token-styled to match Select.
 */
export type ComboboxOption = { value: string; label: string; icon?: ReactNode; keywords?: string[] };

export type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** For async search: called on input change (debounce upstream). */
  onSearch?: (query: string) => void;
};

export function Combobox({ options, value, onChange, placeholder = 'Select…', searchPlaceholder = 'Search…', emptyMessage = 'No results.', disabled, className, onSearch }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 text-[0.9375rem] text-foreground',
          'outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        aria-expanded={open}
        role="combobox"
      >
        <span className={cn('truncate', !selected && 'text-foreground-subtle')}>{selected?.label ?? placeholder}</span>
        <Icon name="chevronsUpDown" size="sm" className="shrink-0 text-foreground-subtle" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command loop shouldFilter={!onSearch}>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Icon name="search" size="sm" className="text-foreground-subtle" />
            <Command.Input placeholder={searchPlaceholder} onValueChange={onSearch} className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-subtle" />
          </div>
          <Command.List className="max-h-60 overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-foreground-muted">{emptyMessage}</Command.Empty>
            {options.map((opt) => (
              <Command.Item
                key={opt.value}
                value={`${opt.label} ${(opt.keywords ?? []).join(' ')}`}
                onSelect={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-[var(--kv-hover)]"
              >
                {opt.icon}
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.value === value && <Icon name="check" size="sm" className="text-primary" strokeWidth={2.5} />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
