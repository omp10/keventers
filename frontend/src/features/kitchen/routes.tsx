import { lazyRoute } from '@/platform/error';

/**
 * KITCHEN (KDS) ROUTES — a DEDICATED immersive app at /kitchen (its own shell, no
 * dashboard sidebar), auth-gated. Pages are lazy-loaded. The board is the index.
 */
export { KitchenShell } from './KitchenShell';

export const KitchenBoardRoute = lazyRoute(() => import('./board').then((m) => ({ default: m.KitchenBoard })));
export const KitchenDashboardRoute = lazyRoute(() => import('./dashboard').then((m) => ({ default: m.KitchenDashboard })));
/**
 * ORDERS — the SAME live-orders board the manager dashboard uses (list / kanban
 * / compact / table, filters, realtime), reused wholesale rather than rebuilt.
 * The KDS board is a cook's view of tickets; this is the order-level view, and
 * kitchen staff asked for both without leaving /kitchen.
 */
export const KitchenOrdersRoute = lazyRoute(() => import('@/features/restaurant/pages/LiveOrdersPage').then((m) => ({ default: m.LiveOrdersPage })));
/**
 * TABLES replaces Stations in the tab bar. Station routing configures which
 * cook prepares what — real for a multi-line kitchen, noise for the single
 * counter most branches run. Creating tables and printing their QR codes is
 * what every new branch actually needs on day one.
 */
export const KitchenTablesRoute = lazyRoute(() => import('./pages/KitchenTablesPage').then((m) => ({ default: m.KitchenTablesPage })));
export const KitchenStationsRoute = lazyRoute(() => import('./stations').then((m) => ({ default: m.StationManagement })));
export const KitchenStaffRoute = lazyRoute(() => import('./staff').then((m) => ({ default: m.KitchenStaffPage })));
export const KitchenHistoryRoute = lazyRoute(() => import('./pages/KitchenExtraPages').then((m) => ({ default: m.KitchenHistoryPage })));
export const KitchenMenuRoute = lazyRoute(() => import('./pages/KitchenExtraPages').then((m) => ({ default: m.KitchenMenuPage })));
export const KitchenProfileRoute = lazyRoute(() => import('./pages/KitchenExtraPages').then((m) => ({ default: m.KitchenProfilePage })));
