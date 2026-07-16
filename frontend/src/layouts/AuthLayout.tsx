import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { ThemeToggleButton } from '@/design-system';
import { Logo } from '@/assets';

export type AuthLayoutProps = {
  children: ReactNode;
  /** Marketing/brand panel content (hidden on mobile). */
  aside?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * AuthLayout — a premium split sign-in shell: a brand-gradient panel on the left
 * (desktop) and a centered form card on the right. Collapses to a single centered
 * column on mobile. Used for login / register / reset flows across every app.
 */
export function AuthLayout({ children, aside, title, subtitle, footer, className }: AuthLayoutProps) {
  return (
    <div className={cn('grid min-h-dvh lg:grid-cols-2 bg-background', className)}>
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-10 text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-active" />
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(120% 120% at 100% 0%, color-mix(in oklab, white 18%, transparent) 0%, transparent 45%)' }} />
        <div className="relative">
          <Logo size={34} className="[&_span]:!text-primary-foreground" />
        </div>
        <div className="relative max-w-md">
          {aside ?? (
            <>
              <h2 className="text-3xl font-bold tracking-tight text-balance">Craft every order into an experience.</h2>
              <p className="mt-3 text-primary-foreground/80">One premium platform for ordering, kitchen, payments and loyalty.</p>
            </>
          )}
        </div>
        <div className="relative text-sm text-primary-foreground/70">© {new Date().getFullYear()} · Built with care</div>
      </div>

      {/* Form column */}
      <div className="relative flex flex-col items-center justify-center px-6 py-10">
        <div className="absolute right-5 top-5">
          <ThemeToggleButton />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-6 lg:hidden">
              <Logo size={30} />
            </div>
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {subtitle && <p className="mt-1.5 text-sm text-foreground-muted">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-8 text-center text-sm text-foreground-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
