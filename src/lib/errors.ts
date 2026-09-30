// src/lib/errors.ts
// Structured JSON error helpers for API route handlers.
// All error responses follow the ApiError envelope so clients can
// handle them uniformly without parsing raw strings.

export type ApiError = {
  /** Human-readable summary shown in the UI. */
  error: string;
  /** Field-level validation messages keyed by field name. */
  fields?: Record<string, string>;
  /** Optional machine-readable error code for programmatic handling. */
  code?: string;
};

/**
 * Returns a Next.js Response with a JSON ApiError body.
 *
 * @example
 * return apiError(422, 'Validation failed', { email: 'Invalid email address' });
 */
export function apiError(
  status: number,
  message: string,
  fields?: Record<string, string>,
  code?: string
): Response {
  const body: ApiError = {
    error: message,
    ...(fields && Object.keys(fields).length > 0 && { fields }),
    ...(code && { code }),
  };
  return Response.json(body, { status });
}

/**
 * Convenience wrapper for 401 Unauthorized.
 */
export function apiUnauthorized(): Response {
  return apiError(401, 'Unauthorized', undefined, 'UNAUTHORIZED');
}

/**
 * Convenience wrapper for 403 Forbidden.
 */
export function apiForbidden(): Response {
  return apiError(403, 'Forbidden', undefined, 'FORBIDDEN');
}

/**
 * Convenience wrapper for 500 Internal Server Error.
 * Never exposes internal stack traces to the client.
 */
export function apiInternalError(context?: string): Response {
  if (context) {
    // Log server-side only — never sent to the client
    console.error('[apiInternalError]', context);
  }
  return apiError(500, 'An unexpected error occurred. Please try again.', undefined, 'INTERNAL_ERROR');
}
