import type { IconName } from '@/design-system';
import type { AccessRule } from '@/platform/permissions';

/**
 * GLOBAL SEARCH PLATFORM — one search engine; modules REGISTER searchable entity
 * providers (orders, products, customers, restaurants, coupons, tables…). The
 * engine fans a query across all permitted providers and aggregates results.
 * Nothing hardcodes the entity list — it's pluggable.
 */
export type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Group heading in the results UI (usually the provider label). */
  group: string;
  href?: string;
  onSelect?: () => void;
  /** Opaque data for the consumer. */
  meta?: unknown;
};

export type SearchProvider = {
  id: string;
  label: string;
  icon?: IconName;
  /** Hide this provider's results unless the user satisfies the rule. */
  access?: AccessRule;
  /** Return matches for a query. May honor the AbortSignal for cancellation. */
  search: (query: string, signal?: AbortSignal) => Promise<SearchResult[]> | SearchResult[];
};

class SearchRegistry {
  private providers = new Map<string, SearchProvider>();
  private listeners = new Set<() => void>();

  register(provider: SearchProvider): () => void {
    this.providers.set(provider.id, provider);
    this.emit();
    return () => this.unregister(provider.id);
  }
  unregister(id: string) {
    this.providers.delete(id);
    this.emit();
  }
  all(): SearchProvider[] {
    return [...this.providers.values()];
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const searchRegistry = new SearchRegistry();
