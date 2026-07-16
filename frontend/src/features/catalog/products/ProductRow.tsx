import { Badge, Button, Card, Checkbox, Icon, TableRow, TableCell } from '@/design-system';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/features/ordering';

import { StatusBadge, AvailabilityBadge } from '../components';
import type { CatalogProduct, VegClass } from '../types';

type ProductRowProps = {
  product: CatalogProduct;
  selected?: boolean;
  onToggleSelect?: () => void;
  onEdit: () => void;
};

const VEG_TONE: Record<VegClass, { border: string; dot: string; label: string }> = {
  veg: { border: 'border-success', dot: 'bg-success', label: 'Vegetarian' },
  non_veg: { border: 'border-danger', dot: 'bg-danger', label: 'Non-vegetarian' },
  egg: { border: 'border-warning', dot: 'bg-warning', label: 'Contains egg' },
};

/** A small colored square denoting the veg classification (Indian food-labelling convention). */
function VegMark({ veg, className }: { veg?: VegClass; className?: string }) {
  if (!veg) return null;
  const tone = VEG_TONE[veg];
  return (
    <span
      className={cn('inline-grid size-3.5 shrink-0 place-items-center rounded-[3px] border', tone.border, className)}
      role="img"
      aria-label={tone.label}
      title={tone.label}
    >
      <span className={cn('size-1.5 rounded-full', tone.dot)} />
    </span>
  );
}

/** Cover thumbnail: first image, or a utensils placeholder. */
function Cover({ product, className }: { product: CatalogProduct; className?: string }) {
  const url = product.images[0]?.url;
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-xl bg-muted', className)}>
      {url ? (
        <img src={url} alt={product.images[0]?.alt ?? ''} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-foreground-subtle">
          <Icon name="utensils" />
        </div>
      )}
    </div>
  );
}

/** featured / popular pills, shared by both layouts. */
function Flags({ product }: { product: CatalogProduct }) {
  if (!product.featured && !product.popular) return null;
  return (
    <>
      {product.featured && (
        <Badge tone="accent" variant="soft">
          <Icon name="star" /> Featured
        </Badge>
      )}
      {product.popular && (
        <Badge tone="primary" variant="soft">
          <Icon name="trend" /> Popular
        </Badge>
      )}
    </>
  );
}

function Price({ product }: { product: CatalogProduct }) {
  const hasDiscount = !!product.discountedPrice;
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className={cn('font-semibold text-foreground', hasDiscount && 'text-primary')}>
        {formatMoney(hasDiscount ? product.discountedPrice : product.price)}
      </span>
      {hasDiscount && (
        <span className="text-xs text-foreground-subtle line-through">{formatMoney(product.price)}</span>
      )}
    </span>
  );
}

/**
 * ProductRow — the grid card. The ONE catalog product card, reused across the
 * products grid. Pairs with ProductTableRow for the table view.
 */
export function ProductRow({ product, selected, onToggleSelect, onEdit }: ProductRowProps) {
  return (
    <Card
      padding="none"
      variant="outline"
      className={cn(
        'group flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        selected && 'ring-2 ring-primary',
      )}
    >
      <div className="relative">
        <Cover product={product} className="aspect-[4/3] w-full rounded-none" />
        {onToggleSelect && (
          <div
            className={cn(
              'absolute left-2 top-2 rounded-md bg-surface/90 p-1 shadow-sm backdrop-blur transition-opacity',
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
            )}
          >
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onToggleSelect()}
              aria-label={selected ? `Deselect ${product.name}` : `Select ${product.name}`}
            />
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
          <Flags product={product} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-1.5">
          <VegMark veg={product.veg} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{product.name || 'Untitled product'}</p>
            {product.categoryName && (
              <p className="truncate text-xs text-foreground-subtle">{product.categoryName}</p>
            )}
          </div>
        </div>

        <Price product={product} />

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <StatusBadge status={product.status} />
          <AvailabilityBadge availability={product.availability} />
        </div>

        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon="edit"
          onClick={onEdit}
          className="mt-1"
        >
          Edit
        </Button>
      </div>
    </Card>
  );
}

/**
 * ProductTableRow — a <tr> for the dense table view. Columns:
 * checkbox · name+image · category · price · status · availability · actions.
 */
export function ProductTableRow({ product, selected, onToggleSelect, onEdit }: ProductRowProps) {
  return (
    <TableRow
      onClick={onEdit}
      className={cn('cursor-pointer', selected && 'bg-primary-soft/40')}
    >
      <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
        {onToggleSelect && (
          <Checkbox
            checked={!!selected}
            onCheckedChange={() => onToggleSelect()}
            aria-label={selected ? `Deselect ${product.name}` : `Select ${product.name}`}
          />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Cover product={product} className="size-11" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <VegMark veg={product.veg} />
              <span className="truncate font-medium text-foreground">{product.name || 'Untitled product'}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <Flags product={product} />
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-foreground-muted">{product.categoryName ?? '—'}</TableCell>
      <TableCell>
        <Price product={product} />
      </TableCell>
      <TableCell>
        <StatusBadge status={product.status} />
      </TableCell>
      <TableCell>
        <AvailabilityBadge availability={product.availability} />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${product.name}`} onClick={onEdit}>
          <Icon name="edit" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
