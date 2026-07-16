import { useEffect, useRef } from 'react';

import { Spinner } from '@/design-system';

/**
 * InfiniteSentinel — an IntersectionObserver-driven "load more" trigger for
 * infinite lists. Drop it after a list; it calls `onLoadMore` when scrolled into
 * view. Keeps virtualization/pagination concerns out of the list components.
 */
export function InfiniteSentinel({
  hasMore,
  loading,
  onLoadMore,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) onLoadMore();
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) return null;
  return (
    <div ref={ref} className="flex justify-center py-6" aria-hidden={!loading}>
      {loading && <Spinner />}
    </div>
  );
}
