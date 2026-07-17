import { Link, useParams } from 'react-router-dom';

import { Badge, Button, EmptyState, ErrorState, Icon, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';

import { adminService } from '../../admin.service';
import type { AdminKitchen } from '../../types';
import { MenuTab } from './MenuTab';
import { OverviewTab } from './OverviewTab';
import { RevenueTab } from './RevenueTab';
import { StaffTab } from './StaffTab';
import { TablesQrTab } from './TablesQrTab';

/**
 * KitchenDetailPage — one outlet seen from every angle: its storefront profile,
 * the menu its brand serves, and the tables/QR codes guests order from.
 *
 * SCOPE MATTERS HERE. An outlet is a BRANCH, but a menu belongs to the
 * RESTAURANT above it — so editing a product changes it for every outlet of the
 * brand, while a table or QR belongs to this outlet alone. Each tab says which
 * it is rather than leaving an editor to find out by surprise.
 */
export function KitchenDetailPage() {
  const { id = '' } = useParams();
  const kitchen = useQueryResource<AdminKitchen>(qk('admin', 'kitchen', id), () => adminService.kitchen(id), {
    enabled: Boolean(id),
  });

  if (kitchen.isLoading) return <KitchenDetailSkeleton />;

  if (kitchen.isError) {
    return (
      <ErrorState
        title="Couldn't load this kitchen"
        description={kitchen.error?.message ?? 'The outlet may have been deleted.'}
        onRetry={() => void kitchen.refetch()}
      />
    );
  }

  const k = kitchen.data;
  if (!k) {
    return (
      <EmptyState
        title="Kitchen not found"
        description="This outlet no longer exists."
        icon={<Icon name="store" className="mb-4 h-10 w-10 text-foreground-subtle" />}
      />
    );
  }

  return (
    <div className="space-y-5">
      <KitchenHeader kitchen={k} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="tables">Tables &amp; QR</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab kitchen={k} />
        </TabsContent>
        <TabsContent value="menu">
          <MenuTab kitchen={k} />
        </TabsContent>
        <TabsContent value="tables">
          <TablesQrTab kitchen={k} />
        </TabsContent>
        <TabsContent value="staff">
          <StaffTab kitchen={k} />
        </TabsContent>
        <TabsContent value="revenue">
          <RevenueTab kitchen={k} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KitchenHeader({ kitchen: k }: { kitchen: AdminKitchen }) {
  const location = [k.discovery.area, k.address?.city].filter(Boolean).join(' · ');
  return (
    <div className="space-y-4">
      <Link
        to="/admin/kitchens"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        All kitchens
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {k.discovery.coverImageUrl ? (
            <img src={k.discovery.coverImageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-muted">
              <Icon name="store" className="h-5 w-5 text-foreground-subtle" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{k.name}</h1>
            <p className="mt-0.5 truncate text-sm text-foreground-muted">
              {k.restaurant?.name ?? '—'}
              {location ? ` · ${location}` : ''}
              {k.code ? ` · ${k.code}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={k.status === 'active' ? 'success' : 'neutral'} variant="soft">
                {k.status}
              </Badge>
              {k.discovery.featured && <Badge tone="accent" variant="soft">Featured</Badge>}
              {k.discovery.promoted && <Badge tone="info" variant="soft">Promoted</Badge>}
              {k.discovery.offer?.label && <Badge tone="success" variant="soft">{k.discovery.offer.label}</Badge>}
            </div>
          </div>
        </div>

        {k.slug && (
          <Button variant="secondary" leftIcon="linkOut" onClick={() => window.open(`/r/${k.slug}`, '_blank', 'noopener')}>
            View storefront
          </Button>
        )}
      </div>
    </div>
  );
}

function KitchenDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-4">
        <Skeleton className="h-16 w-24 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
