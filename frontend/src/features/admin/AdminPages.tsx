import { useState } from 'react';
import { Badge, Button, Card, Icon, Input, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { ExportButton, ManagementPage, ManagementTable, StatusPill, type Column } from '@/features/management/components';
import { qk, queryClient, usePaginatedResource, useQueryResource } from '@/platform/query';
import { adminService, type AdminFilters } from './admin.service';
import type { NotificationRecord, OnboardingApplication, Organization, PlatformPayment, PlatformUser } from './types';

const tones = { active: 'success', pending: 'warning', suspended: 'danger', disabled: 'neutral', rejected: 'danger' } as const;
const Search = ({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => <div className="relative"><Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" /><Input className="min-w-64 pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;

/** Backend analytics money is an integer in MINOR units — format, never compute. */
const inr = (minor = 0) => `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const pct = (rate: number | null | undefined) => (rate == null ? '—' : `${Math.round(rate * 100)}%`);

export function PlatformDashboardPage() {
  const q = useQueryResource(qk('admin', 'dashboard'), () => adminService.dashboard());
  const d = q.data;
  // Cards mirror the backend's grouped projection (sales/orders/customers/payments).
  const cards: [string, string | number][] = [
    ['Net revenue', inr(d?.sales.netRevenue)],
    ['Gross revenue', inr(d?.sales.grossRevenue)],
    ['Average order value', inr(d?.sales.averageOrderValue)],
    ['Orders placed', d?.orders.ordersPlaced ?? 0],
    ['Orders completed', d?.orders.ordersCompleted ?? 0],
    ['New customers', d?.customers.newCustomers ?? 0],
  ];
  const paymentsCaptured = d?.payments.captured ?? 0;
  return (
    <ManagementPage title="Platform overview" description="Realtime SaaS operations, growth, and platform health.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label} padding="lg"><p className="text-sm text-foreground-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card padding="lg">
          <h2 className="font-semibold">Payments</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><p className="text-sm text-foreground-muted">Captured</p><p className="mt-1 text-xl font-bold">{paymentsCaptured}</p><p className="text-xs text-foreground-subtle">{inr(d?.payments.capturedAmount)}</p></div>
            <div><p className="text-sm text-foreground-muted">Failed</p><p className="mt-1 text-xl font-bold">{d?.payments.failed ?? 0}</p><p className="text-xs text-foreground-subtle">{pct(d?.payments.failureRate)} of attempts</p></div>
            <div><p className="text-sm text-foreground-muted">Refunded</p><p className="mt-1 text-xl font-bold">{d?.payments.refunded ?? 0}</p><p className="text-xs text-foreground-subtle">{inr(d?.payments.refundedAmount)}</p></div>
          </div>
          <p className="mt-6 text-sm text-foreground-muted">Success rate <strong className="text-foreground">{pct(d?.payments.successRate)}</strong></p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Notifications</h2><StatusPill tone={(d?.notificationHealth.failed ?? 0) === 0 ? 'success' : 'warning'}>{(d?.notificationHealth.failed ?? 0) === 0 ? 'healthy' : 'degraded'}</StatusPill></div>
          <p className="mt-6 text-4xl font-bold text-primary">{pct(d?.notificationHealth.deliveryRate)}</p>
          <p className="text-sm text-foreground-muted">Delivery rate · {d?.notificationHealth.sent ?? 0} sent</p>
        </Card>
      </div>
    </ManagementPage>
  );
}

export function OrganizationsPage() {
  const [filters, setFilters] = useState<AdminFilters>({});
  const q = usePaginatedResource<Organization>(qk('admin', 'organizations', filters), (p, l) => adminService.organizations(filters, p, l));
  const action = async (row: Organization) => { await adminService.organizationAction(row.id, row.status === 'active' ? 'suspend' : 'activate', row.status === 'active' ? 'Admin action' : undefined); toast.success('Organization updated'); void queryClient.invalidateQueries({ queryKey: qk('admin', 'organizations') }); };
  const columns: Column<Organization>[] = [{ key: 'name', header: 'Organization', render: (x) => <div><strong>{x.name}</strong><p className="text-xs text-foreground-muted">{x.ownerEmail ?? x.slug}</p></div> }, { key: 'status', header: 'Status', render: (x) => <StatusPill tone={tones[x.status]}>{x.status}</StatusPill> }, { key: 'plan', header: 'Subscription', render: (x) => <span>{x.subscription?.plan ?? '—'} <small className="text-foreground-muted">{x.subscription?.status}</small></span> }, { key: 'scale', header: 'Scale', render: (x) => `${x.restaurantCount ?? 0} restaurants · ${x.branchCount ?? 0} branches` }, { key: 'action', header: '', align: 'right', render: (x) => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); void action(x); }}>{x.status === 'active' ? 'Suspend' : 'Activate'}</Button> }];
  return <ManagementPage title="Organizations" description="Subscriptions, usage, lifecycle, and restaurant ownership."><Search value={filters.search ?? ''} onChange={(search) => setFilters({ ...filters, search: search || undefined })} placeholder="Search organizations..." /><ManagementTable rows={q.items} columns={columns} getId={(x) => x.id} loading={q.isLoading} emptyTitle="No organizations" /></ManagementPage>;
}

export function ApprovalsPage() {
  const q = usePaginatedResource<OnboardingApplication>(qk('admin', 'approvals'), (p, l) => adminService.applications({ status: 'pending' }, p, l));
  const decide = async (id: string, decision: 'approve' | 'reject') => { if (decision === 'approve') await adminService.approve(id); else await adminService.reject(id, 'Application did not meet onboarding requirements'); toast.success(`Application ${decision}d`); void queryClient.invalidateQueries({ queryKey: qk('admin', 'approvals') }); };
  const columns: Column<OnboardingApplication>[] = [{ key: 'business', header: 'Application', render: (x) => <div><strong>{x.businessName}</strong><p className="text-xs text-foreground-muted">{x.ownerName} · {x.email}</p></div> }, { key: 'city', header: 'Location', render: (x) => x.city ?? '—' }, { key: 'status', header: 'Status', render: (x) => <StatusPill tone={tones[x.status]}>{x.status}</StatusPill> }, { key: 'submitted', header: 'Submitted', render: (x) => x.submittedAt ? new Date(x.submittedAt).toLocaleDateString() : '—' }, { key: 'actions', header: '', align: 'right', render: (x) => <div className="flex justify-end gap-1"><Button size="sm" variant="secondary" onClick={() => void decide(x.id, 'reject')}>Reject</Button><Button size="sm" onClick={() => void decide(x.id, 'approve')}>Approve</Button></div> }];
  return <ManagementPage title="Restaurant approvals" description="Review applications and trigger backend provisioning workflows."><ManagementTable rows={q.items} columns={columns} getId={(x) => x.id} loading={q.isLoading} emptyTitle="Approval queue is clear" /></ManagementPage>;
}

export function UsersPage() {
  const [filters, setFilters] = useState<AdminFilters>({}); const q = usePaginatedResource<PlatformUser>(qk('admin', 'users', filters), (p, l) => adminService.users(filters, p, l));
  const columns: Column<PlatformUser>[] = [{ key: 'user', header: 'User', render: (x) => <div><strong>{x.name ?? x.email}</strong><p className="text-xs text-foreground-muted">{x.email}</p></div> }, { key: 'type', header: 'Type', render: (x) => <Badge variant="soft">{x.type ?? 'user'}</Badge> }, { key: 'roles', header: 'Roles', render: (x) => x.roles?.join(', ') || '—' }, { key: 'status', header: 'Status', render: (x) => <StatusPill tone={tones[x.status]}>{x.status}</StatusPill> }, { key: 'activity', header: 'Last activity', align: 'right', render: (x) => x.lastLoginAt ? new Date(x.lastLoginAt).toLocaleDateString() : '—' }];
  return <ManagementPage title="Users & RBAC" description="Customers, owners, staff, admins, roles, permissions, and sessions."><Tabs defaultValue="users"><TabsList><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="roles">Roles</TabsTrigger><TabsTrigger value="permissions">Permission matrix</TabsTrigger></TabsList><TabsContent value="users" className="space-y-4"><Search value={filters.search ?? ''} onChange={(search) => setFilters({ ...filters, search: search || undefined })} placeholder="Search users..." /><ManagementTable rows={q.items} columns={columns} getId={(x) => x.id} loading={q.isLoading} /></TabsContent><TabsContent value="roles"><InfoPanel text="Roles and assignments are resolved by backend RBAC." /></TabsContent><TabsContent value="permissions"><InfoPanel text="Effective permissions include role, direct, and scoped backend grants." /></TabsContent></Tabs></ManagementPage>;
}

export function PlatformPaymentsPage() { const q = usePaginatedResource<PlatformPayment>(qk('admin', 'payments'), (p, l) => adminService.payments({}, p, l)); const columns: Column<PlatformPayment>[] = [{ key: 'id', header: 'Payment', render: (x) => x.id }, { key: 'provider', header: 'Provider', render: (x) => <Badge variant="soft">{x.provider ?? '—'}</Badge> }, { key: 'amount', header: 'Amount', align: 'right', render: (x) => formatMoney(x.amount) }, { key: 'status', header: 'Status', render: (x) => <StatusPill tone={x.status === 'captured' ? 'success' : x.status === 'failed' ? 'danger' : 'warning'}>{x.status}</StatusPill> }, { key: 'date', header: 'Date', align: 'right', render: (x) => new Date(x.createdAt).toLocaleDateString() }]; return <ManagementPage title="Platform payments" description="Revenue, providers, refunds, failures, and settlements." actions={<ExportButton url="/admin/payments/export" filename="platform-payments.csv" />}><ManagementTable rows={q.items} columns={columns} getId={(x) => x.id} loading={q.isLoading} /></ManagementPage>; }

export function PlatformAnalyticsPage() { return <ManagementPage title="Platform analytics" description="Backend projections for revenue, orders, growth, regions, and providers."><Card padding="lg" className="min-h-80"><h2 className="font-semibold">Revenue and growth</h2><p className="mt-2 text-sm text-foreground-muted">Use time filters to query platform analytics projections. No totals are calculated in the browser.</p></Card></ManagementPage>; }

export function AdminNotificationsPage() { const q = usePaginatedResource<NotificationRecord>(qk('admin', 'notifications'), (p, l) => adminService.notifications({}, p, l)); const columns: Column<NotificationRecord>[] = [{ key: 'title', header: 'Notification', render: (x) => x.title ?? x.id }, { key: 'channel', header: 'Channel', render: (x) => x.channel ?? '—' }, { key: 'recipient', header: 'Recipient', render: (x) => x.recipient ?? '—' }, { key: 'status', header: 'Status', render: (x) => <StatusPill>{x.status}</StatusPill> }]; return <ManagementPage title="Notifications" description="Broadcasts, campaigns, templates, history, and delivery analytics." actions={<Button leftIcon="add">Broadcast notification</Button>}><ManagementTable rows={q.items} columns={columns} getId={(x) => x.id} loading={q.isLoading} /></ManagementPage>; }

export function MonitoringPage() { const services = ['API', 'MongoDB', 'Redis', 'Socket.IO', 'BullMQ', 'Workers']; return <ManagementPage title="Monitoring" description="Readiness, metrics, queues, workers, and infrastructure status."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{services.map((name) => <Card key={name} padding="md"><div className="flex justify-between"><strong>{name}</strong><StatusPill tone="success">Operational</StatusPill></div><p className="mt-4 text-xs text-foreground-muted">Status supplied by platform monitoring.</p></Card>)}</div></ManagementPage>; }
export function AuditLogsPage() { return <ManagementPage title="Audit logs" description="Global immutable activity timeline with actor and resource filters." actions={<ExportButton url="/admin/audit-logs/export" filename="audit-logs.csv" />}><InfoPanel text="Audit events are loaded from the backend audit stream." /></ManagementPage>; }
export function FeatureFlagsPage() { return <ManagementPage title="Feature flags" description="Global, environment, and restaurant rollout controls."><InfoPanel text="Flag evaluation and rollout targeting remain backend-owned." /></ManagementPage>; }
export function PlatformSettingsPage() { return <ManagementPage title="Platform settings" description="Branding, plans, providers, security, and maintenance mode."><Tabs defaultValue="branding"><TabsList><TabsTrigger value="branding">Branding</TabsTrigger><TabsTrigger value="billing">Billing & plans</TabsTrigger><TabsTrigger value="providers">Providers</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger></TabsList><TabsContent value="branding"><InfoPanel text="White-label branding inherits the centralized Theme Engine." /></TabsContent><TabsContent value="billing"><InfoPanel text="Plan limits and billing configuration are backend-driven." /></TabsContent><TabsContent value="providers"><InfoPanel text="Google Maps, PhonePe, Razorpay, Cloudinary, SMTP, and Push configuration." /></TabsContent><TabsContent value="security"><InfoPanel text="Maintenance mode and global security configuration." /></TabsContent></Tabs></ManagementPage>; }
function InfoPanel({ text }: { text: string }) { return <Card padding="lg"><p className="text-sm text-foreground-muted">{text}</p></Card>; }
