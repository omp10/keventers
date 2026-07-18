import { useNavigate } from 'react-router-dom';

import { ScannerExperience, type ScannerResolution } from '../scanner';
import { setActiveBranchSlug } from '../entry';

/** /qr/manual — manual code entry first (camera optional). Reuses the scanner. */
export function ManualQrPage() {
  const navigate = useNavigate();
  const open = (r: ScannerResolution) => {
    setActiveBranchSlug(r.branchSlug);
    navigate(`/r/${r.branchSlug}/menu`, { replace: true });
  };
  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Enter your code</h1>
        <p className="text-sm text-foreground-muted">Type the code printed near the QR on your table.</p>
      </header>
      <ScannerExperience onResolved={open} startWithCamera={false} />
    </div>
  );
}
