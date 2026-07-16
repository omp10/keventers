import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createDetector,
  hasMultipleCameras,
  isCameraSupported,
  isNativeScanSupported,
  openCameraStream,
  setStreamTorch,
  stopStream,
  streamHasTorch,
  ScanError,
  type CameraFacing,
  type ScanFormat,
  type ScanResult,
} from './barcode';

export type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'error' | 'unsupported';

/**
 * useScanner — drives a camera-based scan loop against a <video> element you own.
 * Attach `videoRef`, call `start()`, and receive decoded values via `onResult`.
 * Falls back cleanly (status 'unsupported') so callers can show manual entry.
 * Exposes torch + camera-switch controls (no-ops where unsupported), so a UI can
 * offer them without touching MediaStream APIs directly.
 */
export function useScanner(opts: { formats?: ScanFormat[]; onResult: (r: ScanResult) => void; scanIntervalMs?: number }) {
  const { formats = ['qr_code'], onResult, scanIntervalMs = 300 } = opts;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const facingRef = useRef<CameraFacing>('environment');
  const [status, setStatus] = useState<ScannerStatus>(isCameraSupported() ? 'idle' : 'unsupported');
  const [error, setError] = useState<ScanError | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) window.clearTimeout(rafRef.current);
    rafRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setStatus((s) => (s === 'error' || s === 'unsupported' ? s : 'idle'));
  }, []);

  const startWith = useCallback(
    async (facing: CameraFacing) => {
      if (!isCameraSupported()) {
        setStatus('unsupported');
        return;
      }
      setStatus('starting');
      setError(null);
      stopStream(streamRef.current);
      try {
        const stream = await openCameraStream(facing);
        streamRef.current = stream;
        facingRef.current = facing;
        setHasTorch(streamHasTorch(stream));
        void hasMultipleCameras().then(setCanSwitchCamera);
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play().catch(() => {});
        }
        const detector = await createDetector(formats);
        setStatus('scanning');

        const tick = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            if (detector && videoRef.current.readyState >= 2) {
              const found = await detector.detect(videoRef.current);
              if (found[0]) {
                onResult({ value: found[0].rawValue, format: found[0].format, rawBounds: found[0].boundingBox });
              }
            }
          } catch {
            /* transient decode error — keep scanning */
          }
          rafRef.current = window.setTimeout(tick, scanIntervalMs);
        };
        rafRef.current = window.setTimeout(tick, scanIntervalMs);
      } catch (e) {
        setError(e as ScanError);
        setStatus('error');
        stop();
      }
    },
    [formats, onResult, scanIntervalMs, stop],
  );

  const start = useCallback(() => startWith(facingRef.current), [startWith]);

  const toggleTorch = useCallback(async () => {
    const next = !torchOn;
    const applied = await setStreamTorch(streamRef.current, next);
    setTorchOn(applied);
  }, [torchOn]);

  const switchCamera = useCallback(async () => {
    facingRef.current = facingRef.current === 'environment' ? 'user' : 'environment';
    await startWith(facingRef.current);
  }, [startWith]);

  useEffect(() => () => stop(), [stop]);

  return {
    videoRef,
    status,
    error,
    start,
    stop,
    toggleTorch,
    switchCamera,
    torchOn,
    hasTorch,
    canSwitchCamera,
    facing: facingRef.current,
    nativeSupported: isNativeScanSupported(),
    cameraSupported: isCameraSupported(),
  };
}
