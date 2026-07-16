/**
 * THEME GENERATOR — the only module that touches the DOM for theming. It turns a
 * Brand into a single managed <style> tag (`--kv-*` variables for :root + .dark)
 * and toggles the color scheme. Design intent:
 *   • Rebrand / density change → regenerate the stylesheet (rare).
 *   • Light/dark toggle → just flip the `.dark` class (instant, no recompute).
 * This keeps theme switching frame-perfect.
 */
import type { Brand } from '../brand';
import { PREFIX } from './css-vars';
import { resolveScheme, serializeVars, type Scheme } from './theme-resolver';

const STYLE_ID = 'kv-theme-vars';

/** Full runtime stylesheet: light on :root, dark-differing on :root.dark. */
export function buildThemeStylesheet(brand: Brand): string {
  const light = resolveScheme(brand, 'light');
  const dark = resolveScheme(brand, 'dark');

  // Only emit the vars that actually differ in dark (colors + shadows) to keep
  // the .dark block small; scheme-independent tokens live once on :root.
  const darkDiff: Record<string, string> = {};
  for (const [k, v] of Object.entries(dark)) {
    if (light[k] !== v) darkDiff[k] = v;
  }

  return [
    `:root {`,
    serializeVars(light),
    `  color-scheme: light;`,
    `}`,
    ``,
    `:root.dark {`,
    serializeVars(darkDiff),
    `  color-scheme: dark;`,
    `}`,
  ].join('\n');
}

/** Upsert the managed <style> tag with the brand's variables. SSR-safe (no-op). */
export function applyBrand(brand: Brand): void {
  if (typeof document === 'undefined') return;
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = buildThemeStylesheet(brand);

  const root = document.documentElement;
  root.dataset.brand = brand.id;
  root.dataset.density = brand.density;
  root.dataset.radius = brand.radius;
  // Density scales the whole rem-based system via the root font size.
  root.style.setProperty('font-size', `var(${PREFIX}-root-font)`);
}

/** Flip the color scheme. `system` resolves against the media query. */
export function applyScheme(scheme: Scheme | 'system'): Scheme {
  const resolved: Scheme =
    scheme === 'system'
      ? typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : scheme;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }
  return resolved;
}
