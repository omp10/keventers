import { useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  DrawerContent,
  DrawerBody,
  DrawerFooter,
  Icon,
  Spinner,
  Textarea,
} from '@/design-system';
import { cn } from '@/lib/cn';
import { formatMoney } from '../format';
import type { CartItemSelection, ModifierGroup, ProductDetail as ProductDetailType } from '../types';
import { PriceTag } from './PriceTag';
import { VegMark } from './VegMark';
import { QuantityStepper } from './QuantityStepper';

/** A selectable option row (variant / modifier / addon). */
function OptionRow({
  label,
  priceLabel,
  selected,
  disabled,
  multi,
  onToggle,
}: {
  label: string;
  priceLabel?: string;
  selected: boolean;
  disabled?: boolean;
  multi?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn('flex w-full items-center justify-between gap-3 py-2.5 text-left disabled:opacity-50')}
    >
      <span className="flex items-center gap-2 text-sm text-foreground">{label}</span>
      <span className="flex items-center gap-3">
        {priceLabel && <span className="text-sm text-foreground-muted">{priceLabel}</span>}
        <span
          className={cn(
            'grid h-5 w-5 place-items-center border-2 transition',
            multi ? 'rounded-md' : 'rounded-full',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
          )}
        >
          {selected && <Icon name="check" className="h-3 w-3" />}
        </span>
      </span>
    </button>
  );
}

/**
 * ProductDetail — the premium product customization drawer (bottom sheet). Handles
 * variants, modifier groups (min/max rules mirrored from the backend), add-ons,
 * quantity, and special instructions, then emits a CartItemSelection. It NEVER
 * computes an order price — it shows catalog option prices and the unit price; the
 * cart's Pricing Engine returns the authoritative totals.
 */
export function ProductDetail({
  product,
  loading,
  open,
  onOpenChange,
  onAddToCart,
  onSelectRelated,
}: {
  product?: ProductDetailType;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (selection: CartItemSelection) => void | Promise<void>;
  onSelectRelated?: (slug: string) => void;
}) {
  const [variantId, setVariantId] = useState<string | undefined>();
  const [modifiers, setModifiers] = useState<Record<string, string[]>>({});
  const [addons, setAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [adding, setAdding] = useState(false);

  // Reset selection whenever the product changes.
  useEffect(() => {
    if (!product) return;
    const def = product.variants?.find((v) => v.isDefault && v.available) ?? product.variants?.find((v) => v.available);
    setVariantId(def?.id);
    const seed: Record<string, string[]> = {};
    product.modifierGroups?.forEach((g) => {
      const defaults = g.modifiers.filter((m) => m.isDefault && m.available).map((m) => m.id).slice(0, g.max);
      seed[g.id] = defaults;
    });
    setModifiers(seed);
    setAddons([]);
    setQuantity(1);
    setInstructions('');
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleModifier = (group: ModifierGroup, id: string) => {
    setModifiers((prev) => {
      const cur = prev[group.id] ?? [];
      if (group.max === 1) return { ...prev, [group.id]: cur.includes(id) ? [] : [id] };
      if (cur.includes(id)) return { ...prev, [group.id]: cur.filter((x) => x !== id) };
      if (cur.length >= group.max) return prev; // respect max
      return { ...prev, [group.id]: [...cur, id] };
    });
  };

  const unmetRequired = useMemo(
    () => (product?.modifierGroups ?? []).filter((g) => g.required && (modifiers[g.id]?.length ?? 0) < Math.max(1, g.min)),
    [product, modifiers],
  );

  const selectedVariant = product?.variants?.find((v) => v.id === variantId);
  const unitPrice = selectedVariant?.price ?? product?.discountedPrice ?? product?.price;

  const submit = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await onAddToCart({
        productId: product.id,
        variantId,
        modifierIds: Object.values(modifiers).flat(),
        addonIds: addons,
        quantity,
        instructions: instructions.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent side="bottom" className="max-h-[92vh] rounded-t-3xl">
        {loading || !product ? (
          <div className="grid h-40 place-items-center">
            <Spinner />
          </div>
        ) : (
          <>
            <DrawerBody className="overflow-y-auto">
              {/* Hero */}
              {product.imageUrl && (
                <div className="-mx-4 -mt-2 mb-4 aspect-[16/9] overflow-hidden bg-muted sm:rounded-2xl">
                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex items-start gap-2">
                <VegMark veg={product.veg} className="mt-1" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
                  <PriceTag price={product.price} discounted={product.discountedPrice} className="text-sm" />
                </div>
              </div>
              {product.description && <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{product.description}</p>}

              {/* Nutrition placeholder */}
              {product.nutrition && product.nutrition.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.nutrition.map((n) => (
                    <Badge key={n.label} tone="neutral" variant="soft">{n.label}: {n.value}</Badge>
                  ))}
                </div>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <Section title="Choose one" required>
                  <div className="divide-y divide-border">
                    {product.variants.map((v) => (
                      <OptionRow
                        key={v.id}
                        label={v.name}
                        priceLabel={formatMoney(v.price)}
                        selected={variantId === v.id}
                        disabled={!v.available}
                        onToggle={() => setVariantId(v.id)}
                      />
                    ))}
                  </div>
                </Section>
              )}

              {/* Modifier groups */}
              {product.modifierGroups?.map((g) => (
                <Section key={g.id} title={g.name} required={g.required} hint={g.max > 1 ? `Up to ${g.max}` : undefined}>
                  <div className="divide-y divide-border">
                    {g.modifiers.map((m) => (
                      <OptionRow
                        key={m.id}
                        label={m.name}
                        priceLabel={m.price.amount ? `+ ${formatMoney(m.price)}` : undefined}
                        selected={(modifiers[g.id] ?? []).includes(m.id)}
                        disabled={!m.available}
                        multi={g.max > 1}
                        onToggle={() => toggleModifier(g, m.id)}
                      />
                    ))}
                  </div>
                </Section>
              ))}

              {/* Add-ons */}
              {product.addons && product.addons.length > 0 && (
                <Section title="Add-ons">
                  <div className="divide-y divide-border">
                    {product.addons.map((a) => (
                      <OptionRow
                        key={a.id}
                        label={a.name}
                        priceLabel={`+ ${formatMoney(a.price)}`}
                        selected={addons.includes(a.id)}
                        disabled={!a.available}
                        multi
                        onToggle={() => setAddons((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                      />
                    ))}
                  </div>
                </Section>
              )}

              {/* Instructions */}
              <Section title="Special instructions">
                <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. less spicy, no onions" rows={2} maxLength={200} />
              </Section>

              {/* Related / cross-sell */}
              {product.related && product.related.length > 0 && onSelectRelated && (
                <Section title="You may also like">
                  <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {product.related.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelectRelated(r.slug)}
                        className="w-32 shrink-0 rounded-xl border border-border p-2 text-left"
                      >
                        <div className="mb-1 aspect-square overflow-hidden rounded-lg bg-muted">
                          {r.imageUrl && <img src={r.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <p className="truncate text-xs font-medium text-foreground">{r.name}</p>
                        <PriceTag price={r.price} discounted={r.discountedPrice} className="text-[0.6875rem]" />
                      </button>
                    ))}
                  </div>
                </Section>
              )}
            </DrawerBody>

            <DrawerFooter>
              <div className="flex items-center gap-3">
                <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
                <Button
                  fullWidth
                  size="lg"
                  loading={adding}
                  disabled={!product.available || unmetRequired.length > 0}
                  onClick={submit}
                >
                  {unmetRequired.length > 0
                    ? `Select ${unmetRequired[0].name}`
                    : `Add${unitPrice ? ` · ${formatMoney(unitPrice)}` : ''}`}
                </Button>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Section({ title, required, hint, children }: { title: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
          {required && <span className="ml-1 text-danger">*</span>}
        </h3>
        {hint && <span className="text-xs text-foreground-subtle">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
