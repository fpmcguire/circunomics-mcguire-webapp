/**
 * Utilities for building GitHub Search API query parameters.
 * Pure functions — injectable nowhere, testable everywhere.
 *
 * Date arithmetic uses UTC throughout to avoid timezone-dependent
 * off-by-one-day bugs when running across different environments or near midnight.
 */

/**
 * Formats a Date as YYYY-MM-DD using UTC values (GitHub API date format).
 */
export function formatDateForGithub(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes the date N days before a given reference date using UTC arithmetic.
 * Defaults to the current UTC time if no reference is provided.
 */
export function daysAgo(days: number, from: Date = new Date()): Date {
  // Operate on UTC midnight to guarantee consistent day boundaries
  const result = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

/**
 * Builds the GitHub Search API `q` parameter for repos created
 * within the last N days, e.g. "created:>2024-01-15"
 */
export function buildCreatedAfterQuery(days: number, from?: Date): string {
  const cutoff = daysAgo(days, from);
  return `created:>${formatDateForGithub(cutoff)}`;
}
