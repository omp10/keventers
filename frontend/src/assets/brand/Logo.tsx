import { cn } from '@/lib/cn';
import { useBrand } from '@/theme';
import { Mark } from './Mark';

export type LogoProps = {
  /** 'full' = mark + wordmark; 'mark' = glyph only (collapsed nav). */
  variant?: 'full' | 'mark';
  size?: number;
  className?: string;
};

/**
 * Brand LOGO — mark + wordmark, fully theme-driven (reads brand name/colors). No
 * asset file required; rebrands automatically. Every layout/nav uses this rather
 * than importing an image, so switching brand switches every logo instantly.
 */
export function Logo({ variant = 'full', size = 30, className }: LogoProps) {
  const { appName } = useBrand();
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <Mark size={size} />
      {variant === 'full' && (
        <span
          className="font-display font-bold tracking-tight text-foreground"
          style={{ fontSize: size * 0.6 }}
        >
          {appName}
        </span>
      )}
    </span>
  );
}
