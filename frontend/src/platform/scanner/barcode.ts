/**
 * SCANNER PLATFORM — QR/barcode scanning abstracted behind one API. Uses the
 * native `BarcodeDetector` when available, degrades to manual entry otherwise.
 * Components use `useScanner`/`ScannerView`; they never touch getUserMedia or the
 * detector directly.
 */
export type ScanFormat = 'qr_code' | 'ean_13' | 'ean_8' | 'code_128' | 'code_39' | 'upc_a' | 'upc_e';

export type ScanResult = { value: string; format: string; rawBounds?: DOMRectReadOnly };

// Minimal ambient shape for the experimental BarcodeDetector API.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string; format: string; boundingBox?: DOMRectReadOnly }>>;
};
type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function getDetectorCtor(): BarcodeDetectorCtor | null {
  const w = globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

export function isNativeScanSupported(): boolean {
  return getDetectorCtor() !== null;
}

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export async function createDetector(formats: ScanFormat[] = ['qr_code']): Promise<BarcodeDetectorLike | null> {
  const Ctor = getDetectorCtor();
  if (!Ctor) return null;
  try {
    return new Ctor({ formats });
  } catch {
    return new Ctor();
  }
}

export type CameraFacing = 'environment' | 'user';

/** Request a camera stream (rear by default). Throws a typed reason on denial/absence. */
export async function openCameraStream(facing: CameraFacing = 'environment'): Promise<MediaStream> {
  if (!isCameraSupported()) throw new ScanError('unsupported', 'Camera is not available on this device.');
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new ScanError('permission-denied', 'Camera permission was denied.');
    if (name === 'NotFoundError') throw new ScanError('no-camera', 'No camera was found.');
    throw new ScanError('unavailable', (e as Error).message);
  }
}

/** Whether the stream's video track advertises a controllable torch (flashlight). */
export function streamHasTorch(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== 'function') return false;
  return Boolean((track.getCapabilities() as { torch?: boolean }).torch);
}

/** Toggle the torch on a stream's video track. Returns the applied state (false if unsupported). */
export async function setStreamTorch(stream: MediaStream | null, on: boolean): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];
  if (!track || !streamHasTorch(stream)) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    return on;
  } catch {
    return false;
  }
}

/** Is a second (front/back) camera available to switch to? */
export async function hasMultipleCameras(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
}

export type ScanErrorKind = 'permission-denied' | 'no-camera' | 'unsupported' | 'unavailable';
export class ScanError extends Error {
  kind: ScanErrorKind;
  constructor(kind: ScanErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'ScanError';
    this.kind = kind;
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}
