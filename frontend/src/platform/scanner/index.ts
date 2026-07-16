export {
  isNativeScanSupported,
  isCameraSupported,
  createDetector,
  openCameraStream,
  stopStream,
  streamHasTorch,
  setStreamTorch,
  hasMultipleCameras,
  ScanError,
} from './barcode';
export type { ScanFormat, ScanResult, ScanErrorKind, CameraFacing } from './barcode';
export { useScanner } from './useScanner';
export type { ScannerStatus } from './useScanner';
export { ScannerView } from './ScannerView';
export type { ScannerViewProps } from './ScannerView';
