import { cn } from '@/lib/cn';

/**
 * ILLUSTRATION set — lightweight, theme-aware inline SVGs for empty / error /
 * offline / success / search states. They use SEMANTIC color vars so they tint
 * to the active brand + scheme automatically. Centralized here so state
 * components (EmptyState, ErrorState…) never inline artwork.
 */
export type IllustrationName = 'empty' | 'search' | 'error' | 'offline' | 'success' | 'cart';

export type IllustrationProps = {
  name: IllustrationName;
  size?: number;
  className?: string;
};

const stroke = 'var(--kv-color-foreground-subtle)';
const soft = 'var(--kv-color-primary-soft)';
const primary = 'var(--kv-color-primary)';
const danger = 'var(--kv-color-danger)';
const success = 'var(--kv-color-success)';

function Frame({ children, size, className }: { children: React.ReactNode; size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden className={cn(className)}>
      {children}
    </svg>
  );
}

const art: Record<IllustrationName, (t: { size: number }) => React.ReactNode> = {
  empty: () => (
    <>
      <circle cx="60" cy="60" r="52" fill={soft} />
      <rect x="34" y="46" width="52" height="36" rx="6" fill="var(--kv-color-surface)" stroke={stroke} strokeWidth="2.5" />
      <path d="M34 56h52" stroke={stroke} strokeWidth="2.5" />
      <circle cx="42" cy="51" r="1.8" fill={stroke} />
      <path d="M46 68h28M46 74h18" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  search: () => (
    <>
      <circle cx="60" cy="60" r="52" fill={soft} />
      <circle cx="54" cy="54" r="18" fill="var(--kv-color-surface)" stroke={stroke} strokeWidth="3" />
      <path d="M68 68l12 12" stroke={primary} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  error: () => (
    <>
      <circle cx="60" cy="60" r="52" fill="var(--kv-color-danger-soft)" />
      <path d="M60 40v26" stroke={danger} strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="78" r="3.5" fill={danger} />
    </>
  ),
  offline: () => (
    <>
      <circle cx="60" cy="60" r="52" fill={soft} />
      <path d="M38 62a30 30 0 0144 0" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 72a18 18 0 0124 0" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="60" cy="82" r="3.5" fill={stroke} />
      <path d="M34 34l52 52" stroke={danger} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  success: () => (
    <>
      <circle cx="60" cy="60" r="52" fill="var(--kv-color-success-soft)" />
      <path d="M44 61l11 11 22-24" stroke={success} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cart: () => (
    <>
      <circle cx="60" cy="60" r="52" fill={soft} />
      <path d="M40 44h6l4 30h24l5-20H50" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="55" cy="82" r="3.5" fill={primary} />
      <circle cx="72" cy="82" r="3.5" fill={primary} />
    </>
  ),
};

export function Illustration({ name, size = 120, className }: IllustrationProps) {
  return (
    <Frame size={size} className={className}>
      {art[name]({ size })}
    </Frame>
  );
}
