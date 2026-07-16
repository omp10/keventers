/**
 * ASSET SYSTEM — centralized brand + illustration assets. All are theme-aware
 * inline SVGs (no binary files, no per-brand duplication) so the whole visual
 * identity rebrands from the theme. Backgrounds/patterns are exposed as gradient
 * tokens (see @/theme gradients) applied via the `bg-*` utilities.
 */
export { Logo } from './brand/Logo';
export type { LogoProps } from './brand/Logo';
export { Mark } from './brand/Mark';
export type { MarkProps } from './brand/Mark';
export { Illustration } from './illustrations/Illustration';
export type { IllustrationName, IllustrationProps } from './illustrations/Illustration';
