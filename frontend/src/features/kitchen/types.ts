import type { PaymentStatus } from '@/features/ordering';

/**
 * KITCHEN (KDS) DOMAIN TYPES (Phase F5). The backend Kitchen module owns ALL rules
 * — routing, timers, SLA decisions, assignment, and the workflow state machine. The
 * frontend only renders these and triggers allowed actions. Timers/SLA come from the
 * backend (`sla.state`, elapsed/remaining); the UI may tick a display timer between
 * socket updates for smoothness, but never decides SLA outcomes.
 */
export type { PaymentStatus } from '@/features/ordering';

export type KitchenStatus =
  | 'pending'
  | 'assigned'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'recalled'
  | 'refired'
  | 'cancelled';

/** SLA state — computed by the backend; the UI colors from it. */
export type SlaState = 'on_time' | 'approaching' | 'breached';

export type OrderPriority = 'normal' | 'rush' | 'vip';

export type KitchenItem = {
  id: string;
  name: string;
  quantity: number;
  variantName?: string;
  modifiers?: string[];
  addons?: string[];
  instructions?: string;
  /** Future allergens module. */
  allergens?: string[];
};

export type KitchenTimers = {
  queuedAt: string;
  assignedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  servedAt?: string | null;
};

export type KitchenSla = {
  state: SlaState;
  targetSeconds?: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
};

export type KitchenStationRef = { id: string; name: string };
export type KitchenChefRef = { id: string; name: string };

/** One kitchen queue entry (1:1 with an order). `orderId` drives transitions. */
export type KitchenEntry = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: KitchenStatus;
  priority: OrderPriority;
  station?: KitchenStationRef | null;
  /** Resolved for display by `useKitchenQueue`, which joins the roster. */
  chef?: KitchenChefRef | null;
  /** What the board wire actually sends — an id, with no name attached. */
  currentChefId?: string | null;
  tableLabel?: string;
  channel?: string;
  items: KitchenItem[];
  notes?: string;
  customerNotes?: string;
  paymentStatus: PaymentStatus;
  timers: KitchenTimers;
  sla: KitchenSla;
  recallCount?: number;
  refireCount?: number;
  timeline: { status: KitchenStatus; at: string; note?: string }[];
  createdAt: string;
};

export type StationStatus = 'open' | 'busy' | 'closed';

export type KitchenStation = {
  id: string;
  name: string;
  status: StationStatus;
  capacity?: number;
  load?: number;
  chefIds?: string[];
  /** Categories this station handles (routing preview). */
  categoryNames?: string[];
};

export type KitchenChef = {
  id: string;
  name: string;
  stationId?: string;
  stationName?: string;
  activeCount?: number;
  /** 0..1 workload from the backend. */
  workload?: number;
};

export type KitchenMetrics = {
  active: number;
  waiting: number;
  preparing: number;
  ready: number;
  served: number;
  avgPrepSeconds?: number;
  sla: { onTimeRate: number; approaching: number; breached: number };
  /** 0..1 performance score (backend). */
  performance?: number;
};

/** The staff action verbs, mapped to backend kitchen transitions. `:id` = ORDER id. */
export type KitchenAction = 'assign' | 'start' | 'ready' | 'serve' | 'recall' | 'refire' | 'cancel' | 'priority';

/** Board columns — the operational grouping of kitchen statuses. */
export type KitchenColumnKey = 'pending' | 'assigned' | 'preparing' | 'ready' | 'served';

export const KITCHEN_COLUMNS: { key: KitchenColumnKey; label: string; statuses: KitchenStatus[] }[] = [
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'assigned', label: 'Assigned', statuses: ['assigned'] },
  { key: 'preparing', label: 'Preparing', statuses: ['preparing', 'recalled', 'refired'] },
  { key: 'ready', label: 'Ready', statuses: ['ready'] },
  { key: 'served', label: 'Served', statuses: ['served'] },
];

export type KitchenFilterState = {
  search?: string;
  stationId?: string;
  chefId?: string;
  priority?: OrderPriority;
  status?: KitchenStatus;
  channel?: string;
};
