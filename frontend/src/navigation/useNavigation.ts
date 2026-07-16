import { useMemo } from 'react';

import { usePermissions } from '@/platform/permissions';
import type { NavSection } from '@/layouts';
import { navConfigs } from './config';
import type { NavConfig, NavGroup, NavNode } from './types';

/**
 * useNavigation — resolves a config-driven nav for an app into visible sections,
 * filtering items by the current user's permissions + feature flags. Returns the
 * shape the Sidebar/tabs consume, so switching what's visible = editing config,
 * never components. Pass `activePath` to mark the current item.
 */
export function useNavigation(app: NavConfig['app'] | NavConfig, activePath?: string) {
  const config = typeof app === 'string' ? navConfigs[app] : app;
  const { can } = usePermissions();

  return useMemo(() => {
    const isActive = (path?: string) => (path && activePath ? activePath === path || (path !== '/' && activePath.startsWith(path)) : false);

    const filterNode = (node: NavNode): NavNode | null => {
      if (!can(node.access)) return null;
      const children = node.children?.map(filterNode).filter(Boolean) as NavNode[] | undefined;
      return { ...node, children };
    };

    const sections: NavSection[] = config.groups
      .filter((g: NavGroup) => can(g.access))
      .map((g) => ({
        title: g.title,
        items: g.items
          .map(filterNode)
          .filter(Boolean)
          .map((n) => ({ key: n!.key, label: n!.label, icon: n!.icon, href: n!.path, active: isActive(n!.path), badge: n!.badge })),
      }))
      .filter((s) => s.items.length > 0);

    const tabs = (config.tabs ?? [])
      .map(filterNode)
      .filter(Boolean)
      .map((n) => ({ key: n!.key, label: n!.label, icon: n!.icon, href: n!.path, active: isActive(n!.path), badge: n!.badge }));

    return { sections, tabs, config };
  }, [config, can, activePath]);
}
