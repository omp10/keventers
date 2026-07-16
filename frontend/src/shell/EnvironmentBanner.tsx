import { env } from '@/config/env';
import { cn } from '@/lib/cn';

const LABELS: Record<string, { text: string; className: string }> = {
  development: { text: 'Development', className: 'bg-info text-info-foreground' },
  staging: { text: 'Staging', className: 'bg-warning text-warning-foreground' },
  preview: { text: 'Preview', className: 'bg-accent text-accent-foreground' },
};

/**
 * EnvironmentBanner — a thin ribbon shown in every NON-production environment so
 * nobody mistakes staging for prod. Reads the centralized `env`; renders nothing
 * in production.
 */
export function EnvironmentBanner({ className }: { className?: string }) {
  if (env.isProd) return null;
  const info = LABELS[env.environment] ?? LABELS.development;
  return (
    <div className={cn('flex h-6 items-center justify-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wider', info.className, className)}>
      <span>{info.text}</span>
      <span className="opacity-70">· v{env.build.version} · {env.build.commit.slice(0, 7)}</span>
    </div>
  );
}
