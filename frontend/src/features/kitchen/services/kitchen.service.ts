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
  queue(filters?: KitchenFilterState) {
    return api.get<KitchenEntry[]>(`${BASE}/queue`, { query: toParams(filters) });
  }

  get(orderId: string) {
    return api.get<KitchenEntry>(`${BASE}/orders/${orderId}`);
  }

  stations() {
    return api.get<KitchenStation[]>(`${BASE}/stations`);
  }

  chefs() {
    return api.get<KitchenChef[]>(`${BASE}/chefs`);
  }

  metrics() {
    return api.get<KitchenMetrics>(`${BASE}/metrics`);
  }

  /** Advance/adjust an order through the backend kitchen state machine. `:id` = order id. */
  transition(orderId: string, action: KitchenAction, payload?: Record<string, unknown>) {
    return api.post<KitchenEntry>(`${BASE}/orders/${orderId}/${ACTION_PATH[action]}`, payload);
  }

  setStationStatus(stationId: string, status: string) {
    return api.patch<KitchenStation>(`${BASE}/stations/${stationId}`, { status });
  }
}

export const kitchenService = new KitchenService();
