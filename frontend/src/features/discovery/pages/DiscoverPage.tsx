import { useSearchParams } from 'react-router-dom';

import type { DiscoveryViewMode } from '../hooks';
import { DiscoveryBrowser } from './DiscoveryBrowser';

/** /discover — the full browse experience (search + filters + list/map/split). */
export function DiscoverPage() {
  const [params] = useSearchParams();
  const view = (params.get('view') as DiscoveryViewMode) || 'list';
  const q = params.get('q') ?? undefined;
  return (
    <DiscoveryBrowser
      initialView={view === 'map' || view === 'split' ? view : 'list'}
      initialFilters={{ sort: 'nearest', q }}
    />
  );
}
