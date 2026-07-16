import { useState } from 'react';

import { Avatar, Badge, Button, Spinner, Switch, Textarea, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { EntityDrawer } from '../components';
import { customerService } from '../services';
import type { CustomerDetail } from '../types';

/** Customer profile drawer — orders, loyalty, favorites, marketing prefs, notes. */
export function CustomerDetailDrawer({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const q = useQueryResource<CustomerDetail>(qk('mgmt', 'customer', customerId), () => customerService.get(customerId), { enabled: Boolean(customerId) });
  const [note, setNote] = useState('');
  const c = q.data;

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'customer', customerId) });
  const marketing = useMutationResource<unknown, { key: 'email' | 'sms' | 'whatsapp'; value: boolean }>(
    ({ key, value }) => customerService.updateMarketing(customerId, { ...c?.marketing, [key]: value }),
    { onSuccess: () => { invalidate(); }, onError: (e) => toast.error('Failed', { description: (e as Error).message }) },
  );
  const addNote = useMutationResource<unknown, string>((n) => customerService.addNote(customerId, n), { onSuccess: () => { setNote(''); toast.success('Note added'); invalidate(); } });

  return (
    <EntityDrawer open onClose={onClose} size="xl" title={c?.name ?? 'Customer'}>
      {q.isLoading || !c ? (
        <div className="grid h-40 place-items-center"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar alt={c.name ?? 'Guest'} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-foreground">{c.name ?? 'Guest'}</p>
              <p className="truncate text-sm text-foreground-muted">{c.phone ?? c.email ?? '—'}</p>
            </div>
            {c.tier && <Badge tone="accent" variant="soft">{c.tier}</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Orders" value={String(c.ordersCount ?? 0)} />
            <Stat label="Spent" value={formatMoney(c.totalSpent)} />
            <Stat label="Points" value={String(c.loyalty?.balance ?? c.points ?? 0)} />
          </div>

          <Tabs defaultValue="orders">
            <TabsList>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="prefs">Preferences</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              {(c.orders ?? []).length === 0 ? <Empty>No orders yet.</Empty> : (c.orders ?? []).map((o) => (
                <div key={o.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <span className="font-medium text-foreground">#{o.orderNumber}</span>
                  <span className="text-foreground-muted">{o.status} · {new Date(o.at).toLocaleDateString()}</span>
                  <span className="font-medium text-foreground">{formatMoney(o.total)}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="loyalty">
              <p className="mb-2 text-sm text-foreground-muted">Tier <span className="font-medium text-foreground">{c.loyalty?.tier ?? '—'}</span> · Lifetime {c.loyalty?.lifetimePoints ?? 0} pts</p>
              {(c.ledger ?? []).map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <span className="text-foreground">{l.description ?? l.type}</span>
                  <span className={l.points >= 0 ? 'text-success' : 'text-danger'}>{l.points >= 0 ? '+' : ''}{l.points}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="favorites">
              <p className="mb-1 text-xs font-semibold text-foreground-subtle">Products</p>
              <div className="mb-3 flex flex-wrap gap-1.5">{(c.favoriteProducts ?? []).map((p) => <Badge key={p.id} tone="neutral" variant="soft">{p.name}</Badge>)}</div>
              <p className="mb-1 text-xs font-semibold text-foreground-subtle">Restaurants</p>
              <div className="flex flex-wrap gap-1.5">{(c.favoriteBranches ?? []).map((b) => <Badge key={b.id} tone="neutral" variant="soft">{b.name}</Badge>)}</div>
            </TabsContent>

            <TabsContent value="prefs">
              <div className="divide-y divide-border rounded-xl border border-border">
                {(['email', 'sms', 'whatsapp'] as const).map((k) => (
                  <label key={k} className="flex items-center justify-between p-3 capitalize">
                    <span className="text-sm text-foreground">{k}</span>
                    <Switch checked={c.marketing?.[k] ?? false} onCheckedChange={(v) => marketing.mutate({ key: k, value: Boolean(v) })} />
                  </label>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-2">
                {(c.notes ?? []).map((n) => (
                  <div key={n.id} className="rounded-lg bg-muted p-2.5 text-sm">
                    <p className="text-foreground">{n.note}</p>
                    <p className="text-xs text-foreground-subtle">{n.author ?? 'Staff'} · {new Date(n.at).toLocaleString()}</p>
                  </div>
                ))}
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" rows={2} />
                <Button size="sm" leftIcon="add" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate(note.trim())}>Add note</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </EntityDrawer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border p-2.5"><p className="text-lg font-bold text-foreground">{value}</p><p className="text-xs text-foreground-muted">{label}</p></div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-foreground-subtle">{children}</p>;
}
