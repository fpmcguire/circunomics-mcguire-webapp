/**
 * Utilities for building GitHub Search API query parameters.
 * Pure functions — injectable nowhere, testable everywhere.
 */

/**
 * Formats a Date as YYYY-MM-DD (GitHub API date format).
 */
export function formatDateForGithub(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes the date N days before a given reference date.
 * Defaults to today if no reference is provided.
 */
export function daysAgo(days: number, from: Date = new Date()): Date {
  const result = new Date(from);
  result.setDate(result.getDate() - days);
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
