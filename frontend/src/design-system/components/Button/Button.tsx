import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { focusRing } from '@/utils/style';
import { Icon, type IconName } from '@/design-system/icons';

/**
 * Button — the flagship control. Every visual property is token-driven, so it
 * rebrands automatically. Supports variants × sizes × states (loading, disabled),
 * icon slots, `asChild` (render as a link), full a11y + a tactile press. The
 * tactile feel is pure CSS (`active:scale`) so it stays fast and composes with
 * `asChild`.
 */
export const buttonVariants = cva(
  cn(
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'font-semibold tracking-[-0.006em] rounded-lg',
    'transition-[transform,background-color,box-shadow,color,border-color] duration-150 ease-standard',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50',
    'data-[loading=true]:pointer-events-none',
    focusRing,
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active',
        secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-muted',
        outline: 'border border-border bg-transparent text-foreground hover:bg-[var(--kv-hover)] hover:border-border-strong',
        ghost: 'bg-transparent text-foreground hover:bg-[var(--kv-hover)]',
        subtle: 'bg-primary-soft text-primary hover:bg-[color-mix(in_oklab,var(--kv-color-primary)_18%,transparent)]',
        danger: 'bg-danger text-danger-foreground shadow-sm hover:brightness-95 active:brightness-90',
        success: 'bg-success text-success-foreground shadow-sm hover:brightness-95',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto rounded-none',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs gap-1.5 [&_svg]:size-3.5',
        sm: 'h-8 px-3 text-sm [&_svg]:size-4',
        md: 'h-10 px-4 text-[0.9375rem] [&_svg]:size-[1.125rem]',
        lg: 'h-11 px-5 text-base [&_svg]:size-5',
        xl: 'h-13 px-6 text-lg [&_svg]:size-5',
        icon: 'h-10 w-10 p-0 [&_svg]:size-[1.125rem]',
        'icon-sm': 'h-8 w-8 p-0 [&_svg]:size-4',
        'icon-lg': 'h-11 w-11 p-0 [&_svg]:size-5',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    /** Semantic icon names rendered before/after the label. */
    leftIcon?: IconName;
    rightIcon?: IconName;
    children?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, asChild, loading = false, leftIcon, rightIcon, disabled, children, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);
  const isIconOnly = size === 'icon' || size === 'icon-sm' || size === 'icon-lg';

  // `asChild` renders the consumer's element (e.g. a router <Link>); Slot merges
  // onto a SINGLE child, so we pass `children` through untouched.
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} aria-disabled={disabled || loading || undefined} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <Icon name="spinner" className={cn('animate-[spin_0.7s_linear_infinite]', !isIconOnly && 'absolute')} aria-hidden />
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>
        {leftIcon && <Icon name={leftIcon} />}
        {children}
        {rightIcon && <Icon name={rightIcon} />}
      </span>
    </button>
  );
});
