import { useState } from 'react';

import {
  Badge, Button, Card, Checkbox, CircularProgress, Combobox, Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose, Field, Heading, Icon, Input, OTPInput,
  Progress, RadioGroup, RadioGroupItem, Search, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Skeleton, SkeletonText, Spinner, StatCard, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Text, ThemeToggle,
  Timeline, Tooltip, toast, useTheme, brands, type Brand,
} from '@/design-system';
import { Logo, Mark } from '@/assets';
import { EmptyState } from '@/design-system';
import { QRCode } from '@/design-system';
import { Stagger } from '@/animations';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-10 first:border-t-0">
      <div className="mb-6">
        <Heading level="h3">{title}</Heading>
        {description && <Text tone="muted" variant="bodySm" className="mt-1">{description}</Text>}
      </div>
      {children}
    </section>
  );
}

function BrandSwitcher() {
  const { brand, setBrand } = useTheme();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {(Object.values(brands) as Brand[]).map((b) => (
        <button
          key={b.id}
          onClick={() => setBrand(b)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${brand.id === b.id ? 'bg-surface text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'}`}
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Design System SHOWCASE — the living gallery / playground (NOT a business page).
 * It exists to demonstrate + review the foundation: switch the brand at the top
 * and watch EVERY component rebrand with zero code changes; toggle the theme and
 * watch it flip instantly. This is the proof the definition-of-success is met.
 */
export function Showcase() {
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('standard');
  const [otp, setOtp] = useState('');
  const [combo, setCombo] = useState('');

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-border bg-[var(--kv-glass-bg)] px-6 py-3 backdrop-blur-xl">
        <Logo size={28} />
        <div className="flex items-center gap-3">
          <BrandSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <div className="py-14 text-center">
          <Badge tone="primary" variant="soft" className="mb-4" icon="star">Design System · Phase F1</Badge>
          <Heading level="displayLg" gradient className="mx-auto max-w-3xl">One premium foundation, infinitely rebrandable</Heading>
          <Text variant="bodyLg" tone="muted" className="mx-auto mt-4 max-w-xl">
            Switch the brand above — Keventers → Starbucks → McDonald's — and every token, color, radius and motion updates
            across the whole system. No component touched.
          </Text>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" rightIcon="arrowRight" onClick={() => toast.success('Welcome to the design system!')}>Get started</Button>
            <Button size="lg" variant="outline" leftIcon="qr">View components</Button>
          </div>
        </div>

        <Section title="Buttons" description="Variants × sizes × states — all token-driven.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button leftIcon="cart">With icon</Button>
            <Button size="icon" variant="outline" aria-label="Add"><Icon name="add" /></Button>
          </div>
        </Section>

        <Section title="Inputs & forms" description="Accessible fields with labels, descriptions and errors.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Email" description="We'll never share it." required>
              <Input type="email" placeholder="you@example.com" leftIcon="mail" />
            </Field>
            <Field label="Search menu">
              <Search placeholder="Search…" onClear={() => {}} value="" />
            </Field>
            <Field label="Store" error="Please select a store.">
              <Select>
                <SelectTrigger aria-invalid><SelectValue placeholder="Choose a store" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cp">Connaught Place</SelectItem>
                  <SelectItem value="kmp">Khan Market</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="City">
              <Combobox
                value={combo}
                onChange={setCombo}
                options={[{ value: 'del', label: 'New Delhi' }, { value: 'mum', label: 'Mumbai' }, { value: 'blr', label: 'Bengaluru' }]}
                placeholder="Select a city"
              />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-8">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} /> Remember me</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={checked} onCheckedChange={setChecked} /> Notifications</label>
            <RadioGroup value={radio} onValueChange={setRadio} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="standard" /> Standard</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="express" /> Express</label>
            </RadioGroup>
            <OTPInput value={otp} onChange={setOtp} length={4} />
          </div>
        </Section>

        <Section title="Feedback & status">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Neutral</Badge>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="success" icon="check">Paid</Badge>
            <Badge tone="warning" dot>Pending</Badge>
            <Badge tone="danger" variant="solid">Failed</Badge>
            <Badge tone="info" variant="outline">Info</Badge>
            <Badge tone="primary" onRemove={() => {}}>Removable</Badge>
            <Spinner />
            <CircularProgress value={68} showValue />
          </div>
          <div className="mt-5 grid max-w-md gap-3">
            <Progress value={72} />
            <Progress value={40} tone="success" size="sm" />
            <Progress indeterminate tone="info" />
          </div>
        </Section>

        <Section title="Cards & metrics">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stagger.Item><StatCard label="Revenue" value="₹1.2L" icon="trend" delta={{ value: 12.4, direction: 'up' }} /></Stagger.Item>
            <Stagger.Item><StatCard label="Orders" value="842" icon="order" delta={{ value: 3.1, direction: 'up' }} /></Stagger.Item>
            <Stagger.Item><StatCard label="Refunds" value="1.2%" icon="payment" delta={{ value: 0.4, direction: 'down' }} positiveIsGood={false} /></Stagger.Item>
            <Stagger.Item><StatCard label="AOV" value="₹420" icon="cart" loading /></Stagger.Item>
          </Stagger>
        </Section>

        <Section title="Overlays & navigation">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild><Button variant="outline">Open dialog</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm order</DialogTitle>
                  <DialogDescription>This places the order and charges the saved card.</DialogDescription>
                </DialogHeader>
                <DialogBody><Text tone="muted" variant="bodySm">Everything here — the dialog, its motion, the buttons — is token-driven and rebrands instantly.</Text></DialogBody>
                <DialogFooter>
                  <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                  <Button onClick={() => toast.success('Order placed')}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Tooltip content="I rebrand too"><Button variant="outline" leftIcon="info">Hover me</Button></Tooltip>
            <Button variant="secondary" onClick={() => toast('A neutral toast')}>Toast</Button>
          </div>

          <div className="mt-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview"><Text tone="muted" variant="bodySm">Tabs use the same tokens and animate on switch.</Text></TabsContent>
              <TabsContent value="activity">
                <Timeline items={[
                  { title: 'Order placed', timestamp: '2m ago', icon: 'order', tone: 'primary', active: true },
                  { title: 'Preparing', timestamp: '1m ago', icon: 'flame', tone: 'warning' },
                  { title: 'Ready', timestamp: 'now', icon: 'check', tone: 'success' },
                ]} />
              </TabsContent>
              <TabsContent value="settings"><Text tone="muted" variant="bodySm">Compose fields here.</Text></TabsContent>
            </Tabs>
          </div>
        </Section>

        <Section title="Loading, empty & QR">
          <div className="grid gap-6 md:grid-cols-3">
            <Card padding="md" className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <SkeletonText lines={3} />
            </Card>
            <Card padding="none"><EmptyState size="sm" title="No orders yet" description="New orders will appear here in real time." action={<Button size="sm" variant="secondary" leftIcon="refresh">Refresh</Button>} /></Card>
            <Card padding="md" className="grid place-items-center"><QRCode value="https://keventers.example/t/42" withLogo size={140} /></Card>
          </div>
        </Section>

        <Section title="Brand mark">
          <div className="flex items-center gap-6">
            <Mark size={56} />
            <Logo size={40} />
            <Text tone="muted" variant="bodySm">The mark + wordmark are pure inline SVG — zero asset files, fully theme-driven.</Text>
          </div>
        </Section>

        <footer className="border-t border-border py-10 text-center">
          <Text tone="subtle" variant="caption">Keventers Design System · built to feel like one premium ecosystem across every app.</Text>
        </footer>
      </div>
    </div>
  );
}
