import { useTheme, type ThemeMode } from '@/theme';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/design-system/icons';

const MODES: { mode: ThemeMode; icon: IconName; label: string }[] = [
  { mode: 'light', icon: 'sun', label: 'Light' },
  { mode: 'dark', icon: 'moon', label: 'Dark' },
  { mode: 'system', icon: 'settings', label: 'System' },
];

/**
 * ThemeToggle — a segmented light/dark/system control wired to the theme engine.
 * Switching is instant (class flip) and persisted. Fully keyboard accessible.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  return (
    <div role="radiogroup" aria-label="Color theme" className={cn('inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5', className)}>
      {MODES.map(({ mode: m, icon, label }) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          aria-label={label}
          title={label}
          onClick={() => setMode(m)}
          className={cn(
            'grid size-7 place-items-center rounded-md text-foreground-muted transition-colors outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
            mode === m && 'bg-surface text-foreground shadow-sm',
          )}
        >
          <Icon name={icon} size="sm" />
        </button>
      ))}
    </div>
  );
}

/** Compact single-button variant (mobile toolbars). */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { scheme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${scheme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn('grid size-9 place-items-center rounded-lg text-foreground-muted hover:bg-[var(--kv-hover)] hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      <Icon name={scheme === 'dark' ? 'sun' : 'moon'} size="sm" />
    </button>
  );
}
