import { useState, type ReactNode } from 'react';

import { Badge, Button, Drawer, DrawerContent, type IconName } from '@/design-system';
import { toast } from '@/design-system';
import { cn } from '@/lib/cn';
import { downloadFile } from '../services';

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

/** Generic status pill (theme-driven). */
export function StatusPill({ tone = 'neutral', children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return <Badge tone={tone} variant="soft" className={cn('capitalize', className)}>{children}</Badge>;
}

/**
 * EntityDrawer — the reusable right-side drawer for create/edit forms across
 * management. Provides header + scrollable body + footer slot.
 */
export function EntityDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  const width = size === 'xl' ? 'sm:max-w-2xl' : size === 'md' ? 'sm:max-w-md' : 'sm:max-w-lg';
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContent side="right" className={cn('flex w-full flex-col p-0', width)}>
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="border-t border-border p-4">{footer}</footer>}
      </DrawerContent>
    </Drawer>
  );
}

/** Export button — downloads a backend export through the API Platform (auth-safe). */
export function ExportButton({ url, filename, label = 'Export', icon = 'download' as IconName }: { url: string; filename: string; label?: string; icon?: IconName }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      leftIcon={icon}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFile(url, filename);
        } catch (e) {
          toast.error('Export failed', { description: (e as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
