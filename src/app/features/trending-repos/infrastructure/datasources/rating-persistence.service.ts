import { Injectable } from '@angular/core';
import { RatingsMap } from '../../application/state/trending-repos.state';

const STORAGE_KEY = 'circunomics.repo-ratings';

/**
 * Persists repo star ratings to localStorage.
 *
 * Storage format: { [repoId: number]: starRating (1–5) }
 * Only rated repos are stored — unrated repos are not present in the map.
 *
 * Privacy: stores only numeric IDs and integer ratings. No repo names,
 * descriptions, or any PII are ever written to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class RatingPersistenceService {
  load(): RatingsMap {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw) as unknown;

      // Validate the parsed value is a plain object with numeric key/value pairs
      if (!this.isValidRatingsMap(parsed)) {
        // Corrupted storage — clear and start fresh rather than crashing
        localStorage.removeItem(STORAGE_KEY);
        return {};
      }

      return parsed;
    } catch {
      // JSON.parse failure or localStorage unavailable (private browsing restrictions)
      return {};
    }
  }

  save(ratings: RatingsMap): void {
    try {
      // Only persist repos that actually have a rating — keeps storage minimal
      const toStore: RatingsMap = {};
      for (const [id, rating] of Object.entries(ratings)) {
        if (rating > 0) {
          toStore[Number(id)] = rating;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // localStorage may be unavailable (quota exceeded, private browsing)
      // Fail silently — rating still works in-session via the signal
    }
  }

  setRating(repoId: number, stars: number): RatingsMap {
    const current = this.load();
    const updated = { ...current, [repoId]: stars };
    this.save(updated);
    return updated;
  }

  private isValidRatingsMap(value: unknown): value is RatingsMap {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return Object.entries(value as Record<string, unknown>).every(
      ([, v]) => typeof v === 'number' && v >= 1 && v <= 5,
    );
  }
}
