import { lazy } from 'react';

/**
 * KITCHEN (KDS) ROUTES — a DEDICATED immersive app at /kitchen (its own shell, no
 * dashboard sidebar), auth-gated. Pages are lazy-loaded. The board is the index.
 */
export { KitchenShell } from './KitchenShell';

export const KitchenBoardRoute = lazy(() => import('./board').then((m) => ({ default: m.KitchenBoard })));
export const KitchenDashboardRoute = lazy(() => import('./dashboard').then((m) => ({ default: m.KitchenDashboard })));
export const KitchenStationsRoute = lazy(() => import('./stations').then((m) => ({ default: m.StationManagement })));
export const KitchenStaffRoute = lazy(() => import('./staff').then((m) => ({ default: m.KitchenStaffPage })));
export const KitchenHistoryRoute = lazy(() => import('./pages/KitchenExtraPages').then((m) => ({ default: m.KitchenHistoryPage })));
export const KitchenMenuRoute = lazy(() => import('./pages/KitchenExtraPages').then((m) => ({ default: m.KitchenMenuPage })));
export const KitchenProfileRoute = lazy(() => import('./pages/KitchenExtraPages').then((m) => ({ default: m.KitchenProfilePage })));
