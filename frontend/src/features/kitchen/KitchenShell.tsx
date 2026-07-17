import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Icon, Spinner, type IconName } from '@/design-system';
import { Logo } from '@/assets';
import { useConnectionState } from '@/platform/socket';
import { cn } from '@/lib/cn';
import { useKitchenAudio } from './audio';
import { useKitchenMode } from './fullscreen';
import { useKitchenMetrics, useKitchenRealtime } from './hooks';
import { KitchenFilters, KitchenSearch } from './panels';

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/kitchen', label: 'Board', icon: 'grid', end: true },
  { to: '/kitchen/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/kitchen/stations', label: 'Stations', icon: 'flame' },
  { to: '/kitchen/history', label: 'History', icon: 'clock' },
  { to: '/kitchen/menu', label: 'Menu', icon: 'utensils' },
  { to: '/kitchen/profile', label: 'Profile', icon: 'user' },
];

/**
 * KitchenShell — the immersive KDS shell (its OWN chrome, no dashboard sidebar). It
 * mounts the ONE realtime engine, wires audio + fullscreen + wake-lock, and shows a
 * high-contrast topbar with SLA summary, search/filters, connection status, and the
 * board/dashboard/stations tabs. Optimized for tablets, touch screens, and TVs.
 */
export function KitchenShell() {
  const navigate = useNavigate();
  useKitchenRealtime();
  const mode = useKitchenMode();
  const audio = useKitchenAudio();
  const metrics = useKitchenMetrics();
  const { state } = useConnectionState();
  const m = metrics.data;

  const online = state === 'connected';

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="text-lg font-bold tracking-tight">Kitchen</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-11 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon name={t.icon} className="h-5 w-5" />
                <span className="hidden sm:inline">{t.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* SLA summary */}
            {m && (
              <div className="hidden items-center gap-2 md:flex">
                <SlaPill tone="success" label="On-time" value={`${Math.round((m.sla.onTimeRate <= 1 ? m.sla.onTimeRate * 100 : m.sla.onTimeRate))}%`} />
                {m.sla.approaching > 0 && <SlaPill tone="warning" label="Approaching" value={String(m.sla.approaching)} />}
                {m.sla.breached > 0 && <SlaPill tone="danger" label="Breached" value={String(m.sla.breached)} pulse />}
              </div>
            )}

            {/* Connection */}
            <span className={cn('inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium', online ? 'text-success' : 'text-warning')} title={`Realtime: ${state}`}>
              <span className={cn('h-2.5 w-2.5 rounded-full', online ? 'bg-success' : 'bg-warning animate-[kv-pulse_1.2s_ease-in-out_infinite] motion-reduce:animate-none')} />
            </span>

            {/* Audio */}
            <button type="button" aria-label={audio.enabled ? 'Mute alerts' : 'Unmute alerts'} onClick={() => audio.setEnabled(!audio.enabled)} className={cn('grid h-11 w-11 place-items-center rounded-lg hover:bg-muted', audio.enabled ? 'text-primary' : 'text-foreground-subtle')}>
              <Icon name={audio.enabled ? 'bell' : 'wifiOff'} className="h-5 w-5" />
            </button>

            {/* Fullscreen */}
            <button type="button" aria-label={mode.isFullscreen ? 'Exit full screen' : 'Enter full screen'} onClick={mode.toggle} className="grid h-11 w-11 place-items-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground">
              <Icon name={mode.isFullscreen ? 'eyeOff' : 'external'} className="h-5 w-5" />
            </button>

            {/* Exit to dashboard */}
            <button type="button" aria-label="Exit kitchen mode" onClick={() => navigate('/dashboard')} className="grid h-11 w-11 place-items-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground">
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-2 px-4 pb-2.5 lg:flex-row lg:items-center">
          <KitchenSearch className="lg:max-w-md" />
          <KitchenFilters className="flex-1" />
        </div>
      </header>

      <main className="flex-1 p-4">
        <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Spinner /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function SlaPill({ tone, label, value, pulse }: { tone: 'success' | 'warning' | 'danger'; label: string; value: string; pulse?: boolean }) {
  const cls = { success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger' }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold', cls, pulse && 'animate-[kv-pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none')}>
      {value} <span className="font-medium opacity-80">{label}</span>
    </span>
  );
}
