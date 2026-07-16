import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { useBrand } from '@/theme';

export type MarkProps = {
  size?: number;
  className?: string;
  /** Force a specific glyph; defaults to the brand's initial (fallback mark only). */
  glyph?: string;
};

/**
 * Brand MARK — the square app glyph, fully brand-driven. When the active Brand
 * supplies a mark asset (`brand.logo.mark`), that image renders; if the asset
 * is missing or fails to load, it gracefully falls back to the generated
 * inline-SVG tile (rounded square + brand initial on the primary gradient), so
 * a brand preset without files never shows a broken image. Used in nav bars,
 * loading screens, install prompts and avatars.
 */
export function Mark({ size = 32, className, glyph }: MarkProps) {
  const { appName, markSrc } = useBrand();
  const [failed, setFailed] = useState(false);

  // A new brand (new asset path) gets a fresh chance to load.
  useEffect(() => setFailed(false), [markSrc]);

  if (markSrc && !failed) {
    return (
      <img
        src={markSrc}
        alt={`${appName} logo`}
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(true)}
        className={cn('shrink-0 select-none object-contain', className)}
      />
    );
  }

  const letter = (glyph ?? (appName.trim().charAt(0) || 'K')).toUpperCase();
  const id = `kv-mark-${letter}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={`${appName} logo`}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--kv-color-primary)" />
          <stop offset="1" stopColor="var(--kv-color-primary-active)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <text
        x="16"
        y="17"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="var(--kv-font-display)"
        fontSize="17"
        fontWeight="800"
        letterSpacing="-0.03em"
        fill="var(--kv-color-primary-foreground)"
      >
        {letter}
      </text>
    </svg>
  );
}
