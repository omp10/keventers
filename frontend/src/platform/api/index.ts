/** API PLATFORM — the single HTTP surface. Services + query hooks build on this. */
export { ApiClient, api } from './client';
export { ApiError } from './types';
export type {
  ApiEnvelope, Paginated, PaginationMeta, RequestConfig, HttpMethod, AuthAdapter,
  ApiErrorKind, RequestInterceptor, ResponseInterceptor, ErrorInterceptor,
} from './types';
export { toApiError, errorFromResponse, kindForStatus } from './error-mapping';
