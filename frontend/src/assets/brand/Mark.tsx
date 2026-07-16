import { cn } from '@/lib/cn';
import { useBrand } from '@/theme';

export type MarkProps = {
  size?: number;
  className?: string;
  /** Force a specific glyph; defaults to the brand's initial. */
  glyph?: string;
};

/**
 * Brand MARK — a themed, inline-SVG app glyph (rounded tile + brand initial with
 * a brand gradient). Fully rebrandable with ZERO asset files: it reads the brand
 * name + primary/accent colors from the theme. Used in collapsed nav, avatars,
 * loading screens, favicons-in-app.
 */
export function Mark({ size = 32, className, glyph }: MarkProps) {
  const { appName } = useBrand();
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
