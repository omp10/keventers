import { api } from '@/platform/api';
import type {
  KitchenAction,
  KitchenChef,
  KitchenEntry,
  KitchenFilterState,
  KitchenMetrics,
  KitchenStation,
} from '../types';

/**
 * KITCHEN SERVICE — the ONLY place the KDS talks to the backend Kitchen Engine.
 * Components go hooks → this → API Platform. The backend owns routing, timers, SLA,
 * assignment, and the workflow state machine; the frontend sends an action verb and
 * renders the result. Realtime freshness comes from the Socket Platform (never poll).
 */
const BASE = '/restaurant/kitchen';

type KitchenWireEntry = Partial<KitchenEntry> & {
  queuedAt?: string | null;
  elapsedSeconds?: number;
  slaTargetSeconds?: number | null;
  slaBreached?: boolean;
};

function normalizeEntry(raw: KitchenWireEntry): KitchenEntry {
  const timers = raw.timers ?? {
    queuedAt: raw.queuedAt ?? new Date().toISOString(),
  };
  const elapsed = raw.sla?.elapsedSeconds ?? raw.elapsedSeconds ?? 0;
  const target = raw.sla?.targetSeconds ?? raw.slaTargetSeconds ?? undefined;
  const state = raw.sla?.state ?? (
    raw.slaBreached || (target != null && elapsed >= target)
      ? 'breached'
      : target != null && elapsed >= target * 0.8
        ? 'approaching'
        : 'on_time'
  );

  return {
    ...raw,
    id: raw.id ?? raw.orderId ?? '',
    orderId: raw.orderId ?? raw.id ?? '',
    orderNumber: raw.orderNumber ?? 'Pending',
    status: raw.status ?? 'pending',
    priority: raw.priority ?? 'normal',
    items: Array.isArray(raw.items) ? raw.items : [],
    paymentStatus: raw.paymentStatus ?? 'pending',
    timers,
    sla: { ...raw.sla, state, targetSeconds: target, elapsedSeconds: elapsed },
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    createdAt: raw.createdAt ?? timers.queuedAt,
  };
}

/** Map UI verbs → backend transition path segments. */
const ACTION_PATH: Record<KitchenAction, string> = {
  assign: 'assign',
  start: 'preparing',
  ready: 'ready',
  serve: 'served',
  recall: 'recall',
  refire: 'refire',
  cancel: 'cancel',
  priority: 'priority',
};

function toParams(f?: KitchenFilterState) {
  if (!f) return undefined;
  return {
    q: f.search || undefined,
    stationId: f.stationId,
    chefId: f.chefId,
    priority: f.priority,
    status: f.status,
    channel: f.channel,
  };
}

class KitchenService {
  /** The live queue (bounded — no pagination; realtime-driven). */
  async queue(filters?: KitchenFilterState) {
    const page = await api.paginate<KitchenWireEntry>(`${BASE}/queue`, {
      query: { ...toParams(filters), page: 1, limit: 100 },
    });
    return page.items.map(normalizeEntry);
  }

  get(orderId: string) {
    return api.get<KitchenWireEntry>(`${BASE}/orders/${orderId}`).then(normalizeEntry);
  }

  async stations() {
    const page = await api.paginate<KitchenStation>(`${BASE}/stations`, {
      query: { page: 1, limit: 100 },
    });
    return page.items;
  }

  chefs() {
    return api.get<KitchenChef[]>(`${BASE}/chefs`);
  }

  metrics() {
    return api.get<KitchenMetrics>(`${BASE}/metrics`);
  }

  /** Advance/adjust an order through the backend kitchen state machine. `:id` = order id. */
  transition(orderId: string, action: KitchenAction, payload?: Record<string, unknown>) {
    return api
      .post<KitchenWireEntry>(`${BASE}/orders/${orderId}/${ACTION_PATH[action]}`, payload)
      .then(normalizeEntry);
  }

  setStationStatus(stationId: string, status: string) {
    return api.patch<KitchenStation>(`${BASE}/stations/${stationId}`, { status });
  }
}

export const kitchenService = new KitchenService();
