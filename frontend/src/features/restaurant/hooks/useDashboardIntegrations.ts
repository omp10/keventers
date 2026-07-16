import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { toast } from '@/design-system';
import { useRegisterCommands } from '@/platform/command';
import { useSearchProvider, type SearchResult } from '@/platform/search';
import { staffOrderService } from '../services';

/**
 * useDashboardIntegrations — wires the dashboard into the platform Command Palette
 * (⌘K) and Global Search. Orders become searchable everywhere; navigation +
 * actions become commands. Both reuse the platform registries — nothing bespoke.
 */
export function useDashboardIntegrations() {
  const navigate = useNavigate();

  useRegisterCommands(
    [
      { id: 'nav-dashboard', title: 'Go to Dashboard', icon: 'dashboard', section: 'Navigate', run: () => navigate('/dashboard') },
      { id: 'nav-orders', title: 'Go to Orders', icon: 'order', section: 'Navigate', run: () => navigate('/dashboard/orders') },
      { id: 'nav-analytics', title: 'Go to Analytics', icon: 'trend', section: 'Navigate', run: () => navigate('/dashboard/analytics') },
      { id: 'nav-kitchen', title: 'Go to Kitchen', icon: 'flame', section: 'Navigate', run: () => navigate('/dashboard/kitchen') },
      { id: 'act-search-orders', title: 'Search orders', icon: 'search', section: 'Orders', keywords: ['find order'], run: () => navigate('/dashboard/orders') },
      { id: 'act-create-order', title: 'Create manual order', icon: 'add', section: 'Orders', run: () => toast.info('Manual order creation arrives in a later phase') },
    ],
    [navigate],
  );

  const provider = useMemo(
    () => ({
      id: 'staff-orders',
      label: 'Orders',
      icon: 'order' as const,
      access: { anyPermission: ['order:read', 'order:manage'] },
      search: async (q: string): Promise<SearchResult[]> => {
        const page = await staffOrderService.list({ q }, 1, 6);
        return page.items.map((o) => ({
          id: o.id,
          title: `#${o.orderNumber}`,
          subtitle: `${o.customerName ?? o.tableLabel ?? 'Guest'} · ${o.status}`,
          icon: 'order' as const,
          group: 'Orders',
          href: `/dashboard/orders?order=${o.id}`,
        }));
      },
    }),
    [],
  );

  useSearchProvider(provider);
}
