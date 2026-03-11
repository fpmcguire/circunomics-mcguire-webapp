import { describe, it, expect } from 'vitest';
import { formatDateForGithub, daysAgo, buildCreatedAfterQuery } from './github-query.utils';

describe('formatDateForGithub', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateForGithub(new Date('2024-03-05T10:00:00Z'))).toBe('2024-03-05');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatDateForGithub(new Date('2024-01-09T00:00:00Z'))).toBe('2024-01-09');
  });
});

describe('daysAgo', () => {
  it('returns a date exactly N days before the reference', () => {
    const ref = new Date('2024-03-15T12:00:00Z');
    const result = daysAgo(30, ref);
    expect(formatDateForGithub(result)).toBe('2024-02-14');
  });

  it('handles month boundaries correctly', () => {
    const ref = new Date('2024-03-01T00:00:00Z');
    const result = daysAgo(1, ref);
    expect(formatDateForGithub(result)).toBe('2024-02-29'); // 2024 is a leap year
  });

  it('handles year boundaries correctly', () => {
    const ref = new Date('2024-01-01T00:00:00Z');
    const result = daysAgo(1, ref);
    expect(formatDateForGithub(result)).toBe('2023-12-31');
  });
});

describe('buildCreatedAfterQuery', () => {
  it('returns a GitHub search query string for the given day range', () => {
    const ref = new Date('2024-03-15T00:00:00Z');
    expect(buildCreatedAfterQuery(30, ref)).toBe('created:>2024-02-14');
  });

  it('produces a different query for different day ranges', () => {
    const ref = new Date('2024-03-15T00:00:00Z');
    const q7 = buildCreatedAfterQuery(7, ref);
    const q30 = buildCreatedAfterQuery(30, ref);
    expect(q7).not.toBe(q30);
  });
});
