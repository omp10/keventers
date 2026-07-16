import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/design-system/icons';

export const inputVariants = cva(
  cn(
    'flex w-full min-w-0 bg-surface text-foreground rounded-lg border border-input',
    'placeholder:text-foreground-subtle',
    'transition-[color,box-shadow,border-color] duration-150 ease-standard',
    'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/50',
  ),
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-sm rounded-md',
        md: 'h-10 px-3 text-[0.9375rem]',
        lg: 'h-11 px-3.5 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof inputVariants> & {
    /** Icon or node pinned to the start/end (search icon, unit, clear button). */
    leftIcon?: IconName;
    rightIcon?: IconName;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    invalid?: boolean;
  };

/**
 * Input — token-driven text field with icon/adornment slots and a clear invalid
 * state. Adornments are positioned absolutely and the input padding adapts, so
 * search fields, currency inputs, password toggles all use ONE component.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'md', leftIcon, rightIcon, startAdornment, endAdornment, invalid, disabled, ...props },
  ref,
) {
  const hasStart = leftIcon || startAdornment;
  const hasEnd = rightIcon || endAdornment;
  if (!hasStart && !hasEnd) {
    return (
      <input
        ref={ref}
        className={cn(inputVariants({ size }), className)}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      />
    );
  }
  return (
    <div className="relative flex items-center">
      {hasStart && (
        <span className="pointer-events-none absolute left-3 inline-flex text-foreground-subtle">
          {leftIcon ? <Icon name={leftIcon} size="sm" /> : startAdornment}
        </span>
      )}
      <input
        ref={ref}
        className={cn(inputVariants({ size }), hasStart && 'pl-9', hasEnd && 'pr-9', className)}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...props}
      />
      {hasEnd && (
        <span className="absolute right-3 inline-flex text-foreground-subtle">
          {rightIcon ? <Icon name={rightIcon} size="sm" /> : endAdornment}
        </span>
      )}
    </div>
  );
});
