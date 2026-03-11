import { computed, inject, Injectable, signal } from '@angular/core';

import { TrendingReposRepository } from '../../domain/repositories/trending-repos.repository';
import { GithubRepo } from '../../domain/models/github-repo.model';
import { AppError } from '../../../../shared/models/app-error.model';
import { RatingPersistenceService } from '../../infrastructure/datasources/rating-persistence.service';
import { INITIAL_STATE, RatingsMap, TrendingReposState } from '../state/trending-repos.state';

/** Number of repos requested per page from the GitHub API. */
const PER_PAGE = 100;

/** Look back this many days when querying the GitHub API. */
const DAY_RANGE = 30;

/**
 * TrendingReposFacade — the single orchestration point for the trending repos feature.
 *
 * Responsibilities:
 *  - Load and paginate trending repos from the repository
 *  - Expose reactive state via signals (consumed directly by components)
 *  - Manage rating state and sync it with localStorage
 *
 * Components never call the repository or persistence service directly.
 * All feature state flows through this facade.
 */
@Injectable()
export class TrendingReposFacade {
  private readonly repository = inject(TrendingReposRepository);
  private readonly persistence = inject(RatingPersistenceService);

  // --- Private mutable state ---

  private readonly _state = signal<TrendingReposState>(INITIAL_STATE);
  private readonly _ratings = signal<RatingsMap>(this.persistence.load());

  /**
   * Guard against concurrent page fetches.
   * Set to true while a request is in-flight; cleared on completion or error.
   */
  private isFetching = false;

  // --- Public read-only signals ---

  readonly repos = computed(() => this._state().repos);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly isLoadingMore = computed(() => this._state().isLoadingMore);
  readonly error = computed(() => this._state().error);
  readonly hasMore = computed(() => this._state().hasMore);
  readonly totalCount = computed(() => this._state().totalCount);
  readonly ratings = computed(() => this._ratings());

  /** True when the initial load is done, there are no errors, and the list is empty. */
  readonly isEmpty = computed(
    () =>
      !this._state().isLoading && this._state().error === null && this._state().repos.length === 0,
  );

  // --- Actions ---

  /**
   * Load the first page of trending repos.
   * Safe to call multiple times — will not re-fetch if already loading or data is present.
   */
  loadInitial(): void {
    if (this.isFetching || this._state().repos.length > 0) return;
    this._patch({ isLoading: true, error: null });
    this._fetchPage(1);
  }

  /**
   * Load the next page of results.
   * No-ops if already loading, fetching, or there are no more pages.
   */
  loadNextPage(): void {
    const state = this._state();
    if (this.isFetching || !state.hasMore || state.isLoading) return;
    const nextPage = state.currentPage + 1;
    this._patch({ isLoadingMore: true, error: null });
    this._fetchPage(nextPage);
  }

  /**
   * Retry after an error. Resets error state and attempts the failed page again.
   * Retries the initial load if no pages have loaded yet, otherwise loads the next page.
   */
  retry(): void {
    const state = this._state();
    this._patch({ error: null });

    if (state.repos.length === 0) {
      this._patch({ isLoading: true });
      this._fetchPage(1);
    } else {
      this._patch({ isLoadingMore: true });
      this._fetchPage(state.currentPage + 1);
    }
  }

  /**
   * Set a star rating for a repository.
   * Updates the in-memory signal and persists to localStorage immediately.
   */
  setRating(repoId: number, stars: number): void {
    const updated = this.persistence.setRating(repoId, stars);
    this._ratings.set(updated);
  }

  /**
   * Get the current rating for a repository. Returns 0 if unrated.
   */
  getRating(repoId: number): number {
    return this._ratings()[repoId] ?? 0;
  }

  // --- Private helpers ---

  private _fetchPage(page: number): void {
    this.isFetching = true;

    this.repository.fetchTrendingRepos({ page, perPage: PER_PAGE, dayRange: DAY_RANGE }).subscribe({
      next: (result) => {
        this.isFetching = false;

        // Merge new repos with existing ones, deduplicating by ID
        const existing = this._state().repos;
        const merged = this._mergeRepos(existing, result.repos);

        this._patch({
          repos: merged,
          totalCount: result.totalCount,
          currentPage: page,
          hasMore: !result.isLastPage,
          isLoading: false,
          isLoadingMore: false,
          error: null,
        });
      },
      error: (err: AppError) => {
        this.isFetching = false;
        this._patch({
          isLoading: false,
          isLoadingMore: false,
          error: err,
        });
      },
    });
  }

  /**
   * Merges two repo arrays, deduplicating by ID.
   * New repos that already exist in the current list (by ID) are skipped.
   * This guards against edge cases where the same page is loaded twice.
   */
  private _mergeRepos(existing: GithubRepo[], incoming: GithubRepo[]): GithubRepo[] {
    const existingIds = new Set(existing.map((r) => r.id));
    const newRepos = incoming.filter((r) => !existingIds.has(r.id));
    return [...existing, ...newRepos];
  }

  /**
   * Immutable partial state update — merges the patch into the current state.
   */
  private _patch(patch: Partial<TrendingReposState>): void {
    this._state.update((current) => ({ ...current, ...patch }));
  }
}
