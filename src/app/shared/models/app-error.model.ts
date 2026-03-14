/**
 * Typed error variants surfaced to the UI layer.
 * Keeping errors as a discriminated union makes exhaustive
 * handling straightforward and avoids stringly-typed error checks.
 */
export type AppErrorKind = 'network' | 'rateLimit' | 'notFound' | 'unknown';

export interface AppError {
  readonly kind: AppErrorKind;
  readonly message: string;
  /** Original HTTP status code if applicable */
  readonly statusCode?: number;
}

export const APP_ERRORS = {
  network: (): AppError => ({
    kind: 'network',
    message: 'Unable to reach GitHub. Check your connection and try again.',
  }),
  rateLimit: (): AppError => ({
    kind: 'rateLimit',
    message:
      'GitHub API rate limit reached. Wait a moment and try again, or add a GitHub token to increase your limit.',
    statusCode: 429,
  }),
  rateLimitForbidden: (): AppError => ({
    kind: 'rateLimit',
    message:
      'GitHub API rate limit reached (403). Try again retries immediately; if the limit is still active, wait a few minutes and retry, or add a GitHub token to increase your limit.',
    statusCode: 403,
  }),
  unknown: (statusCode?: number): AppError => ({
    kind: 'unknown',
    message:
      'GitHub request failed unexpectedly. Try again retries the last request immediately. If this persists, wait a few minutes and try again.',
    statusCode,
  }),
} as const;
