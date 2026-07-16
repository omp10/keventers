import { DiscoveryBrowser } from './DiscoveryBrowser';

/** /nearby — nearest branches first. Prompts for location, falls back to search. */
export function NearbyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Nearby</h1>
      <DiscoveryBrowser initialFilters={{ sort: 'nearest' }} initialView="list" />
    </div>
  );
}
