import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppShell as ShellLayout } from '@/layouts';
import type { NavConfig } from '@/navigation';
import { useNavigation } from '@/navigation';
import { NotificationCenter } from '@/platform/notifications';
import { EnvironmentBanner } from './EnvironmentBanner';
import { CommandTrigger } from './CommandTrigger';
import { Breadcrumbs } from './Breadcrumbs';

export type AppShellProps = {
  /** Which nav config drives the sidebar (also breadcrumbs + command nav). */
  app: NavConfig['app'];
  title?: ReactNode;
  /** App-specific quick actions rendered in the topbar. */
  quickActions?: ReactNode;
  sidebarFooter?: ReactNode;
  showBreadcrumbs?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  contentWidth?: 'default' | 'wide' | 'full';
  children: ReactNode;
};

/**
 * APPLICATION SHELL — the platform composition every management app mounts. It
 * layers the global chrome (environment banner, connection status, loading bar)
 * over the F1 AppShell layout, and wires the config-driven sidebar, command
 * palette trigger, notification center, and breadcrumbs. Apps pass `app` + content;
 * they never re-assemble this plumbing. Navigation changes = editing nav config.
 */
export function AppShell({
  app,
  title,
  quickActions,
  sidebarFooter,
  showBreadcrumbs = true,
  showSearch = true,
  showNotifications = true,
  contentWidth = 'default',
  children,
}: AppShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { sections } = useNavigation(app, pathname);

  const actions = (
    <div className="flex items-center gap-2">
      {showSearch && <CommandTrigger />}
      {quickActions}
      {showNotifications && <NotificationCenter />}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col">
      <EnvironmentBanner />
      <div className="min-h-0 flex-1">
        <ShellLayout
          sections={sections}
          sidebarFooter={sidebarFooter}
          title={title ?? (showBreadcrumbs ? <Breadcrumbs app={app} /> : undefined)}
          actions={actions}
          contentWidth={contentWidth}
          renderLink={(item, children, className) => (
            <button type="button" onClick={() => item.href && navigate(item.href)} className={className}>
              {children}
            </button>
          )}
        >
          {children}
        </ShellLayout>
      </div>
    </div>
  );
}
