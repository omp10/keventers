# Enterprise Platform Admin (F6)

The admin app is isolated under `/admin`, guarded by `super_admin`, and reuses the shared shell, Theme Engine, API/query platforms, permissions, search, commands, and notifications.

All actions flow through `AdminPages -> adminService -> API Platform`. Approval provisioning, RBAC resolution, payment totals, analytics projections, feature rollout, and health decisions remain backend-owned.
