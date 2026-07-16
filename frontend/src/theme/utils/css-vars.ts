/**
 * CSS custom-property naming — the bridge between the TS token layer and the CSS
 * runtime. Every themed value lives under the `--kv-*` namespace; Tailwind's
 * `@theme inline` (globals.css) maps its utilities onto these, so `bg-primary`
 * compiles to `var(--kv-color-primary)` and we swap the VALUE at runtime to
 * rebrand / switch scheme with zero recompilation.
 *
 * Use these helpers anywhere you need a token value in JS/inline style so you
 * never type a raw `var(--kv-…)` string (and typos become type errors).
 */
import type { ColorRole } from '../tokens/colors';
import type { RadiusToken } from '../tokens/radius';
import type { ShadowToken } from '../tokens/shadows';

export const PREFIX = '--kv';

export const colorVarName = (role: ColorRole) => `${PREFIX}-color-${kebab(role)}`;
export const radiusVarName = (token: RadiusToken) => `${PREFIX}-radius-${token}`;
export const shadowVarName = (token: ShadowToken) => `${PREFIX}-shadow-${token}`;

/** `var(--kv-color-<role>)` — for gradients, inline styles, canvas, etc. */
export const color = (role: ColorRole) => `var(${colorVarName(role)})`;
export const radiusVar = (token: RadiusToken) => `var(${radiusVarName(token)})`;
export const shadowVar = (token: ShadowToken) => `var(${shadowVarName(token)})`;
export const font = (family: 'sans' | 'display' | 'mono') => `var(${PREFIX}-font-${family})`;
export const duration = (ms: string) => `var(${PREFIX}-duration-${ms})`;
export const z = (layer: string) => `var(${PREFIX}-z-${layer})`;

/** camelCase → kebab-case for CSS custom-property names. */
function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export { kebab };
