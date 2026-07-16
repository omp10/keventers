import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('kv-installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    window.dispatchEvent(new Event('kv-installed'));
  });
}

/**
 * useInstallPrompt — exposes the PWA install affordance. Captures the browser's
 * `beforeinstallprompt` and lets the UI trigger the native prompt on demand.
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(Boolean(deferred));
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener('kv-installable', onInstallable);
    window.addEventListener('kv-installed', onInstalled);
    return () => {
      window.removeEventListener('kv-installable', onInstallable);
      window.removeEventListener('kv-installed', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    setCanInstall(false);
    return choice.outcome === 'accepted';
  }, []);

  return { canInstall, installed, promptInstall };
}
