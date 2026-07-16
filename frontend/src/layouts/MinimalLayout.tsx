import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Logo } from '@/assets';

export type MinimalLayoutProps = {
  children: ReactNode;
  /** Center content vertically (errors, success, standalone flows). */
  center?: boolean;
  showLogo?: boolean;
  className?: string;
};

/**
 * MinimalLayout — chrome-free shell for standalone pages (404, success, print,
 * embedded flows). Optional centered logo; the content owns the rest.
 */
export function MinimalLayout({ children, center = true, showLogo = false, className }: MinimalLayoutProps) {
  return (
    <div className={cn('min-h-dvh bg-background', center && 'grid place-items-center', className)}>
      <div className="w-full px-6 py-10">
        {showLogo && (
          <div className="mb-8 flex justify-center">
            <Logo size={30} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
