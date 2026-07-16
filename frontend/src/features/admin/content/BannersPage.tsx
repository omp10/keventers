import { useState } from 'react';

import { Badge, Button, Card, Field, Icon, Input, Switch, Textarea, toast } from '@/design-system';
import { EntityDrawer, ImageUploadField, ManagementPage, ManagementTable, StatusPill, type Column } from '@/features/management/components';
import { qk, queryClient, usePaginatedResource } from '@/platform/query';
import { gradients } from '@/theme';
import { cn } from '@/lib/cn';
import { adminService } from '../admin.service';
import type { AdminBanner, BannerPayload, BannerTheme } from '../types';

const KEY = qk('admin', 'banners');
const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

const THEMES: { value: BannerTheme; label: string; hint: string }[] = [
  { value: 'brand', label: 'Brand', hint: 'Primary gradient' },
  { value: 'accent', label: 'Accent', hint: 'Accent surface' },
  { value: 'image', label: 'Image', hint: 'Photo + copy' },
];

/** A blank banner — the create-form's starting state. */
const emptyBanner = (): Partial<AdminBanner> => ({
  title: '',
  subtitle: '',
  theme: 'brand',
  cta: { label: '', href: '' },
  sortOrder: 0,
  status: 'active',
});

/** Local YYYY-MM-DD for <input type="date"> round-tripping. */
const toDateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

/**
 * BannerPreview — renders the slide exactly as the customer carousel will, from
 * the same theme tokens. Admins see the real result before publishing; no
 * hardcoded colors, so it follows the active brand.
 */
function BannerPreview({ banner }: { banner: Partial<AdminBanner> }) {
  const accent = banner.theme === 'accent';
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Customer preview</p>
      <div
        className={cn(
          'relative flex h-32 items-center gap-4 overflow-hidden rounded-2xl p-5 shadow-md',
          accent ? 'bg-accent text-accent-foreground' : 'text-primary-foreground',
        )}
        style={accent ? undefined : { backgroundImage: gradients.brand }}
      >
        <span
          aria-hidden
          className={cn('absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl', accent ? 'bg-accent-foreground/10' : 'bg-primary-foreground/10')}
        />
        <div className="relative min-w-0 flex-1">
          <p className="truncate font-display text-xl font-extrabold leading-tight">{banner.title || 'Banner title'}</p>
          {banner.subtitle && <p className="mt-1 truncate text-sm opacity-85">{banner.subtitle}</p>}
          {banner.cta?.label && (
            <span className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide', accent ? 'bg-accent-foreground/15' : 'bg-primary-foreground/15')}>
              {banner.cta.label}
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {banner.theme === 'image' && banner.imageUrl && (
          <img src={banner.imageUrl} alt="" className="relative h-full max-h-24 w-36 shrink-0 rounded-xl object-cover shadow-lg" />
        )}
      </div>
    </div>
  );
}

/**
 * BannersPage — ADMIN curation of the customer homepage carousel. Create,
 * theme, schedule, order, publish/unpublish and delete promotional slides; the
 * customer app reads the live set from /public/banners.
 */
export function BannersPage() {
  const q = usePaginatedResource<AdminBanner>(KEY, (p, l) => adminService.banners({}, p, l));
  const [draft, setDraft] = useState<Partial<AdminBanner> | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<AdminBanner>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (!draft?.title?.trim()) return toast.error('A title is required.');
    setSaving(true);
    try {
      const body: BannerPayload = {
        ...draft,
        // Strip an empty CTA so the slide renders without a pill.
        cta: draft.cta?.label ? draft.cta : undefined,
        // null clears a previously-stored image.
        imageUrl: draft.imageUrl || null,
      };
      if (draft.id) await adminService.updateBanner(draft.id, body);
      else await adminService.createBanner(body);
      toast.success(draft.id ? 'Banner updated' : 'Banner published');
      setDraft(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the banner');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (b: AdminBanner) => {
    await adminService.updateBanner(b.id, { status: b.status === 'active' ? 'inactive' : 'active' });
    toast.success(b.status === 'active' ? 'Banner unpublished' : 'Banner published');
    void invalidate();
  };

  const remove = async (b: AdminBanner) => {
    await adminService.deleteBanner(b.id);
    toast.success('Banner deleted');
    void invalidate();
  };

  const columns: Column<AdminBanner>[] = [
    {
      key: 'banner',
      header: 'Banner',
      render: (b) => (
        <div className="flex min-w-0 items-center gap-3">
          {b.imageUrl ? (
            <img src={b.imageUrl} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid h-10 w-16 shrink-0 place-items-center rounded-md" style={{ backgroundImage: gradients.brand }}>
              <Icon name="image" className="h-4 w-4 text-primary-foreground" />
            </span>
          )}
          <div className="min-w-0">
            <strong className="block truncate">{b.title}</strong>
            <p className="truncate text-xs text-foreground-muted">{b.subtitle || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'theme', header: 'Theme', render: (b) => <Badge tone="neutral" variant="soft">{b.theme}</Badge> },
    { key: 'cta', header: 'Links to', render: (b) => <span className="text-xs text-foreground-muted">{b.cta?.href || (b.branchSlug ? `/r/${b.branchSlug}` : '—')}</span> },
    { key: 'order', header: 'Order', render: (b) => b.sortOrder },
    { key: 'status', header: 'Status', render: (b) => <StatusPill tone={b.status === 'active' ? 'success' : 'neutral'}>{b.status}</StatusPill> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); void toggleStatus(b); }}>
            {b.status === 'active' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button size="sm" variant="ghost" leftIcon="delete" onClick={(e) => { e.stopPropagation(); void remove(b); }} aria-label={`Delete ${b.title}`} />
        </div>
      ),
    },
  ];

  return (
    <ManagementPage
      title="Homepage banners"
      description="Curate the promotional carousel customers see on the home screen."
      actions={<Button leftIcon="add" onClick={() => setDraft(emptyBanner())}>New banner</Button>}
    >
      <ManagementTable
        rows={q.items}
        columns={columns}
        getId={(b) => b.id}
        loading={q.isLoading}
        onRowClick={(b) => setDraft({ ...b, cta: b.cta ?? { label: '', href: '' } })}
        emptyTitle="No banners yet"
        emptyDescription="Publish your first promotional slide — it appears on the customer home immediately."
        emptyIcon="image"
      />

      <EntityDrawer
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit banner' : 'New banner'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button loading={saving} onClick={() => void save()}>{draft?.id ? 'Save changes' : 'Publish banner'}</Button>
          </div>
        }
      >
        {draft && (
          <>
            <BannerPreview banner={draft} />

            <Field label="Title" required>
              <Input value={draft.title ?? ''} onChange={(e) => patch({ title: e.target.value })} placeholder="Flat 20% off your first order" />
            </Field>
            <Field label="Subtitle" description="One supporting line. Keep it short.">
              <Textarea rows={2} value={draft.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} placeholder="Use code WELCOME20 at checkout" />
            </Field>

            <Field label="Theme" description="Surfaces resolve from the active brand's tokens.">
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => patch({ theme: t.value })}
                    className={cn(
                      'rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      draft.theme === t.value ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
                    )}
                  >
                    <span className="block font-medium">{t.label}</span>
                    <span className="block text-xs text-foreground-muted">{t.hint}</span>
                  </button>
                ))}
              </div>
            </Field>

            {draft.theme === 'image' && (
              <ImageUploadField
                label="Banner image"
                value={draft.imageUrl}
                onChange={(url) => patch({ imageUrl: url })}
                upload={(file, onProgress) => adminService.uploadImage(file, 'banners', onProgress)}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button label" description="Leave blank to hide the button.">
                <Input value={draft.cta?.label ?? ''} onChange={(e) => patch({ cta: { label: e.target.value, href: draft.cta?.href ?? '' } })} placeholder="Order now" />
              </Field>
              <Field label="Links to" description="An in-app path, e.g. /discover">
                <Input value={draft.cta?.href ?? ''} onChange={(e) => patch({ cta: { label: draft.cta?.label ?? '', href: e.target.value } })} placeholder="/discover" />
              </Field>
            </div>

            <Field label="Kitchen deep link" description="Optional branch slug — used when no button link is set.">
              <Input value={draft.branchSlug ?? ''} onChange={(e) => patch({ branchSlug: e.target.value })} placeholder="keventers-connaught-place" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts on" description="Optional. Blank = live now.">
                <Input type="date" value={toDateInput(draft.startsAt)} onChange={(e) => patch({ startsAt: e.target.value || null })} />
              </Field>
              <Field label="Ends on" description="Optional. Blank = no end date.">
                <Input type="date" value={toDateInput(draft.endsAt)} onChange={(e) => patch({ endsAt: e.target.value || null })} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display order" description="Lower numbers show first.">
                <Input type="number" value={String(draft.sortOrder ?? 0)} onChange={(e) => patch({ sortOrder: Number(e.target.value) })} />
              </Field>
              <Field label="Published" orientation="horizontal" description="Live on the customer home.">
                <Switch checked={draft.status === 'active'} onCheckedChange={(on) => patch({ status: on ? 'active' : 'inactive' })} />
              </Field>
            </div>

            <Card padding="md" className="bg-surface-raised">
              <p className="text-xs text-foreground-muted">
                Banners appear in the customer home carousel in display order. Unpublished or out-of-window banners are
                hidden automatically — no code changes needed.
              </p>
            </Card>
          </>
        )}
      </EntityDrawer>
    </ManagementPage>
  );
}
