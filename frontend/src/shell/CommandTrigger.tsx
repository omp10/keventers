import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { useCommandPalette } from '@/platform/command';

/**
 * CommandTrigger — the topbar "search / ⌘K" button that opens the command palette.
 * A thin, reusable affordance; the palette itself lives in the Command Platform.
 */
export function CommandTrigger({ className }: { className?: string }) {
  const { open } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground-muted transition hover:border-border-strong hover:text-foreground',
        className,
      )}
    >
      <Icon name="search" size="sm" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="ml-2 hidden items-center rounded border border-border px-1.5 text-[0.6875rem] font-medium sm:inline-flex">⌘K</kbd>
    </button>
  );
}
