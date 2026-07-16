import { useEffect, useState } from 'react';

import {
  Badge,
  Checkbox,
  EmptyState,
  Icon,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@/design-system';
import { formatMoney } from '@/features/ordering';

import { BulkActionBar, useBulkSelection } from '../bulk';
import { useAllVariants } from '../hooks';
import { variantService } from '../services';

/**
 * VariantsPage — a cross-catalog table of every product variant, with search and
 * bulk availability editing. Bulk edits go through variantService.bulkUpdate; the
 * backend owns pricing + inventory. Inventory counts are a future addition.
 */
export function VariantsPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const { data, isLoading, refetch } = useAllVariants(debouncedQ || undefined);
  const sel = useBulkSelection();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const variants = data ?? [];

  const bulkSetAvailable = async (available: boolean) => {
    setPending(true);
    try {
      await variantService.bulkUpdate(sel.ids.map((id) => ({ id, patch: { available } })));
      toast.success('Updated');
      await refetch();
      sel.clear();
    } catch (e) {
      toast.error('Action failed', { description: (e as Error).message });
    } finally {
      setPending(false);
    }
  };

  const allIds = variants.map((v) => v.id);
  const allSelected = sel.allSelected(allIds);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-28">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Variants</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">Every product variant across the catalog.</p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            leftIcon="search"
            value={q}
            placeholder="Search variants or products"
            aria-label="Search variants"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : variants.length === 0 ? (
        <EmptyState
          icon={<Icon name="package" />}
          title={debouncedQ ? 'No matching variants' : 'No variants yet'}
          description={
            debouncedQ ? 'Try a different search term.' : 'Variants appear here once products define size or option variants.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => (allSelected ? sel.clear() : sel.selectAll(allIds))}
                    aria-label="Select all variants"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow
                  key={v.id}
                  onClick={() => sel.toggle(v.id)}
                  className="cursor-pointer"
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={sel.isSelected(v.id)}
                      onCheckedChange={() => sel.toggle(v.id)}
                      aria-label={`Select ${v.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-foreground-muted">{v.productName}</TableCell>
                  <TableCell className="font-medium text-foreground">{v.name}</TableCell>
                  <TableCell className="tabular-nums text-foreground-muted">{formatMoney(v.price)}</TableCell>
                  <TableCell className="text-foreground-subtle">{v.sku || '—'}</TableCell>
                  <TableCell>
                    <Badge tone={v.available ? 'success' : 'neutral'} variant="soft">
                      {v.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-foreground-subtle">
        <Icon name="info" className="h-3.5 w-3.5" />
        Per-branch inventory tracking is coming soon.
      </p>

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        pending={pending}
        actions={[
          { key: 'available', label: 'Mark available', icon: 'check', onClick: () => bulkSetAvailable(true) },
          { key: 'unavailable', label: 'Mark unavailable', icon: 'close', onClick: () => bulkSetAvailable(false) },
        ]}
      />
    </div>
  );
}
