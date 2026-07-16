import { MenuPreview } from './MenuPreview';

/**
 * PreviewPage (Phase F4.2) — the admin's window into the customer experience. It
 * renders the catalog exactly as diners see it in the ordering app, live against
 * the current catalog data, inside selectable device frames.
 */
export function PreviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Menu preview</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          See your catalog exactly as customers do — every edit shows up instantly.
        </p>
      </header>

      <MenuPreview />
    </div>
  );
}
