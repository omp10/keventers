import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/**
 * Card — the primary surface. Compound API (Card.Header/Title/Description/Content/
 * Footer) for consistent internal rhythm. `interactive` adds a hover lift for
 * clickable cards. All spacing/radius/elevation are tokenized.
 */
export const cardVariants = cva('bg-surface text-foreground rounded-xl border transition-all duration-200 ease-standard', {
  variants: {
    variant: {
      elevated: 'border-border shadow-sm',
      outline: 'border-border shadow-none',
      ghost: 'border-transparent bg-transparent shadow-none',
      glass: 'border-[var(--kv-glass-border)] bg-[var(--kv-glass-bg)] backdrop-blur-[20px] shadow-lg',
    },
    interactive: { true: 'cursor-pointer hover:-translate-y-1 hover:shadow-lg', false: '' },
    padding: { none: 'p-0', sm: 'p-4', md: 'p-5', lg: 'p-6' },
  },
  defaultVariants: { variant: 'elevated', interactive: false, padding: 'none' },
});

export type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Root = forwardRef<HTMLDivElement, CardProps>(function Card({ className, variant, interactive, padding, ...props }, ref) {
  return <div ref={ref} className={cn(cardVariants({ variant, interactive, padding }), className)} {...props} />;
});

const Header = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex flex-col gap-1 p-6 pb-3', className)} {...props} />;
});

const Title = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle({ className, ...props }, ref) {
  return <h3 ref={ref} className={cn('text-lg font-semibold leading-tight tracking-[-0.01em]', className)} {...props} />;
});

const Description = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-foreground-muted leading-normal', className)} {...props} />;
});

const Content = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
});

const Footer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex items-center gap-3 p-6 pt-3 border-t border-border', className)} {...props} />;
});

export const Card = Object.assign(Root, { Header, Title, Description, Content, Footer });
