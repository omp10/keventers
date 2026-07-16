import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Drawer, DrawerContent } from '@/design-system';
import { useUIStore } from '@/store/ui.store';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import type { NavSection, RenderLink } from './types';

export type AppShellProps = {
  sections: NavSection[];
  sidebarFooter?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  renderLink?: RenderLink;
  children: ReactNode;
  /** Constrain the content width (dashboards) or go full-bleed. */
  contentWidth?: 'default' | 'wide' | 'full';
  className?: string;
};

const WIDTH = { default: 'max-w-[80rem]', wide: 'max-w-[96rem]', full: 'max-w-none' };

/**
 * AppShell — the SHARED dashboard shell (sidebar + frosted topbar + scrollable
 * content) that Restaurant + Admin layouts are built on. The sidebar collapses on
 * desktop and becomes a drawer on mobile. One shell = one consistent chrome
 * across every management surface.
 */
export function AppShell({ sections, sidebarFooter, title, actions, renderLink, children, contentWidth = 'default', className }: AppShellProps) {
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <div className={cn('flex h-dvh overflow-hidden bg-background', className)}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar sections={sections} footer={sidebarFooter} renderLink={renderLink} />
      </div>

      {/* Mobile sidebar drawer */}
      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} direction="left">
        <DrawerContent side="left" className="w-64 p-0">
          <Sidebar sections={sections} footer={sidebarFooter} renderLink={renderLink} className="w-full border-r-0" />
        </DrawerContent>
      </Drawer>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} actions={actions} />
        <main className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', WIDTH[contentWidth])}>{children}</div>
        </main>
      </div>
    </div>
  );
}
