export {
  getCurrentPosition,
  watchPosition,
  queryPermission,
  isGeolocationSupported,
  distanceMeters,
  GeoError,
} from './geolocation';
export type { Coordinates, GeoErrorKind, GeoPermission } from './geolocation';
export { useLocation } from './useLocation';
export type { LocationStatus } from './useLocation';
