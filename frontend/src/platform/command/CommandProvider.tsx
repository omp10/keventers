import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { CommandPalette, type CommandGroup } from '@/design-system';
import { useUIStore } from '@/store/ui.store';
import { usePermissions } from '@/platform/permissions';
import { useGlobalSearch } from '@/platform/search';
import { useNavigation } from '@/navigation';
import type { NavConfig } from '@/navigation';
import { commandRegistry, type AppCommand } from './registry';

const RECENTS_KEY = 'kv-command-recents';
const RECENTS_MAX = 6;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function pushRecent(id: string) {
  try {
    const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type CommandContextValue = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  registerCommand: (command: AppCommand) => () => void;
  registerCommands: (commands: AppCommand[]) => () => void;
};

const CommandContext = createContext<CommandContextValue | null>(null);

function useRegisteredCommands(): AppCommand[] {
  return useSyncExternalStore(
    (cb) => commandRegistry.subscribe(cb),
    () => commandRegistry.all(),
    () => commandRegistry.all(),
  );
}

/**
 * COMMAND PALETTE PROVIDER — the single ⌘K launcher. It composes three sources,
 * all permission-filtered: registered commands, config-driven NAVIGATION for the
 * active app, and live GLOBAL SEARCH results. Open state lives in the UI store so
 * anything (topbar button, shortcut) can trigger it. Renders the F1 palette.
 */
export function CommandProvider({ children, navApp }: { children: ReactNode; navApp?: NavConfig['app'] }) {
  const openState = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const toggleOpen = useUIStore((s) => s.toggleCommand);
  const [query, setQuery] = useState('');

  const navigate = useNavigate();
  const { can } = usePermissions();
  const registered = useRegisteredCommands();
  const nav = useNavigation(navApp ?? 'customer');
  const { results: searchResults } = useGlobalSearch(query, { minLength: 2 });

  // Register the global shortcut + reset the query whenever the palette closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleOpen();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleOpen]);

  useEffect(() => {
    if (!openState) setQuery('');
  }, [openState]);

  const run = useCallback(
    (id: string, fn: () => void) => {
      pushRecent(id);
      setOpen(false);
      fn();
    },
    [setOpen],
  );

  // Config-driven navigation → commands (only when there's an active nav app).
  const navCommands = useMemo<AppCommand[]>(() => {
    if (!navApp) return [];
    const items = [...nav.sections.flatMap((s) => s.items), ...nav.tabs];
    return items
      .filter((i) => i.href)
      .map((i) => ({
        id: `nav:${i.key}`,
        title: i.label,
        icon: i.icon,
        section: 'Navigation',
        keywords: ['go to', 'open', i.label],
        run: () => navigate(i.href!),
      }));
  }, [navApp, nav, navigate]);

  const groups = useMemo<CommandGroup[]>(() => {
    const permitted = registered.filter((c) => can(c.access));
    const all = [...permitted, ...navCommands];

    // Live search results take over the list once the user types.
    if (query.trim().length >= 2 && searchResults.length > 0) {
      const searchGroup: CommandGroup = {
        heading: 'Results',
        items: searchResults.map((r) => ({
          id: `search:${r.id}`,
          label: r.subtitle ? `${r.title} — ${r.subtitle}` : r.title,
          icon: r.icon,
          onSelect: () => run(`search:${r.id}`, () => (r.onSelect ? r.onSelect() : r.href ? navigate(r.href) : undefined)),
        })),
      };
      const actionGroup: CommandGroup = {
        heading: 'Commands',
        items: all.map((c) => ({ id: c.id, label: c.title, icon: c.icon, shortcut: c.shortcut, keywords: c.keywords, onSelect: () => run(c.id, c.run) })),
      };
      return [searchGroup, actionGroup];
    }

    // Idle: recents first, then commands grouped by section.
    const recentIds = loadRecents();
    const byId = new Map(all.map((c) => [c.id, c]));
    const recent = recentIds.map((id) => byId.get(id)).filter(Boolean) as AppCommand[];

    const sections = new Map<string, AppCommand[]>();
    for (const c of all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const key = c.section ?? 'Commands';
      const arr = sections.get(key) ?? [];
      arr.push(c);
      sections.set(key, arr);
    }

    const toItems = (cmds: AppCommand[]) =>
      cmds.map((c) => ({ id: c.id, label: c.title, icon: c.icon, shortcut: c.shortcut, keywords: c.keywords, onSelect: () => run(c.id, c.run) }));

    const out: CommandGroup[] = [];
    if (recent.length) out.push({ heading: 'Recent', items: toItems(recent) });
    for (const [heading, cmds] of sections) out.push({ heading, items: toItems(cmds) });
    return out;
  }, [registered, navCommands, can, query, searchResults, run, navigate]);

  const value = useMemo<CommandContextValue>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: toggleOpen,
      registerCommand: (c) => commandRegistry.register(c),
      registerCommands: (c) => commandRegistry.registerMany(c),
    }),
    [setOpen, toggleOpen],
  );

  const searching = query.trim().length >= 2;

  return (
    <CommandContext.Provider value={value}>
      {children}
      <CommandPalette
        open={openState}
        onOpenChange={setOpen}
        groups={groups}
        searchValue={query}
        onSearchChange={setQuery}
        shouldFilter={!searching}
        placeholder="Search or run a command…"
      />
    </CommandContext.Provider>
  );
}

export function useCommandContext(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommandContext must be used within <CommandProvider>');
  return ctx;
}
