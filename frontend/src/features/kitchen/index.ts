/**
 * KITCHEN DISPLAY SYSTEM (Phase F5) — a dedicated, immersive, touch-first KDS at
 * /kitchen (its own shell; NOT the dashboard shell). Realtime kanban board, large
 * order cards, prep timers, SLA monitoring, station management, chef assignment,
 * recall/re-fire, audio alerts, and full-screen mode. Consumes the backend Kitchen
 * Engine + Order Engine + Analytics + Notifications via the Socket Platform (no
 * polling). No business rules on the frontend.
 */
export { KitchenShell, KitchenBoardRoute, KitchenDashboardRoute, KitchenStationsRoute, KitchenHistoryRoute, KitchenMenuRoute, KitchenProfileRoute } from './routes';
export { KitchenLoginPage } from './KitchenLoginPage';
export { KitchenTabBar, KITCHEN_TABS, type KitchenTab } from './KitchenTabBar';
export { KitchenOnboardingGate, KitchenOnboardingPage } from './KitchenOnboarding';
export { KitchenRegisterPage } from './KitchenRegisterPage';

export * from './types';
export * from './hooks';
export * from './components';
export * from './panels';
export { KitchenBoard, KitchenColumn } from './board';
export { KitchenDashboard } from './dashboard';
export { StationManagement } from './stations';
export { useKitchenMode } from './fullscreen';
export { kitchenAudio, playKitchenSound, useKitchenAudio } from './audio';
export { kitchenService } from './services';
