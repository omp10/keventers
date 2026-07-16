import { useEffect, useState } from 'react';

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
 * Brand LOGO — fully theme-driven. Renders the active Brand's scheme-aware logo
 * asset (`brand.logo.light|dark`) when it exists, with the app wordmark beside
 * it; falls back to the generated Mark + wordmark when no asset loads. Every
 * layout/nav uses this rather than importing an image, so switching brand (or
 * scheme) switches every logo instantly.
 */
export function Logo({ variant = 'full', size = 30, className }: LogoProps) {
  const { appName, logoSrc } = useBrand();
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [logoSrc]);

  const glyph =
    logoSrc && !failed ? (
      <img
        src={logoSrc}
        alt={`${appName} logo`}
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
        className="shrink-0 select-none object-contain"
      />
    ) : (
      <Mark size={size} />
    );

  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {glyph}
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
