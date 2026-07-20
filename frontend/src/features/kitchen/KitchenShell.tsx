import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
  Icon,
  Spinner,
} from '@/design-system';
import { Logo } from '@/assets';
import { useConnectionState } from '@/platform/socket';
import { cn } from '@/lib/cn';
import { useKitchenAudio } from './audio';
import { useKitchenMode } from './fullscreen';
import { useKitchenMetrics, useKitchenRealtime } from './hooks';
import { isAudioLocked, onAudioLockChange, playOrderAlert } from '@/utils/order-alert';
import { KITCHEN_TABS, KitchenTabBar } from './KitchenTabBar';
import { KitchenFilters, KitchenSearch } from './panels';

/**
 * KitchenShell — the immersive KDS shell (its OWN chrome, no dashboard sidebar).
 * It mounts the ONE realtime engine and wires audio + fullscreen + wake-lock.
 *
 * TWO SHAPES, one shell:
 *  · phone   — a 56px brand bar and a pinned BOTTOM TAB BAR. Navigation belongs
 *              under the thumb, not in the header.
 *  · md+     — the classic KDS topbar (tabs + SLA + controls inline), which is
 *              what tablets, wall displays and TVs actually want.
 *
 * The header stays deliberately thin because vertical space IS the product here:
 * every pixel of chrome is a pixel not showing orders. Search and station
 * filters therefore render ONLY on the board, the one screen they act on —
 * carrying them onto Menu or Profile was pure noise.
 */
export function KitchenShell() {
  const navigate = useNavigate();
  const location = useLocation();
  useKitchenRealtime();
  // A kitchen that believes it will be alerted but is silently muted by the
  // browser's autoplay policy misses orders. Surface it and let one tap fix it.
  const [soundBlocked, setSoundBlocked] = useState(isAudioLocked());
  useEffect(() => onAudioLockChange(setSoundBlocked), []);
  const mode = useKitchenMode();
  const audio = useKitchenAudio();
  const metrics = useKitchenMetrics();
  const { state } = useConnectionState();
  const m = metrics.data;

  const online = state === 'connected';
  const onBoard = location.pathname === '/kitchen';

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header
        className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-14 items-center gap-2 px-3 md:h-16 md:px-4">
          <div className="flex shrink-0 items-center gap-2">
            <Logo size={26} />
            <span className="text-base font-bold tracking-tight md:text-lg">Kitchen</span>
          </div>

          {/* Tablet/TV nav. On phones this lives in the bottom tab bar. */}
          <nav aria-label="Kitchen sections" className="ml-2 hidden items-center gap-1 md:flex">
            {KITCHEN_TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground-muted hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon name={t.icon} className="h-5 w-5" />
                <span className="hidden lg:inline">{t.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-0.5 md:gap-1">
            {/* SLA summary — the one metric worth header space, and only where it fits. */}
            {m && (
              <div className="hidden items-center gap-2 xl:flex">
                <SlaPill
                  tone="success"
                  label="On-time"
                  value={`${Math.round(m.sla.onTimeRate <= 1 ? m.sla.onTimeRate * 100 : m.sla.onTimeRate)}%`}
                />
                {m.sla.approaching > 0 && <SlaPill tone="warning" label="Approaching" value={String(m.sla.approaching)} />}
                {m.sla.breached > 0 && <SlaPill tone="danger" label="Breached" value={String(m.sla.breached)} pulse />}
              </div>
            )}

            {/* Breached count survives on phones — it's the one thing worth interrupting for. */}
            {m && m.sla.breached > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-danger-soft px-2 py-1 text-xs font-bold text-danger xl:hidden">
                <Icon name="warning" className="h-3.5 w-3.5" />
                {m.sla.breached}
              </span>
            )}

            <span
              className="inline-flex h-9 w-6 items-center justify-center"
              title={`Realtime: ${state}`}
              aria-label={`Realtime ${state}`}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  online
                    ? 'bg-success'
                    : 'bg-warning animate-[kv-pulse_1.2s_ease-in-out_infinite] motion-reduce:animate-none',
                )}
              />
            </span>

            <button
              type="button"
              aria-label={audio.enabled ? 'Mute alerts' : 'Unmute alerts'}
              onClick={() => audio.setEnabled(!audio.enabled)}
              className={cn(
                'grid h-11 w-11 place-items-center rounded-lg hover:bg-muted',
                audio.enabled ? 'text-primary' : 'text-foreground-subtle',
              )}
            >
              <Icon name={audio.enabled ? 'bell' : 'wifiOff'} className="h-5 w-5" />
            </button>

            {/* Full screen + exit are rare, deliberate actions: inline on big
                screens, tucked into an overflow on phones. */}
            <button
              type="button"
              aria-label={mode.isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              onClick={mode.toggle}
              className="hidden h-11 w-11 place-items-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground md:grid"
            >
              <Icon name={mode.isFullscreen ? 'eyeOff' : 'external'} className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Exit kitchen mode"
              onClick={() => navigate('/dashboard')}
              className="hidden h-11 w-11 place-items-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground md:grid"
            >
              <Icon name="logout" className="h-5 w-5" />
            </button>

            <Dropdown>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  aria-label="More options"
                  className="grid h-11 w-11 place-items-center rounded-lg text-foreground-muted hover:bg-muted hover:text-foreground md:hidden"
                >
                  <Icon name="more" className="h-5 w-5" />
                </button>
              </DropdownTrigger>
              <DropdownContent align="end">
                <DropdownItem onSelect={() => mode.toggle()}>
                  <Icon name={mode.isFullscreen ? 'eyeOff' : 'external'} className="mr-2 h-4 w-4" />
                  {mode.isFullscreen ? 'Exit full screen' : 'Full screen'}
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => navigate('/dashboard')}>
                  <Icon name="logout" className="mr-2 h-4 w-4" />
                  Exit kitchen mode
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </div>

        {/* Search + station filters act on the BOARD only. */}
        {onBoard && (
          <div className="flex flex-col gap-2 px-3 pb-2.5 md:px-4 lg:flex-row lg:items-center">
            <KitchenSearch className="lg:max-w-md" />
            <KitchenFilters className="flex-1" />
          </div>
        )}
      </header>

      {/* Browser has audio muted until someone interacts — say so loudly. */}
      {soundBlocked && (
        <button
          type="button"
          onClick={() => void playOrderAlert(1)}
          className="flex w-full items-center justify-center gap-2 bg-warning px-3 py-2 text-sm font-semibold text-warning-foreground"
        >
          <Icon name="warning" className="h-4 w-4" />
          Sound is blocked — tap once to enable new-order alerts
        </button>
      )}

      {/* pb clears the fixed tab bar (its height + the home-indicator inset). */}
      <main className="flex-1 p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-4 md:pb-4">
        <Suspense
          fallback={
            <div className="grid min-h-[60vh] place-items-center">
              <Spinner />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <KitchenTabBar className="md:hidden" />
    </div>
  );
}

function SlaPill({
  tone,
  label,
  value,
  pulse,
}: {
  tone: 'success' | 'warning' | 'danger';
  label: string;
  value: string;
  pulse?: boolean;
}) {
  const cls = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold',
        cls,
        pulse && 'animate-[kv-pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none',
      )}
    >
      {value} <span className="font-medium opacity-80">{label}</span>
    </span>
  );
}
