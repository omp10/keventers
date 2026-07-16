import { useEffect, useState, type FormEvent } from 'react';

import { Button, Icon, Input, Spinner } from '@/design-system';
import { cn } from '@/lib/cn';
import { useScanner } from './useScanner';
import type { ScanFormat, ScanResult } from './barcode';

export type ScannerViewProps = {
  onScan: (result: ScanResult) => void;
  formats?: ScanFormat[];
  className?: string;
  /** Show the manual-entry fallback field. Default true. */
  allowManual?: boolean;
  manualLabel?: string;
  autoStart?: boolean;
};

/**
 * ScannerView — the reusable camera scanner surface with a reticle overlay and a
 * manual-entry fallback. Wraps `useScanner`; pages just handle `onScan`. Works on
 * devices without BarcodeDetector/camera by exposing manual entry.
 */
export function ScannerView({ onScan, formats = ['qr_code'], className, allowManual = true, manualLabel = 'Enter code manually', autoStart = true }: ScannerViewProps) {
  const [manual, setManual] = useState('');
  const { videoRef, status, error, start, stop, cameraSupported } = useScanner({ formats, onResult: onScan });

  useEffect(() => {
    if (autoStart && cameraSupported) void start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, cameraSupported]);

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const value = manual.trim();
    if (value) onScan({ value, format: 'manual' });
  };

  const showCamera = cameraSupported && status !== 'unsupported';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {showCamera && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {/* Reticle */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-3/5 w-3/5 rounded-2xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" />
          </div>
          {status === 'starting' && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <Spinner className="text-white" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 p-6 text-center">
              <div className="space-y-3 text-white">
                <Icon name="wifiOff" className="mx-auto h-8 w-8" />
                <p className="text-sm">{error?.message ?? 'Unable to access the camera.'}</p>
                <Button size="sm" variant="secondary" onClick={() => void start()}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {allowManual && (
        <form onSubmit={submitManual} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{manualLabel}</label>
            <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="e.g. TABLE-12 or a code" inputMode="text" />
          </div>
          <Button type="submit" disabled={!manual.trim()}>
            <Icon name="check" className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
