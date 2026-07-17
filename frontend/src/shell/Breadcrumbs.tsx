import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Breadcrumb, type Crumb } from '@/design-system';
import { navConfigs } from '@/navigation';
import type { NavConfig, NavNode } from '@/navigation';

/**
 * Breadcrumbs — derived from the SAME navigation config the sidebar uses, so
 * labels stay in sync automatically. Matches the current path against nav nodes;
 * apps don't hand-maintain a parallel breadcrumb list.
 */
function flatten(config: NavConfig): NavNode[] {
  const out: NavNode[] = [];
  const walk = (nodes: NavNode[]) => nodes.forEach((n) => { out.push(n); if (n.children) walk(n.children); });
  config.groups.forEach((g) => walk(g.items));
  if (config.tabs) walk(config.tabs);
  return out;
}

export function Breadcrumbs({ app, home = 'Home', className }: { app: NavConfig['app']; home?: string; className?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const crumbs = useMemo<Crumb[]>(() => {
    const config = navConfigs[app];
    const nodes = flatten(config);
    // Longest matching prefix wins, then build ancestry by path segments.
    const matches = nodes
      .filter((n) => n.path && (pathname === n.path || pathname.startsWith(n.path + '/')))
      .sort((a, b) => (a.path!.length - b.path!.length));

    // Home is THIS app's root. Hardcoding '/' threw dashboard/admin/kitchen
    // users out into the customer storefront — a different app entirely.
    const root = config.root;
    const list: Crumb[] = [{ label: home, href: root, onClick: () => navigate(root) }];
    for (const n of matches) {
      if (n.path === root) continue;
      list.push({ label: n.label, href: n.path, onClick: () => navigate(n.path!) });
    }
    return list;
  }, [app, pathname, home, navigate]);

  if (crumbs.length <= 1) return null;
  return <Breadcrumb items={crumbs} className={className} renderLink={(item, children) => <button type="button" onClick={item.onClick}>{children}</button>} />;
}
