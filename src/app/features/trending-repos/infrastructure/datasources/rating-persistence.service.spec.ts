import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RatingPersistenceService } from './rating-persistence.service';

describe('RatingPersistenceService', () => {
  let service: RatingPersistenceService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    // Stub localStorage without touching the real browser storage
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
    service = new RatingPersistenceService();
  });

  it('returns an empty map when storage is empty', () => {
    expect(service.load()).toEqual({});
  });

  it('round-trips a ratings map through save and load', () => {
    const ratings = { 1: 4, 42: 5 };
    service.save(ratings);
    expect(service.load()).toEqual(ratings);
  });

  it('does not persist entries with rating 0', () => {
    service.save({ 1: 4, 2: 0 });
    const loaded = service.load();
    expect(loaded[1]).toBe(4);
    expect(loaded[2]).toBeUndefined();
  });

  it('clears corrupted storage and returns empty map', () => {
    store['circunomics.repo-ratings'] = 'not-valid-json{{';
    expect(service.load()).toEqual({});
  });

  it('clears structurally invalid storage (non-object value)', () => {
    store['circunomics.repo-ratings'] = JSON.stringify([1, 2, 3]);
    expect(service.load()).toEqual({});
  });

  it('clears storage with out-of-range rating values', () => {
    // Rating 6 is out of 1–5 range — should be treated as corrupted
    store['circunomics.repo-ratings'] = JSON.stringify({ 1: 6 });
    expect(service.load()).toEqual({});
  });

  it('setRating persists and returns the updated map', () => {
    const result = service.setRating(10, 3);
    expect(result[10]).toBe(3);
    expect(service.load()[10]).toBe(3);
  });

  it('setRating merges with existing ratings', () => {
    service.save({ 1: 5 });
    const result = service.setRating(2, 4);
    expect(result[1]).toBe(5);
    expect(result[2]).toBe(4);
  });
});
