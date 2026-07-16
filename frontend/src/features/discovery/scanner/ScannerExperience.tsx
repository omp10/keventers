import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Icon, Input, Spinner } from '@/design-system';
import { useScanner, type ScanResult } from '@/platform/scanner';
import { cn } from '@/lib/cn';
import { qrService } from '../services';
import { parseScannedValue } from './qr-code';

export type ScannerResolution = { branchSlug: string; branchName?: string; restaurantName?: string; tableCode?: string };

type Phase = 'scanning' | 'resolving' | 'invalid' | 'expired' | 'not_found' | 'success';

/**
 * ScannerExperience — the QR ORDERING entry. It composes the REUSABLE scanner
 * platform (`useScanner`: camera + BarcodeDetector + torch + camera switch) and
 * adds only the BUSINESS states (resolve code → branch, invalid/expired/not-found,
 * manual entry). No scanning primitives are reimplemented here; the platform scanner
 * stays generic. On success it hands a branch to the caller — session + menu are F3.2.
 */
export function ScannerExperience({
  onResolved,
  startWithCamera = true,
  className,
}: {
  onResolved: (r: ScannerResolution) => void;
  /** Auto-start the camera. Set false for a manual-first entry page. */
  startWithCamera?: boolean;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>('scanning');
  const [manual, setManual] = useState('');
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(startWithCamera);
  const lock = useRef(false);

  const resolve = useCallback(
    async (raw: string) => {
      if (lock.current) return;
      lock.current = true;
      setPhase('resolving');
      const parsed = parseScannedValue(raw);
      try {
        if (parsed.kind === 'slug') {
          setPhase('success');
          onResolved({ branchSlug: parsed.slug });
          return;
        }
        if (parsed.kind === 'code') {
          const res = await qrService.resolveCode(parsed.code);
          if (res.valid && res.branchSlug) {
            setPhase('success');
            onResolved({ branchSlug: res.branchSlug, branchName: res.branchName, restaurantName: res.restaurantName, tableCode: res.tableCode });
            return;
          }
          setFailedCode(parsed.code);
          setPhase(res.reason === 'expired' ? 'expired' : res.reason === 'not_found' ? 'not_found' : 'invalid');
        } else {
          setPhase('invalid');
        }
      } catch {
        setPhase('invalid');
      } finally {
        lock.current = false;
      }
    },
    [onResolved],
  );

  const onScan = useCallback((r: ScanResult) => resolve(r.value), [resolve]);
  const scanner = useScanner({ formats: ['qr_code'], onResult: onScan });
  const { videoRef, status, error, start, stop, toggleTorch, switchCamera, torchOn, hasTorch, canSwitchCamera, cameraSupported } = scanner;

  useEffect(() => {
    if (cameraActive && cameraSupported) void start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, cameraSupported]);

  const retry = useCallback(() => {
    setFailedCode(null);
    setPhase('scanning');
    lock.current = false;
    void start();
  }, [start]);

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const v = manual.trim();
    if (v) void resolve(v);
  };

  const permissionDenied = status === 'error' && error?.kind === 'permission-denied';
  const showCamera = cameraActive && cameraSupported && status !== 'unsupported' && !permissionDenied;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {!cameraActive && cameraSupported && (
        <Button variant="secondary" fullWidth leftIcon="qr" onClick={() => setCameraActive(true)}>
          Scan with camera
        </Button>
      )}
      {showCamera && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

          {/* Reticle */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-3/5 w-3/5 rounded-2xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.4)]" />
          </div>

          {/* Camera controls */}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            {hasTorch && (
              <button
                type="button"
                aria-pressed={torchOn}
                aria-label="Toggle flashlight"
                onClick={() => void toggleTorch()}
                className={cn('grid h-10 w-10 place-items-center rounded-full backdrop-blur', torchOn ? 'bg-white text-black' : 'bg-black/50 text-white')}
              >
                <Icon name="flame" className="h-5 w-5" />
              </button>
            )}
            {canSwitchCamera && (
              <button
                type="button"
                aria-label="Switch camera"
                onClick={() => void switchCamera()}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
              >
                <Icon name="refresh" className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Overlays */}
          {(status === 'starting' || phase === 'resolving') && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <div className="flex flex-col items-center gap-2 text-white">
                <Spinner className="text-white" />
                <span className="text-sm">{phase === 'resolving' ? 'Opening restaurant…' : 'Starting camera…'}</span>
              </div>
            </div>
          )}

          {(phase === 'invalid' || phase === 'expired' || phase === 'not_found') && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
              <div className="space-y-3 text-white">
                <Icon name={phase === 'expired' ? 'clock' : 'warning'} className="mx-auto h-9 w-9" />
                <p className="text-sm">
                  {phase === 'expired'
                    ? 'This QR code has expired. Ask staff for a fresh code.'
                    : phase === 'not_found'
                      ? "We couldn't find that restaurant."
                      : "That doesn't look like a valid Keventers QR."}
                </p>
                <Button size="sm" variant="secondary" leftIcon="refresh" onClick={retry}>
                  Scan again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {permissionDenied && (
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <Icon name="wifiOff" className="mx-auto h-8 w-8 text-warning" />
          <p className="mt-2 text-sm font-medium text-foreground">Camera access is off</p>
          <p className="mt-1 text-sm text-foreground-muted">Allow camera access to scan, or enter the code printed on your table below.</p>
          <Button size="sm" variant="ghost" leftIcon="refresh" className="mt-3" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {/* Manual entry — always available (fallback for no camera / denied / unsupported) */}
      <form onSubmit={submitManual} className="space-y-2">
        <label htmlFor="qr-manual" className="block text-sm font-medium text-foreground">
          Enter code manually
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="qr-manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="e.g. the code under the QR"
            aria-invalid={failedCode != null && manual === failedCode}
          />
          <Button type="submit" disabled={!manual.trim()} loading={phase === 'resolving'}>
            Go
          </Button>
        </div>
      </form>
    </div>
  );
}
