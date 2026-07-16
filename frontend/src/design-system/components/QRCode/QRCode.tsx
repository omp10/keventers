import QRCodeLib from 'qrcode';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { Mark } from '@/assets';
import { Spinner } from '@/design-system/components/Spinner';

export type QRCodeProps = {
  value: string;
  size?: number;
  /** Show the brand mark in the center (a "logo QR"). */
  withLogo?: boolean;
  className?: string;
  /** ECC level — H needed if withLogo (logo occludes modules). */
  level?: 'L' | 'M' | 'Q' | 'H';
  'aria-label'?: string;
};

/**
 * QRCode — renders a QR (table/menu links) to canvas via `qrcode`. Themed to the
 * foreground/surface colors so it inverts correctly in dark mode, with an
 * optional centered brand mark. Redraws on value/scheme change.
 */
export function QRCode({ value, size = 200, withLogo, className, level = withLogo ? 'H' : 'M', ...aria }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    // Read the live theme colors so the QR matches light/dark.
    const styles = getComputedStyle(document.documentElement);
    const dark = styles.getPropertyValue('--kv-color-foreground').trim() || '#111111';
    const light = styles.getPropertyValue('--kv-color-surface').trim() || '#ffffff';
    QRCodeLib.toCanvas(canvas, value, { width: size, margin: 1, errorCorrectionLevel: level, color: { dark, light } })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, [value, size, level]);

  return (
    <div className={cn('relative inline-grid place-items-center rounded-xl bg-surface p-3', className)} style={{ width: size + 24, height: size + 24 }}>
      {!ready && <Spinner className="absolute" />}
      <canvas ref={canvasRef} width={size} height={size} role="img" aria-label={aria['aria-label'] ?? 'QR code'} className={cn('rounded-md transition-opacity', ready ? 'opacity-100' : 'opacity-0')} />
      {withLogo && ready && (
        <span className="absolute grid place-items-center rounded-lg bg-surface p-1 shadow-sm">
          <Mark size={size * 0.22} />
        </span>
      )}
    </div>
  );
}
