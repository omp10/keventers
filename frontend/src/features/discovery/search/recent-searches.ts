/**
 * Recent searches — a tiny, UI-level localStorage store (like the command
 * palette's recents). No business logic: purely what the user typed, newest
 * first, capped. Safe against storage failures (private mode etc.).
 */
const KEY = 'kv-recent-searches';
const MAX = 6;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): void {
  const t = term.trim();
  if (t.length < 2) return;
  try {
    const next = [t, ...getRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
