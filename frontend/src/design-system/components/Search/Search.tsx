import { forwardRef } from 'react';

import { cn } from '@/lib/cn';
import { Input, type InputProps } from '@/design-system/components/Input';
import { Icon } from '@/design-system/icons';

export type SearchProps = Omit<InputProps, 'leftIcon' | 'type'> & {
  onClear?: () => void;
  loading?: boolean;
};

/** Search — an Input preset with a leading magnifier + optional clear button. */
export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search({ onClear, loading, value, className, ...props }, ref) {
  const showClear = onClear && value;
  return (
    <Input
      ref={ref}
      type="search"
      role="searchbox"
      leftIcon="search"
      value={value}
      className={cn('[&::-webkit-search-cancel-button]:hidden', className)}
      endAdornment={
        loading ? (
          <Icon name="spinner" size="sm" className="animate-[kv-spin_0.7s_linear_infinite]" />
        ) : showClear ? (
          <button type="button" onClick={onClear} aria-label="Clear search" className="pointer-events-auto grid size-5 place-items-center rounded-full text-foreground-subtle hover:bg-[var(--kv-hover)] hover:text-foreground">
            <Icon name="close" size="xs" />
          </button>
        ) : undefined
      }
      {...props}
    />
  );
});
