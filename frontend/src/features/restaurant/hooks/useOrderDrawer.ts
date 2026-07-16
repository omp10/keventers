import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * useOrderDrawer — drives the global order detail drawer via the `?order=` URL
 * param, so an order is deep-linkable and openable from anywhere (board, search,
 * activity feed, command palette).
 */
export function useOrderDrawer() {
  const [params, setParams] = useSearchParams();
  const orderId = params.get('order');

  const open = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set('order', id);
      setParams(next, { replace: false });
    },
    [params, setParams],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('order');
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { orderId, open, close };
}
