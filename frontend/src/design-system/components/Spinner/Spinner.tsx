import { cn } from '@/lib/cn';

const SIZE = { xs: 'size-3.5 border-[1.5px]', sm: 'size-4 border-2', md: 'size-5 border-2', lg: 'size-7 border-[2.5px]', xl: 'size-10 border-[3px]' } as const;

export type SpinnerProps = {
  size?: keyof typeof SIZE;
  className?: string;
  label?: string;
};

/** Spinner — a token-tinted, GPU-cheap CSS ring. Announces itself to AT. */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <span
        className={cn(
          SIZE[size],
          'inline-block rounded-full border-current border-t-transparent text-primary',
          'animate-[kv-spin_0.7s_linear_infinite]',
          className,
        )}
      />
    </span>
  );
}
