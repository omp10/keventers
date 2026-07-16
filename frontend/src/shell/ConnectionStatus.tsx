import { useEffect, useState } from 'react';

import { Icon } from '@/design-system';
import { cn } from '@/lib/cn';
import { useOffline } from '@/platform/offline';
import { useConnectionState } from '@/platform/socket';

/**
 * ConnectionStatus — a single, reusable indicator of network + realtime health.
 * Reads the Offline Platform (browser online/offline + pending queue) and the
 * Socket Platform (connection state). Shows a banner only when something's wrong,
 * so it's invisible on the happy path.
 */
export function ConnectionStatus({ className }: { className?: string }) {
  const { isOnline, pending } = useOffline();
  const { state: socket } = useConnectionState();
  const [justReconnected, setJustReconnected] = useState(false);
  const [wasDown, setWasDown] = useState(false);

  const down = !isOnline || socket === 'reconnecting' || socket === 'disconnected' || socket === 'error';

  useEffect(() => {
    if (down) {
      setWasDown(true);
      setJustReconnected(false);
    } else if (wasDown) {
      setJustReconnected(true);
      setWasDown(false);
      const t = setTimeout(() => setJustReconnected(false), 2500);
      return () => clearTimeout(t);
    }
  }, [down, wasDown]);

  if (!down && !justReconnected) return null;

  if (justReconnected) {
    return (
      <div className={cn('flex h-8 items-center justify-center gap-2 bg-success text-success-foreground text-xs font-medium', className)}>
        <Icon name="wifi" size="sm" />
        Back online{pending > 0 ? ` · syncing ${pending}…` : ''}
      </div>
    );
  }

  return (
    <div className={cn('flex h-8 items-center justify-center gap-2 bg-warning text-warning-foreground text-xs font-medium', className)}>
      <Icon name="wifiOff" size="sm" />
      {!isOnline ? "You're offline" : 'Reconnecting…'}
      {pending > 0 ? ` · ${pending} change${pending === 1 ? '' : 's'} queued` : ''}
    </div>
  );
}
