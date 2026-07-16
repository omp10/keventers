import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * ManagementPage — the shared page frame for every management screen: title,
 * optional description, right-aligned actions, and content. Keeps all management
 * pages visually consistent (Shopify/Square feel) and tablet-friendly.
 */
export function ManagementPage({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
