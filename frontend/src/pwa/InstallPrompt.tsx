import { useState } from 'react';

import { Button, Icon } from '@/design-system';
import { Logo } from '@/assets';
import { useInstallPrompt } from './useInstallPrompt';

const DISMISS_KEY = 'kv-install-dismissed';

/**
 * InstallPrompt — a dismissible "Add to home screen" banner. Shows only when the
 * browser offers installation and the user hasn't dismissed it. Brand-driven (uses
 * the theme Logo) — white-label ready.
 */
export function InstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg">
        <Logo size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install the app</p>
          <p className="text-xs text-foreground-muted">Faster ordering, works offline.</p>
        </div>
        <Button size="sm" onClick={() => void promptInstall()}>Install</Button>
        <button type="button" aria-label="Dismiss" onClick={dismiss} className="grid h-8 w-8 place-items-center rounded-full text-foreground-subtle hover:bg-muted">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
