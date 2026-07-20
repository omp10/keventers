import { useState } from 'react';

import { Button, Card, Icon, Spinner, toast } from '@/design-system';
import { qrService, tableService } from '@/features/management/services';
import { TablesPage } from '@/features/management/pages/OperationsPages';
import { qk, queryClient, useQueryResource } from '@/platform/query';

/**
 * KITCHEN → TABLES. Replaces the Stations tab, which configured product routing
 * a single-counter outlet never needs. What staff actually ask for at a new
 * branch is the pair below: create the tables, then get a QR for each one.
 *
 * The table list, create drawer and status actions are REUSED from the manager
 * dashboard rather than rebuilt — same screen, same behaviour, one place to fix.
 * This page adds the bulk QR generation on top.
 */
export function KitchenTablesPage() {
  const tables = useQueryResource(qk('mgmt', 'tables', '', undefined), () => tableService.list());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ok: number; failed: number } | null>(null);

  const rows = tables.data ?? [];

  /**
   * One QR per table. Generation is per-table server-side (there is no bulk
   * endpoint), so this walks them SEQUENTIALLY — firing 50 parallel writes at a
   * shared database to save a second is not a trade worth making, and a partial
   * failure stays comprehensible.
   */
  const generateAll = async () => {
    if (!rows.length) return;
    if (!window.confirm(`Generate a QR code for all ${rows.length} table(s)?\n\nTables that already have one get a fresh code — any printed copies stop working.`)) return;
    setBusy(true);
    setDone(null);
    let ok = 0;
    let failed = 0;
    for (const t of rows) {
      try {
        await qrService.generate({ type: 'permanent', tableId: t.id });
        ok += 1;
      } catch {
        failed += 1; // keep going — one bad table must not abandon the rest
      }
    }
    setBusy(false);
    setDone({ ok, failed });
    void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'qr') });
    if (ok) toast.success(`Generated ${ok} QR code${ok === 1 ? '' : 's'}`);
    if (failed) toast.error(`${failed} table${failed === 1 ? '' : 's'} failed`);
  };

  return (
    <div className="space-y-4">
      <Card padding="md" className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">QR codes</p>
          <p className="text-sm text-foreground-muted">
            {tables.isLoading ? 'Loading tables…' : `${rows.length} table${rows.length === 1 ? '' : 's'} at this branch. Each gets its own code so orders route to the right seat.`}
          </p>
          {done && (
            <p className="mt-1 text-sm">
              <span className="text-success">{done.ok} generated</span>
              {done.failed > 0 && <span className="text-danger"> · {done.failed} failed</span>}
            </p>
          )}
        </div>
        <Button leftIcon="qr" onClick={() => void generateAll()} disabled={busy || rows.length === 0}>
          {busy ? <><Spinner size="sm" /> Generating…</> : 'Generate QR for all tables'}
        </Button>
      </Card>

      {rows.length === 0 && !tables.isLoading && (
        <Card padding="md" className="flex items-center gap-3 text-sm text-foreground-muted">
          <Icon name="info" className="h-4 w-4 shrink-0" />
          Add a table first — QR codes are generated per table.
        </Card>
      )}

      {/* The dashboard's own tables screen: list, create, status, grouping. */}
      <TablesPage />
    </div>
  );
}

export default KitchenTablesPage;
