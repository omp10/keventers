import type { RequestConfig } from '@/platform/api';

/**
 * OFFLINE MUTATION QUEUE — durable (localStorage) queue of mutations made while
 * offline, replayed on reconnect. Only serializable request parts are stored
 * (no signals/callbacks). This is the reliability backbone for the future PWA
 * offline mode — business code just marks a mutation `offlineQueueable`.
 */
export type QueuedRequest = {
  id: string;
  method: string;
  path: string;
  body?: unknown;
  query?: RequestConfig['query'];
  headers?: Record<string, string>;
  createdAt: number;
};

const KEY = 'kv-offline-queue';

function read(): QueuedRequest[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function write(items: QueuedRequest[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

export const offlineQueue = {
  add(req: { method: string; path: string; config: RequestConfig }): QueuedRequest {
    const entry: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: req.method,
      path: req.path,
      body: req.config.body instanceof FormData ? undefined : req.config.body, // FormData isn't serializable
      query: req.config.query,
      headers: req.config.headers,
      createdAt: Date.now(),
    };
    const items = read();
    items.push(entry);
    write(items);
    return entry;
  },
  all: read,
  remove(id: string) { write(read().filter((r) => r.id !== id)); },
  clear() { write([]); },
  size: () => read().length,
};
