import { Button, Field, Icon, Input, Switch } from '@/design-system';
import { ImageUploadField } from '@/features/management/components';
import { cn } from '@/lib/cn';

import { kitchenOnboardingService, type BusinessHour, type OnboardingStep, type TaxRate } from './onboarding';

/**
 * The wizard's form model. One flat draft covering every step, seeded from
 * sensible defaults that mirror the backend's own schema defaults — so a step
 * submitted untouched stores exactly what the backend would have defaulted to,
 * rather than nulls.
 */
export type WizardDraft = {
  logoUrl: string | null;
  logoKey: string | null;
  businessHours: BusinessHour[];
  currency: string;
  taxEnabled: boolean;
  taxInclusive: boolean;
  taxRates: TaxRate[];
  timezone: string;
  qrEnabled: boolean;
  qrRequireTableSelection: boolean;
  qrLogoOnQr: boolean;
  tableCount: number;
  paymentGateway: string;
  codEnabled: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const emptyDraft = (): WizardDraft => ({
  logoUrl: null,
  logoKey: null,
  businessHours: DAYS.map((day) => ({ day, isOpen: true, open: '09:00', close: '22:00' })),
  currency: 'INR',
  taxEnabled: true,
  taxInclusive: false,
  taxRates: [{ name: 'GST', percentage: 5 }],
  timezone: 'Asia/Kolkata',
  qrEnabled: true,
  qrRequireTableSelection: true,
  qrLogoOnQr: true,
  tableCount: 10,
  paymentGateway: '',
  codEnabled: true,
  notifyEmail: true,
  notifySms: false,
  notifyWhatsapp: false,
});

export type Patch = (p: Partial<WizardDraft>) => void;

export type StepDef = {
  key: OnboardingStep;
  title: string;
  description: string;
  /** Payload for POST /restaurant/onboarding/step. */
  toData: (d: WizardDraft) => Record<string, unknown>;
  /** Return a message to block submission, or null to allow it. */
  validate?: (d: WizardDraft) => string | null;
  Body: (props: { draft: WizardDraft; patch: Patch }) => React.ReactElement;
};

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee' },
  { value: 'USD', label: '$ US Dollar' },
  { value: 'EUR', label: '€ Euro' },
  { value: 'GBP', label: '£ Pound Sterling' },
  { value: 'AED', label: 'د.إ UAE Dirham' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

/** Simple radio-ish picker — avoids a Select inside a scrolling wizard body. */
function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === o.value ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const STEPS: StepDef[] = [
  {
    key: 'logo',
    title: 'Logo',
    description: 'Shown on your storefront, QR codes and receipts.',
    // `logoKey` stays null: ImageUploadField only surfaces the URL, and the
    // backend treats the key as optional (`data.logoKey ?? null`).
    toData: (d) => ({ logoUrl: d.logoUrl, logoKey: d.logoKey }),
    Body: ({ draft, patch }) => (
      <ImageUploadField
        label="Restaurant logo"
        aspect="aspect-square"
        hint="PNG or JPG, up to 10 MB. Optional — you can add it later."
        value={draft.logoUrl ?? ''}
        onChange={(url) => patch({ logoUrl: url || null })}
        upload={(file, onProgress) => kitchenOnboardingService.uploadLogo(file, onProgress)}
      />
    ),
  },
  {
    key: 'business_hours',
    title: 'Business hours',
    description: "When this outlet takes orders. Customers can't order outside these hours.",
    toData: (d) => ({ businessHours: d.businessHours }),
    validate: (d) =>
      d.businessHours.some((h) => h.isOpen) ? null : 'Open on at least one day, otherwise nobody can order.',
    Body: ({ draft, patch }) => (
      <div className="space-y-2">
        {draft.businessHours.map((h, i) => (
          <div key={h.day} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
            <span className="w-24 shrink-0 text-sm capitalize text-foreground">{h.day}</span>
            <Switch
              checked={h.isOpen}
              onCheckedChange={(on) => {
                const next = [...draft.businessHours];
                next[i] = { ...h, isOpen: on };
                patch({ businessHours: next });
              }}
            />
            {h.isOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={h.open}
                  className="w-32"
                  onChange={(e) => {
                    const next = [...draft.businessHours];
                    next[i] = { ...h, open: e.target.value };
                    patch({ businessHours: next });
                  }}
                />
                <span className="text-foreground-subtle">to</span>
                <Input
                  type="time"
                  value={h.close}
                  className="w-32"
                  onChange={(e) => {
                    const next = [...draft.businessHours];
                    next[i] = { ...h, close: e.target.value };
                    patch({ businessHours: next });
                  }}
                />
              </div>
            ) : (
              <span className="text-sm text-foreground-subtle">Closed</span>
            )}
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'currency',
    title: 'Currency',
    description: 'Every price on your menu is stored and charged in this currency.',
    toData: (d) => ({ currency: d.currency }),
    Body: ({ draft, patch }) => (
      <Field label="Currency">
        <Choice value={draft.currency} onChange={(currency) => patch({ currency })} options={CURRENCIES} />
      </Field>
    ),
  },
  {
    key: 'taxes',
    title: 'Taxes',
    description: 'How tax is calculated on every order.',
    toData: (d) => ({
      tax: {
        enabled: d.taxEnabled,
        inclusive: d.taxInclusive,
        rates: d.taxEnabled ? d.taxRates.filter((r) => r.name.trim()) : [],
      },
    }),
    validate: (d) =>
      !d.taxEnabled || d.taxRates.some((r) => r.name.trim() && r.percentage > 0)
        ? null
        : 'Add at least one tax rate, or turn tax off.',
    Body: ({ draft, patch }) => (
      <div className="space-y-4">
        <Field label="Charge tax" orientation="horizontal" description="Turn off if your prices are tax-free.">
          <Switch checked={draft.taxEnabled} onCheckedChange={(on) => patch({ taxEnabled: on })} />
        </Field>
        {draft.taxEnabled && (
          <>
            <Field
              label="Prices already include tax"
              orientation="horizontal"
              description="On: menu prices are tax-inclusive. Off: tax is added at checkout."
            >
              <Switch checked={draft.taxInclusive} onCheckedChange={(on) => patch({ taxInclusive: on })} />
            </Field>
            <Field label="Tax rates">
              <div className="space-y-2">
                {draft.taxRates.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="GST"
                      value={r.name}
                      onChange={(e) => {
                        const next = [...draft.taxRates];
                        next[i] = { ...r, name: e.target.value };
                        patch({ taxRates: next });
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-28"
                      value={String(r.percentage)}
                      onChange={(e) => {
                        const next = [...draft.taxRates];
                        next[i] = { ...r, percentage: Number(e.target.value) };
                        patch({ taxRates: next });
                      }}
                    />
                    <span className="text-sm text-foreground-subtle">%</span>
                    {draft.taxRates.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon="delete"
                        aria-label={`Remove ${r.name || 'rate'}`}
                        onClick={() => patch({ taxRates: draft.taxRates.filter((_, x) => x !== i) })}
                      />
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon="add"
                  onClick={() => patch({ taxRates: [...draft.taxRates, { name: '', percentage: 0 }] })}
                >
                  Add rate
                </Button>
              </div>
            </Field>
          </>
        )}
      </div>
    ),
  },
  {
    key: 'timezone',
    title: 'Timezone',
    description: 'Used for business hours, order timestamps and daily reports.',
    toData: (d) => ({ timezone: d.timezone }),
    Body: ({ draft, patch }) => (
      <Field label="Timezone">
        <Choice
          value={draft.timezone}
          onChange={(timezone) => patch({ timezone })}
          options={TIMEZONES.map((t) => ({ value: t, label: t.replace('_', ' ') }))}
        />
      </Field>
    ),
  },
  {
    key: 'qr_settings',
    title: 'QR ordering',
    description: 'How guests order by scanning a code at the table.',
    toData: (d) => ({
      qr: { enabled: d.qrEnabled, requireTableSelection: d.qrRequireTableSelection, logoOnQr: d.qrLogoOnQr },
    }),
    Body: ({ draft, patch }) => (
      <div className="space-y-4">
        <Field label="Enable QR ordering" orientation="horizontal" description="Guests scan a table code to order.">
          <Switch checked={draft.qrEnabled} onCheckedChange={(on) => patch({ qrEnabled: on })} />
        </Field>
        <Field
          label="Require table selection"
          orientation="horizontal"
          description="Guests must confirm which table they're at."
        >
          <Switch
            checked={draft.qrRequireTableSelection}
            onCheckedChange={(on) => patch({ qrRequireTableSelection: on })}
          />
        </Field>
        <Field label="Show logo on QR codes" orientation="horizontal">
          <Switch checked={draft.qrLogoOnQr} onCheckedChange={(on) => patch({ qrLogoOnQr: on })} />
        </Field>
      </div>
    ),
  },
  {
    key: 'table_count',
    title: 'Tables',
    description: 'How many tables this outlet seats. Each one gets its own QR code.',
    toData: (d) => ({ tableCount: d.tableCount }),
    validate: (d) => (d.tableCount >= 0 ? null : 'Table count cannot be negative.'),
    Body: ({ draft, patch }) => (
      <Field label="Number of tables" description="You can add or remove tables later.">
        <Input
          type="number"
          min="0"
          max="500"
          className="w-40"
          value={String(draft.tableCount)}
          onChange={(e) => patch({ tableCount: e.target.value === '' ? 0 : Number(e.target.value) })}
        />
      </Field>
    ),
  },
  {
    key: 'staff_invitation',
    title: 'Staff',
    description: 'Who works the line.',
    toData: () => ({}),
    Body: () => (
      <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-soft px-3.5 py-3">
        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p className="text-sm text-foreground">
          You can invite staff any time from the dashboard once setup is done — it isn't needed to open the kitchen
          board. Continue to acknowledge this step.
        </p>
      </div>
    ),
  },
  {
    key: 'payment_gateway',
    title: 'Payments',
    description: 'How guests pay. You can connect an online gateway later.',
    toData: (d) => ({ gateway: d.paymentGateway || null, codEnabled: d.codEnabled }),
    Body: ({ draft, patch }) => (
      <div className="space-y-4">
        <Field label="Online gateway" description="Leave as 'None' to take payment at the counter only.">
          <Choice
            value={draft.paymentGateway}
            onChange={(paymentGateway) => patch({ paymentGateway })}
            options={[
              { value: '', label: 'None for now' },
              { value: 'razorpay', label: 'Razorpay' },
              { value: 'phonepe', label: 'PhonePe' },
            ]}
          />
        </Field>
        <Field label="Accept cash / counter payment" orientation="horizontal">
          <Switch checked={draft.codEnabled} onCheckedChange={(on) => patch({ codEnabled: on })} />
        </Field>
      </div>
    ),
  },
  {
    key: 'notification_settings',
    title: 'Notifications',
    description: 'How your customers hear about their orders.',
    toData: (d) => ({
      notifications: { email: d.notifyEmail, sms: d.notifySms, whatsapp: d.notifyWhatsapp },
    }),
    Body: ({ draft, patch }) => (
      <div className="space-y-4">
        <Field label="Email" orientation="horizontal">
          <Switch checked={draft.notifyEmail} onCheckedChange={(on) => patch({ notifyEmail: on })} />
        </Field>
        <Field label="SMS" orientation="horizontal">
          <Switch checked={draft.notifySms} onCheckedChange={(on) => patch({ notifySms: on })} />
        </Field>
        <Field label="WhatsApp" orientation="horizontal">
          <Switch checked={draft.notifyWhatsapp} onCheckedChange={(on) => patch({ notifyWhatsapp: on })} />
        </Field>
      </div>
    ),
  },
];
