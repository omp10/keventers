/**
 * STAFF APP (/staff) — the floor-staff phone application: assigned orders, one-tap
 * status updates, history, alerts and profile, behind phone-OTP sign-in. Reuses
 * the CustomerLayout shell, PhoneOtpForm, Notification Platform and the kitchen
 * `/my/*` backend surface (every call is scoped to the authenticated user).
 */
export { StaffShell } from './StaffShell';
export { StaffLoginPage } from './StaffLoginPage';
export { StaffHomePage, StaffOrdersPage, StaffHistoryPage, StaffNotificationsPage, StaffProfilePage } from './pages';
