import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Field, Icon, Input, Textarea, toast } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { kitchenOnboardingService } from './onboarding';

type Draft = {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  cuisines: string;
};

/**
 * KitchenRegisterPage — how a brand-new phone sign-in gets a kitchen. It submits
 * the PUBLIC restaurant application (the same endpoint the marketing site uses),
 * which creates a PENDING application for admin review — it does NOT grant
 * access. Approval provisioning stays backend-owned; once an admin approves, the
 * next sign-in with this number opens the board.
 */
export function KitchenRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    restaurantName: '',
    ownerName: '',
    email: '',
    // Pre-fill the number they just verified — it's already theirs.
    phone: user?.phone ?? '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
    cuisines: '',
  });

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await kitchenOnboardingService.register(draft);
      setSubmitted(true);
    } catch (err) {
      toast.error('Could not submit your application', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-5 py-12 text-foreground">
        <Card padding="lg" className="max-w-lg text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
            <Icon name="checkCircle" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Application received</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Our team is reviewing <strong className="text-foreground">{draft.restaurantName}</strong>. Once it's
            approved, sign in with this number and your kitchen board opens automatically.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/kitchen/onboarding')}>
              Back to setup
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-5 py-12 text-foreground">
      <form onSubmit={submit} className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Kitchen setup</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">Register your restaurant</h1>
        <p className="mt-3 text-foreground-muted">
          Tell us about your business. Our team reviews every application before a kitchen goes live.
        </p>

        <Card padding="lg" className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Restaurant name" required>
              <Input value={draft.restaurantName} onChange={(e) => patch({ restaurantName: e.target.value })} placeholder="Keventers Connaught Place" required />
            </Field>
            <Field label="Owner name" required>
              <Input value={draft.ownerName} onChange={(e) => patch({ ownerName: e.target.value })} placeholder="Your full name" required />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required>
              <Input type="email" value={draft.email} onChange={(e) => patch({ email: e.target.value })} placeholder="owner@restaurant.com" required />
            </Field>
            <Field label="Phone" required description="The number you signed in with.">
              <Input type="tel" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} required />
            </Field>
          </div>

          <Field label="Street address">
            <Input value={draft.line1} onChange={(e) => patch({ line1: e.target.value })} placeholder="A-1, Connaught Place" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required>
              <Input value={draft.city} onChange={(e) => patch({ city: e.target.value })} placeholder="New Delhi" required />
            </Field>
            <Field label="State" required>
              <Input value={draft.state} onChange={(e) => patch({ state: e.target.value })} placeholder="Delhi" required />
            </Field>
            <Field label="Pincode" required>
              <Input value={draft.pincode} onChange={(e) => patch({ pincode: e.target.value })} placeholder="110001" required />
            </Field>
          </div>

          <Field label="Cuisines" description="Comma separated.">
            <Textarea rows={2} value={draft.cuisines} onChange={(e) => patch({ cuisines: e.target.value })} placeholder="Milkshakes, Desserts, Waffles" />
          </Field>
        </Card>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="submit" size="lg" loading={busy}>Submit application</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate('/kitchen/onboarding')}>
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
