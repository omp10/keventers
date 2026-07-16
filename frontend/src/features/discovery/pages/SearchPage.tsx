import { useSearchParams } from 'react-router-dom';

import { DiscoveryBrowser } from './DiscoveryBrowser';

/** /search — search-first browse. Seeds the query from ?q=. */
export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Search</h1>
      <DiscoveryBrowser initialFilters={{ q, sort: q ? 'rating' : 'nearest' }} initialView="list" showLocationBar={false} />
    </div>
  );
}
