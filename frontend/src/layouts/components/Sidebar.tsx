import { cn } from '@/lib/cn';
import { Icon, Tooltip } from '@/design-system';
import { Logo } from '@/assets';
import { useUIStore } from '@/store/ui.store';
import { defaultRenderLink, type NavSection, type RenderLink } from '../types';

export type SidebarProps = {
  sections: NavSection[];
  footer?: React.ReactNode;
  renderLink?: RenderLink;
  className?: string;
};

/**
 * Sidebar — the collapsible primary nav rail shared by dashboard shells. Reads
 * collapse state from the UI store, shows tooltips when collapsed, and highlights
 * the active item. Token-driven; identical structure for Restaurant + Admin.
 */
export function Sidebar({ sections, footer, renderLink = defaultRenderLink, className }: SidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'group/sidebar flex h-full flex-col border-r border-border bg-surface transition-[width] duration-200 ease-standard',
        collapsed ? 'w-[4.25rem]' : 'w-64',
        className,
      )}
    >
      <div className={cn('flex h-15 shrink-0 items-center px-4', collapsed && 'justify-center px-0')}>
        <Logo variant={collapsed ? 'mark' : 'full'} size={28} />
      </div>

      {/* The nav is its OWN scroll container: a long nav (admin has ~17 items)
          scrolls here, independently of the page, and `overscroll-contain` stops
          that scroll from chaining out to the page when it bottoms out. */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {sections.map((section, si) => (
          <div key={si} className="mb-4 last:mb-0">
            {section.title && !collapsed && (
              <p className="px-2 pb-1.5 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-foreground-subtle">{section.title}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const content = (
                  <span
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none',
                      'focus-visible:ring-2 focus-visible:ring-ring',
                      item.active
                        ? 'bg-primary-soft text-primary'
                        : 'text-foreground-muted hover:bg-[var(--kv-hover)] hover:text-foreground',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    {item.icon && <Icon name={item.icon} size="sm" className="shrink-0" />}
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge}
                  </span>
                );
                return (
                  <li key={item.key}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right">
                        {renderLink(item, content)}
                      </Tooltip>
                    ) : (
                      renderLink(item, content)
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
    </aside>
  );
}
