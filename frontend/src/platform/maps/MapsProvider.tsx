import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isMapsConfigured, loadGoogleMaps, type MapsNamespace } from './loader';

export type MapsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

type MapsContextValue = {
  status: MapsStatus;
  maps: MapsNamespace | null;
  error: Error | null;
};

const MapsContext = createContext<MapsContextValue | null>(null);

/**
 * MapsProvider — loads the Maps SDK once (lazily) and exposes its readiness to the
 * tree. Mount it high in the app; hooks/components below read `useMaps()` instead
 * of loading the SDK themselves. Safe when unconfigured (status 'unconfigured').
 */
export function MapsProvider({ children, eager = false }: { children: ReactNode; eager?: boolean }) {
  const [status, setStatus] = useState<MapsStatus>(isMapsConfigured() ? 'idle' : 'unconfigured');
  const [maps, setMaps] = useState<MapsNamespace | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!eager || !isMapsConfigured() || started.current) return;
    started.current = true;
    setStatus('loading');
    loadGoogleMaps()
      .then((m) => {
        setMaps(m);
        setStatus('ready');
      })
      .catch((e: Error) => {
        setError(e);
        setStatus('error');
      });
  }, [eager]);

  const value = useMemo<MapsContextValue>(() => ({ status, maps, error }), [status, maps, error]);
  return <MapsContext.Provider value={value}>{children}</MapsContext.Provider>;
}

export function useMapsContext(): MapsContextValue {
  const ctx = useContext(MapsContext);
  if (!ctx) throw new Error('useMaps must be used within <MapsProvider>');
  return ctx;
}
