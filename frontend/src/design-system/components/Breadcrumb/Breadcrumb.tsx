import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system/icons';

export type Crumb = { label: ReactNode; href?: string; onClick?: () => void };

export type BreadcrumbProps = {
  items: Crumb[];
  className?: string;
  /** Render function so consumers can plug a router <Link>. */
  renderLink?: (item: Crumb, children: ReactNode) => ReactNode;
};

/** Breadcrumb — accessible trail with chevron separators + current-page marker. */
export function Breadcrumb({ items, className, renderLink }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const content = (
            <span className={cn(isLast ? 'font-medium text-foreground' : 'text-foreground-muted hover:text-foreground transition-colors')}>
              {item.label}
            </span>
          );
          return (
            <Fragment key={i}>
              <li aria-current={isLast ? 'page' : undefined}>
                {isLast || (!item.href && !item.onClick)
                  ? content
                  : renderLink
                    ? renderLink(item, content)
                    : (
                      <a href={item.href} onClick={item.onClick} className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {content}
                      </a>
                    )}
              </li>
              {!isLast && <Icon name="chevronRight" size="xs" className="text-foreground-subtle" aria-hidden />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
