import { useState } from 'react';

import { Badge, Button, Card, Icon, Input, Spinner, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, toast } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { qk, queryClient, usePaginatedResource, useQueryResource } from '@/platform/query';
import { EntityDrawer, ExportButton, ManagementPage, ManagementTable, StatusPill, type Column } from '../components';
import { branchService, couponService, deliveryZoneService, notificationPrefService, paymentReportService, qrService, restaurantSettingsService, securityService, subscriptionService, tableService } from '../services';
import type { Branch, Coupon, DeliveryZone, NotificationPreferences, PaymentRow, QrCode, RestaurantProfile } from '../types';

const searchClass = 'min-w-56 flex-1';
const fieldClass = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary';

function TableCreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const branches = useQueryResource(qk('mgmt', 'branches'), () => branchService.list());
  const [branchId, setBranchId] = useState('');
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!branchId || !number.trim() || busy) return;
    setBusy(true);
    try {
      await tableService.create(branchId, { number: number.trim(), seatingCapacity: Number(capacity) || undefined });
      toast.success('Table created');
      void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'tables') });
      onClose();
    } catch (e) {
      toast.error('Could not create the table', { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <EntityDrawer open={open} onClose={onClose} title="Add table">
      <label className="block text-sm">Branch<select className={fieldClass + ' mt-1'} value={branchId} onChange={(e) => setBranchId(e.target.value)}><option value="">Choose a branch…</option>{(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="block text-sm">Table number / name<Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="12" className="mt-1" /></label>
      <label className="block text-sm">Seating capacity<Input type="number" min={1} max={100} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1" /></label>
      <Button className="w-full" onClick={() => void submit()} loading={busy} disabled={!branchId || !number.trim()}>Create table</Button>
    </EntityDrawer>
  );
}

export function TablesPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>();
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const tables = useQueryResource(qk('mgmt', 'tables', q, status), () => tableService.list({ q: q || undefined, status }));
  const rows = tables.data ?? [];
  const mutate = async (action: 'merge' | 'split') => {
    if (action === 'merge') await tableService.merge(selected);
    else await tableService.split(selected[0]);
    setSelected([]);
    void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'tables') });
  };
  return <ManagementPage title="Tables" description="Live floor occupancy, capacity, groups, and table operations." actions={<Button leftIcon="add" onClick={() => setCreating(true)}>Add table</Button>}><TableCreateDrawer open={creating} onClose={() => setCreating(false)} />
    <div className="flex flex-wrap gap-2"><Input className={searchClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tables..." /><select className={fieldClass + ' max-w-44'} value={status ?? ''} onChange={(e) => setStatus(e.target.value || undefined)}><option value="">All statuses</option><option>available</option><option>occupied</option><option>reserved</option><option>inactive</option></select></div>
    {tables.isLoading ? <Spinner /> : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{rows.map((t) => <button type="button" key={t.id} onClick={() => setSelected((ids) => ids.includes(t.id) ? ids.filter((id) => id !== t.id) : [...ids, t.id])} className={`rounded-xl border p-4 text-left transition ${selected.includes(t.id) ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary/50'}`}><div className="flex justify-between"><strong>{t.label}</strong><StatusPill tone={t.status === 'available' ? 'success' : t.status === 'occupied' ? 'warning' : 'neutral'}>{t.status}</StatusPill></div><p className="mt-6 text-sm text-foreground-muted">Capacity {t.capacity}</p><p className="text-xs text-foreground-subtle">{t.groupName ?? 'Ungrouped'}</p></button>)}</div>}
    {selected.length > 0 && <Card padding="sm" className="sticky bottom-4 flex flex-wrap items-center gap-2"><span className="mr-auto text-sm font-medium">{selected.length} selected</span><Button size="sm" variant="secondary" disabled={selected.length < 2} onClick={() => void mutate('merge')}>Merge</Button><Button size="sm" variant="secondary" disabled={selected.length !== 1} onClick={() => void mutate('split')}>Split</Button><Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button></Card>}
  </ManagementPage>;
}

function QrGenerateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tables = useQueryResource(qk('mgmt', 'tables', 'for-qr'), () => tableService.list());
  const [tableId, setTableId] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!tableId || busy) return;
    setBusy(true);
    try {
      await qrService.generate({ type: 'permanent', tableId });
      toast.success('QR code generated');
      void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'qr') });
      onClose();
    } catch (e) {
      toast.error('Could not generate the QR', { description: (e as Error).message });
      setBusy(false);
    }
  };
  return (
    <EntityDrawer open={open} onClose={onClose} title="Generate QR code">
      <label className="block text-sm">Table<select className={fieldClass + ' mt-1'} value={tableId} onChange={(e) => setTableId(e.target.value)}><option value="">Choose a table…</option>{(tables.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      <p className="text-xs text-foreground-muted">The printed QR points customers straight to this table's menu.</p>
      <Button className="w-full" onClick={() => void submit()} loading={busy} disabled={!tableId}>Generate QR</Button>
    </EntityDrawer>
  );
}

export function QrManagementPage() {
  const [preview, setPreview] = useState<QrCode>();
  const [generating, setGenerating] = useState(false);
  const list = useQueryResource(qk('mgmt', 'qr'), () => qrService.list());
  const act = async (row: QrCode, action: 'rotate' | 'regenerate' | 'toggle') => {
    if (action === 'rotate') await qrService.rotate(row.id); else if (action === 'regenerate') await qrService.regenerate(row.id); else await qrService.setActive(row.id, !row.active);
    void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'qr') });
  };
  const columns: Column<QrCode>[] = [
    { key: 'code', header: 'QR code', render: (r) => <div><strong>{r.code}</strong><p className="text-xs text-foreground-muted">{r.tableLabel ?? r.type}</p></div> },
    { key: 'status', header: 'Status', render: (r) => <StatusPill tone={r.active ? 'success' : 'neutral'}>{r.active ? 'enabled' : 'disabled'}</StatusPill> },
    { key: 'scans', header: 'Scans', align: 'right', render: (r) => r.scans ?? 0 },
    { key: 'actions', header: '', align: 'right', render: (r) => <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}><Button size="sm" variant="ghost" onClick={() => void act(r, 'rotate')}>Rotate</Button><Button size="sm" variant="ghost" onClick={() => void act(r, 'toggle')}>{r.active ? 'Disable' : 'Enable'}</Button></div> },
  ];
  return <ManagementPage title="QR management" description="Generate, rotate, print, and monitor restaurant QR codes." actions={<><ExportButton url={qrService.bulkDownloadUrl((list.data ?? []).map((r) => r.id))} filename="qr-codes.zip" label="Bulk download" /><Button leftIcon="add" onClick={() => setGenerating(true)}>Generate QR</Button></>}><ManagementTable rows={list.data ?? []} columns={columns} getId={(r) => r.id} loading={list.isLoading} onRowClick={setPreview} emptyTitle="No QR codes" /><EntityDrawer open={Boolean(preview)} onClose={() => setPreview(undefined)} title="QR preview"><div className="grid place-items-center rounded-2xl bg-white p-8"><Icon name="qrCode" className="h-48 w-48 text-black" /></div><div className="text-center"><h3 className="font-semibold">{preview?.tableLabel ?? preview?.code}</h3><p className="text-sm text-foreground-muted">Version {preview?.version ?? 1} · {preview?.scans ?? 0} scans</p></div>{preview && <Button className="w-full" variant="secondary" onClick={() => void act(preview, 'regenerate')}>Regenerate</Button>}</EntityDrawer><QrGenerateDrawer open={generating} onClose={() => setGenerating(false)} /></ManagementPage>;
}

function CouponCreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim() || !value || busy) return;
    setBusy(true);
    try {
      // percentage → basis points (10% → 1000); fixed → minor units (₹ → paise).
      const v = type === 'percentage' ? Math.round(Number(value) * 100) : Math.round(Number(value) * 100);
      await couponService.create({
        code: code.trim().toUpperCase(),
        type,
        value: v,
        ...(minSubtotal ? { minSubtotal: Math.round(Number(minSubtotal) * 100) } : {}),
        ...(usageLimit ? { usageLimit: Number(usageLimit) } : {}),
        status: 'active',
      } as Partial<Coupon>);
      toast.success('Coupon created');
      void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'coupons') });
      onClose();
    } catch (e) {
      toast.error('Could not create the coupon', { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <EntityDrawer open={open} onClose={onClose} title="Create coupon">
      <label className="block text-sm">Code<Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME20" className="mt-1" /></label>
      <label className="block text-sm">Type<select className={fieldClass + ' mt-1'} value={type} onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}><option value="percentage">Percentage off</option><option value="fixed">Flat amount off</option></select></label>
      <label className="block text-sm">{type === 'percentage' ? 'Percent (%)' : 'Amount (₹)'}<Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" /></label>
      <label className="block text-sm">Min order (₹) <span className="text-foreground-subtle">optional</span><Input type="number" min={0} value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} className="mt-1" /></label>
      <label className="block text-sm">Total uses <span className="text-foreground-subtle">optional</span><Input type="number" min={1} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} className="mt-1" /></label>
      <Button className="w-full" onClick={() => void submit()} loading={busy} disabled={!code.trim() || !value}>Create coupon</Button>
    </EntityDrawer>
  );
}

export function CouponsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>();
  const [creating, setCreating] = useState(false);
  const list = usePaginatedResource<Coupon>(qk('mgmt', 'coupons', q, status), (page, limit) => couponService.list({ q: q || undefined, status }, page, limit));
  const columns: Column<Coupon>[] = [{ key: 'code', header: 'Coupon', render: (c) => <div><strong>{c.code}</strong><p className="text-xs text-foreground-muted">{c.type}</p></div> }, { key: 'status', header: 'Status', render: (c) => <StatusPill tone={c.status === 'active' ? 'success' : c.status === 'scheduled' ? 'info' : 'neutral'}>{c.status}</StatusPill> }, { key: 'usage', header: 'Usage', align: 'right', render: (c) => `${c.usageCount ?? 0}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` }, { key: 'schedule', header: 'Schedule', render: (c) => <span className="text-sm text-foreground-muted">{c.startsAt ? new Date(c.startsAt).toLocaleDateString() : 'Immediate'}</span> }];
  return <ManagementPage title="Coupons" description="Schedule campaigns and review backend-calculated redemption performance." actions={<Button leftIcon="add" onClick={() => setCreating(true)}>Create coupon</Button>}><div className="flex gap-2"><Input className={searchClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coupon code..." /><select className={fieldClass + ' max-w-44'} value={status ?? ''} onChange={(e) => setStatus(e.target.value || undefined)}><option value="">All statuses</option><option>active</option><option>scheduled</option><option>draft</option><option>archived</option></select></div><ManagementTable rows={list.items} columns={columns} getId={(c) => c.id} loading={list.isLoading} emptyTitle="No coupons" /><CouponCreateDrawer open={creating} onClose={() => setCreating(false)} /></ManagementPage>;
}

export function PaymentsPage() {
  const [provider, setProvider] = useState<string>();
  const list = usePaginatedResource<PaymentRow>(qk('mgmt', 'payments', provider), (page, limit) => paymentReportService.list({ provider }, page, limit));
  const summary = useQueryResource(qk('mgmt', 'payments', 'summary', provider), () => paymentReportService.summary({ provider }));
  const s = summary.data;
  const columns: Column<PaymentRow>[] = [{ key: 'order', header: 'Order', render: (p) => p.orderNumber ?? p.id }, { key: 'provider', header: 'Provider', render: (p) => <Badge variant="soft">{p.provider}</Badge> }, { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatMoney(p.amount) }, { key: 'status', header: 'Status', render: (p) => <StatusPill tone={p.status === 'captured' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>{p.status}</StatusPill> }, { key: 'date', header: 'Date', align: 'right', render: (p) => new Date(p.createdAt).toLocaleDateString() }];
  return <ManagementPage title="Payments" description="Read-only payment, refund, failure, and settlement reporting." actions={<ExportButton url={paymentReportService.exportUrl({ provider })} filename="payments.csv" />}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Captured', s?.captured], ['Refunded', s?.refunded], ['Pending', s?.pending]].map(([label, value]) => <Card key={label as string} padding="md"><p className="text-sm text-foreground-muted">{label as string}</p><p className="mt-2 text-xl font-bold">{formatMoney(value as PaymentRow['amount'])}</p></Card>)}<Card padding="md"><p className="text-sm text-foreground-muted">Failures</p><p className="mt-2 text-xl font-bold">{s?.failedCount ?? 0}</p></Card></div><Tabs defaultValue="history"><div className="flex flex-wrap justify-between gap-2"><TabsList><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="refunds">Refunds</TabsTrigger><TabsTrigger value="settlements">Settlements</TabsTrigger></TabsList><select className={fieldClass + ' max-w-44'} value={provider ?? ''} onChange={(e) => setProvider(e.target.value || undefined)}><option value="">All providers</option><option value="razorpay">Razorpay</option><option value="phonepe">PhonePe</option><option value="cash">Cash</option></select></div><TabsContent value="history"><ManagementTable rows={list.items} columns={columns} getId={(p) => p.id} loading={list.isLoading} /></TabsContent><TabsContent value="refunds"><RemoteSummary text="Refund history is loaded from the Payment Engine." /></TabsContent><TabsContent value="settlements"><RemoteSummary text="Provider settlements are read-only and backend reconciled." /></TabsContent></Tabs></ManagementPage>;
}

export function SettingsPage() {
  return <ManagementPage title="Business settings" description="Restaurant, branch, delivery, communication, subscription, and security controls."><Tabs defaultValue="profile"><TabsList className="flex-wrap"><TabsTrigger value="profile">Restaurant</TabsTrigger><TabsTrigger value="branches">Branches</TabsTrigger><TabsTrigger value="zones">Delivery zones</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger><TabsTrigger value="subscription">Subscription</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger></TabsList><TabsContent value="profile"><ProfileSettings /></TabsContent><TabsContent value="branches"><Branches /></TabsContent><TabsContent value="zones"><DeliveryZones /></TabsContent><TabsContent value="notifications"><NotificationSettings /></TabsContent><TabsContent value="subscription"><SubscriptionPanel /></TabsContent><TabsContent value="security"><SecurityPanel /></TabsContent></Tabs></ManagementPage>;
}

function ProfileSettings() {
  const profile = useQueryResource(qk('mgmt', 'settings', 'profile'), () => restaurantSettingsService.profile());
  const [draft, setDraft] = useState<Partial<RestaurantProfile>>({});
  if (profile.isLoading) return <Spinner />;
  const value = { ...profile.data, ...draft } as RestaurantProfile;
  return <Card padding="lg" className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Restaurant name<Input value={value.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label className="text-sm">GST number<Input value={value.gstNumber ?? ''} onChange={(e) => setDraft({ ...draft, gstNumber: e.target.value })} /></label><label className="text-sm">Timezone<Input value={value.timezone ?? ''} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} /></label><label className="text-sm">Currency<Input value={value.currency ?? ''} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} /></label></div><label className="text-sm">Business description<Textarea value={value.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label><Button onClick={async () => { await restaurantSettingsService.updateProfile(draft); toast.success('Restaurant settings saved'); }}>Save changes</Button></Card>;
}

function Branches() { const query = useQueryResource<Branch[]>(qk('mgmt', 'branches'), () => branchService.list()); return query.isLoading ? <Spinner /> : <div className="grid gap-3 md:grid-cols-2">{(query.data ?? []).map((b) => <Card key={b.id} padding="md"><div className="flex justify-between"><div><h3 className="font-semibold">{b.name}</h3><p className="text-sm text-foreground-muted">{b.address}</p></div><StatusPill tone={b.active ? 'success' : 'neutral'}>{b.orderingStatus ?? (b.active ? 'active' : 'inactive')}</StatusPill></div><div className="mt-4 flex gap-2"><Button size="sm" variant="secondary">Edit branch</Button><Button size="sm" variant="ghost">Hours</Button></div></Card>)}</div>; }

function DeliveryZones() {
  const branches = useQueryResource(qk('mgmt', 'branches', 'zone-picker'), () => branchService.list());
  const [branchId, setBranchId] = useState('');
  const zones = useQueryResource<DeliveryZone[]>(qk('mgmt', 'zones', branchId), () => deliveryZoneService.list(branchId), { enabled: Boolean(branchId) });
  return <div className="space-y-4"><div className="flex flex-wrap gap-2"><select className={fieldClass + ' max-w-xs'} value={branchId} onChange={(e) => setBranchId(e.target.value)}><option value="">Select branch...</option>{(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><Button disabled={!branchId} leftIcon="add">Add zone</Button></div>{branchId && <div className="grid gap-4 lg:grid-cols-[1fr_22rem]"><div className="grid min-h-80 place-items-center rounded-xl border border-border bg-[radial-gradient(circle_at_center,var(--color-primary-soft),transparent_65%)]"><div className="text-center"><Icon name="map" className="mx-auto h-8 w-8 text-primary" /><p className="mt-2 font-medium">Map editor</p><p className="text-sm text-foreground-muted">Draw polygon or radius; GeoJSON is saved unchanged.</p></div></div><div className="space-y-2">{(zones.data ?? []).map((z) => <Card key={z.id} padding="sm"><div className="flex justify-between"><strong>{z.name}</strong><Switch checked={z.active} aria-label={`Enable ${z.name}`} /></div><p className="mt-1 text-xs text-foreground-muted">{z.mode} · priority {z.priority ?? 0}</p><details className="mt-2 text-xs"><summary>GeoJSON preview</summary><pre className="mt-2 max-h-28 overflow-auto rounded bg-muted p-2">{JSON.stringify(z.geojson ?? { center: z.center, radiusMeters: z.radiusMeters }, null, 2)}</pre></details></Card>)}</div></div>}</div>;
}

function NotificationSettings() { const query = useQueryResource(qk('mgmt', 'notification-preferences'), () => notificationPrefService.get()); const [draft, setDraft] = useState<NotificationPreferences>(); const value = draft ?? query.data; if (!value) return <Spinner />; const toggleChannel = (key: keyof NotificationPreferences['channels']) => setDraft({ ...value, channels: { ...value.channels, [key]: !value.channels[key] } }); return <Card padding="lg" className="space-y-4">{(['email', 'sms', 'whatsapp', 'push'] as const).map((key) => <label key={key} className="flex items-center justify-between border-b border-border py-3"><span className="capitalize">{key}</span><Switch checked={Boolean(value.channels[key])} onCheckedChange={() => toggleChannel(key)} /></label>)}<Button onClick={async () => { await notificationPrefService.update(value); toast.success('Notification preferences saved'); }}>Save preferences</Button></Card>; }

function SubscriptionPanel() { const q = useQueryResource(qk('mgmt', 'subscription'), () => subscriptionService.current()); return q.isLoading ? <Spinner /> : <div className="grid gap-4 lg:grid-cols-2"><Card padding="lg"><Badge tone="primary" variant="soft">{q.data?.status}</Badge><h3 className="mt-3 text-2xl font-bold">{q.data?.plan}</h3><p className="text-sm text-foreground-muted">Renews {q.data?.renewsAt ? new Date(q.data.renewsAt).toLocaleDateString() : '—'}</p><Button className="mt-5">Upgrade plan</Button></Card><Card padding="lg"><h3 className="font-semibold">Plan usage</h3><div className="mt-3 space-y-3">{q.data?.limits?.map((l) => <div key={l.name}><div className="flex justify-between text-sm"><span>{l.name}</span><span>{l.used} / {l.max ?? 'Unlimited'}</span></div><div className="mt-1 h-2 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: l.max ? `${Math.min(100, l.used / l.max * 100)}%` : '5%' }} /></div></div>)}</div></Card></div>; }

function SecurityPanel() { const q = useQueryResource(qk('mgmt', 'security'), () => securityService.overview()); return q.isLoading ? <Spinner /> : <div className="grid gap-4 lg:grid-cols-3"><RemoteSummary text={`${q.data?.sessions.length ?? 0} active sessions`} /><RemoteSummary text={`${q.data?.devices.length ?? 0} trusted devices`} /><RemoteSummary text={`${q.data?.loginHistory.length ?? 0} login events`} /><Card padding="lg" className="lg:col-span-3"><h3 className="font-semibold">Password & API access</h3><p className="mt-1 text-sm text-foreground-muted">Change your password, revoke sessions, and review access. API keys are reserved for a future release.</p><div className="mt-4 flex gap-2"><Button variant="secondary">Change password</Button><Button variant="secondary">Manage sessions</Button><Button disabled>API keys (coming soon)</Button></div></Card></div>; }

function RemoteSummary({ text }: { text: string }) { return <Card padding="lg"><p className="text-sm text-foreground-muted">{text}</p></Card>; }
