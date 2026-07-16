import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn` — the single class-composition primitive used by EVERY component. Merges
 * conditional classes (clsx) and de-duplicates conflicting Tailwind utilities
 * (tailwind-merge), so a consumer's `className` override always wins cleanly
 * (e.g. `<Button className="rounded-none" />` beats the component's `rounded-lg`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
