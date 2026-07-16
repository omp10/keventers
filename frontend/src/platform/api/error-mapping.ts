import { ApiError, type ApiErrorKind } from './types';

/** Map an HTTP status to a semantic error kind. */
export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Normalize any thrown value (fetch reject, abort, HTTP error body) → ApiError. */
export function toApiError(error: unknown, context?: { offline?: boolean }): ApiError {
  if (error instanceof ApiError) return error;
  if (context?.offline) return new ApiError({ message: 'You appear to be offline.', kind: 'offline', retryable: true });
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ message: 'Request cancelled or timed out.', kind: 'timeout' });
  }
  if (error instanceof TypeError) {
    // fetch throws TypeError for network failures / CORS.
    return new ApiError({ message: 'Network request failed.', kind: 'network' });
  }
  return new ApiError({ message: (error as Error)?.message ?? 'Unexpected error', kind: 'unknown' });
}

/** Build an ApiError from a non-2xx Response + parsed body. */
export function errorFromResponse(status: number, body: unknown): ApiError {
  const kind = kindForStatus(status);
  const b = body as { message?: string; error?: string; code?: string; details?: unknown } | null;
  return new ApiError({
    message: b?.message ?? b?.error ?? defaultMessage(kind, status),
    kind,
    status,
    code: b?.code,
    details: b?.details ?? body,
  });
}

function defaultMessage(kind: ApiErrorKind, status: number): string {
  switch (kind) {
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return "You don't have permission to do that.";
    case 'not_found':
      return 'The requested resource was not found.';
    case 'conflict':
      return 'This action conflicts with the current state.';
    case 'validation':
      return 'Please check the highlighted fields.';
    case 'rate_limited':
      return 'Too many requests. Please slow down.';
    case 'server':
      return 'Something went wrong on our end. Please try again.';
    default:
      return `Request failed (${status}).`;
  }
}
