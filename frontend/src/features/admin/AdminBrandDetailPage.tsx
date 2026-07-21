import { Suspense, lazy, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, Card, ErrorState, Icon, Input, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@/design-system';
import { RestaurantScopeProvider } from '@/features/restaurant';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { adminService } from './admin.service';
import { AdminCatalogPage } from './AdminCatalogPage';

// The brand-scoped screens already exist — reuse them rather than reimplement.
const CouponsPage = lazy(() => import('@/features/management/pages/OperationsPages').then((m) => ({ default: m.CouponsPage })));
const LoyaltyRulePage = lazy(() => import('@/features/restaurant/pages/LoyaltyRulePage').then((m) => ({ default: m.LoyaltyRulePage })));

const field = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary';

/** Branding: identity + the assets the customer storefront renders. */
function BrandingTab({ brandId }: { brandId: string }) {
  const q = useQueryResource(qk('admin', 'brand', brandId), () => adminService.brand(brandId));
  const b = q.data;
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);

  if (q.isLoading) return <div className="grid min-h-40 place-items-center"><Spinner /></div>;
  if (!b) return null;

  const save = async (patch: Parameters<typeof adminService.updateBrand>[1]) => {
    setBusy(true);
    try {
      await adminService.updateBrand(brandId, patch);
      await queryClient.invalidateQueries({ queryKey: qk('admin', 'brand', brandId) });
      void queryClient.invalidateQueries({ queryKey: qk('admin', 'brands') });
      toast.success('Brand updated');
    } catch (e) {
      toast.error('Could not update the brand', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File, which: 'logo' | 'cover') => {
    setUploading(which);
    try {
      const media = await adminService.uploadImage(file, 'brands');
      await save({ branding: which === 'logo' ? { logoUrl: media.url } : { coverImageUrl: media.url } });
    } catch (e) {
      toast.error('Upload failed', { description: (e as Error).message });
    } finally {
      setUploading(null);
    }
  };

  const ImageSlot = ({ which, url, label, hint }: { which: 'logo' | 'cover'; url?: string | null; label: string; hint: string }) => (
    <Card padding="md" className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-foreground-muted">{hint}</p>
      </div>
      {url ? (
        <img src={url} alt="" className={which === 'logo' ? 'h-20 w-20 rounded-xl object-cover' : 'h-24 w-full rounded-xl object-cover'} />
      ) : (
        <div className={`grid place-items-center rounded-xl bg-muted ${which === 'logo' ? 'h-20 w-20' : 'h-24 w-full'}`}>
          <Icon name="image" className="h-6 w-6 text-foreground-subtle" />
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary hover:underline">
        {uploading === which ? <Spinner size="sm" /> : <Icon name="image" className="h-4 w-4" />}
        {url ? 'Replace' : 'Upload'}
        <input
          type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, which); e.target.value = ''; }}
        />
      </label>
    </Card>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <label className="block text-sm font-medium text-foreground">
        Brand name
        <div className="mt-1 flex gap-2">
          <Input value={name ?? b.name} onChange={(e) => setName(e.target.value)} />
          <Button
            variant="secondary"
            loading={busy}
            disabled={name === null || name.trim() === b.name || !name.trim()}
            onClick={() => void save({ name: (name ?? '').trim() })}
          >
            Save
          </Button>
        </div>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <ImageSlot which="logo" url={b.branding?.logoUrl} label="Logo" hint="Shown on the storefront and receipts." />
        <ImageSlot which="cover" url={b.branding?.coverImageUrl} label="Cover image" hint="The banner on the brand's menu page." />
      </div>

      <Card padding="md" className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Theme colours</p>
        <div className="flex flex-wrap gap-4">
          {(['primaryColor', 'secondaryColor'] as const).map((key) => (
            <label key={key} className="text-xs font-medium text-foreground-muted">
              {key === 'primaryColor' ? 'Primary' : 'Secondary'}
              <input
                type="color"
                defaultValue={b.branding?.[key] ?? '#E4002B'}
                onBlur={(e) => void save({ branding: { [key]: e.target.value } })}
                className="mt-1 block h-10 w-20 cursor-pointer rounded-lg border border-border bg-surface"
              />
            </label>
          ))}
        </div>
      </Card>

      <Card padding="md" className="space-y-1 text-sm">
        <p className="font-semibold text-foreground">Status</p>
        <select className={field} defaultValue={b.status} onChange={(e) => void save({ status: e.target.value })}>
          {['active', 'onboarding', 'suspended', 'inactive'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Card>
    </div>
  );
}

/** Outlets attached to this brand. Creation lives on the Kitchens screen, which
 *  owns the full outlet form (address, geo, hours, discovery profile). */
function OutletsTab({ brandId }: { brandId: string }) {
  const navigate = useNavigate();
  const q = useQueryResource(qk('admin', 'brand', brandId), () => adminService.brand(brandId));
  const outlets = q.data?.outlets ?? [];

  if (q.isLoading) return <div className="grid min-h-40 place-items-center"><Spinner /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground-muted">
          {outlets.length} outlet{outlets.length === 1 ? '' : 's'} serving this brand's menu.
        </p>
        <Button size="sm" leftIcon="add" onClick={() => navigate('/admin/kitchens')}>Add outlet</Button>
      </div>

      {outlets.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Icon name="store" className="mx-auto h-8 w-8 text-foreground-subtle" />
          <p className="mt-2 text-sm text-foreground-muted">No outlets attached yet.</p>
          <p className="text-xs text-foreground-subtle">Create one on the Kitchens screen and pick this brand.</p>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {outlets.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate(`/admin/kitchens/${o.id}`)}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                <Icon name="store" className="h-4 w-4 text-foreground-subtle" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{o.name}</p>
                <p className="truncate text-xs text-foreground-muted">{o.city ?? o.slug ?? '—'}</p>
              </div>
              <Badge tone={o.status === 'active' ? 'success' : 'neutral'} variant="soft" className="text-[0.625rem]">{o.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AdminBrandDetailPage — everything a brand owns, in one place: identity and
 * assets, the shared menu, coupons, the loyalty rule, and the outlets attached
 * to it.
 *
 * The menu/coupon/loyalty tabs REUSE the existing screens, scoped to this brand
 * — the coupon and loyalty pages already drive the scoped API, so wrapping them
 * in RestaurantScopeProvider points them at this brand with no second picker and
 * no duplicated implementation.
 */
export function AdminBrandDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const q = useQueryResource(qk('admin', 'brand', id), () => adminService.brand(id), { enabled: Boolean(id) });

  if (q.isLoading) return <div className="grid min-h-60 place-items-center"><Spinner /></div>;
  if (q.isError || !q.data) {
    return (
      <div className="grid min-h-60 place-items-center p-6">
        <ErrorState title="Brand not found" description="We couldn't load this brand." onRetry={() => q.refetch()} />
      </div>
    );
  }

  const b = q.data;
  const fallback = <div className="grid min-h-40 place-items-center"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate('/admin/restaurants')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Back to brands">
          <Icon name="arrowLeft" className="h-4 w-4" />
        </button>
        {b.branding?.logoUrl ? (
          <img src={b.branding.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><Icon name="utensils" className="h-5 w-5 text-foreground-subtle" /></span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">{b.name}</h1>
          <p className="truncate text-sm text-foreground-muted">
            {b.organization?.name} · {b.outletCount ?? 0} outlet{(b.outletCount ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <Badge tone={b.status === 'active' ? 'success' : 'neutral'} variant="soft" className="ml-auto">{b.status}</Badge>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
        </TabsList>

        <TabsContent value="branding"><BrandingTab brandId={id} /></TabsContent>
        <TabsContent value="menu"><AdminCatalogPage tab="products" brandId={id} /></TabsContent>
        <TabsContent value="categories"><AdminCatalogPage tab="categories" brandId={id} /></TabsContent>
        <TabsContent value="coupons">
          <RestaurantScopeProvider restaurantId={id}>
            <Suspense fallback={fallback}><CouponsPage /></Suspense>
          </RestaurantScopeProvider>
        </TabsContent>
        <TabsContent value="loyalty">
          <RestaurantScopeProvider restaurantId={id}>
            <Suspense fallback={fallback}><LoyaltyRulePage /></Suspense>
          </RestaurantScopeProvider>
        </TabsContent>
        <TabsContent value="outlets"><OutletsTab brandId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
