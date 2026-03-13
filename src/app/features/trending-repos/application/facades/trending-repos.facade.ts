import { computed, inject, Injectable, signal } from '@angular/core';

import { TrendingReposRepository } from '../../domain/repositories/trending-repos.repository';
import { GithubRepo } from '../../domain/models/github-repo.model';
import { AppError } from '../../../../shared/models/app-error.model';
import { RatingPersistenceService } from '../../infrastructure/datasources/rating-persistence.service';
import { INITIAL_STATE, RatingsMap, TrendingReposState } from '../state/trending-repos.state';
import {
  DEFAULT_DISPLAY_MODE,
  RepoListDisplayMode,
} from '../../domain/models/repo-list-display-mode.model';

/** Number of repos requested per GitHub API page. */
const API_PER_PAGE = 100;

/** Look back this many days when querying the GitHub API. */
const DAY_RANGE = 30;

/**
 * Number of repos visible per UI page in **paginated** mode.
 *
 * Terminology:
 *  - **API page**     — a batch of up to API_PER_PAGE repos fetched from GitHub.
 *  - **UI page**      — a visible slice of PAGE_SIZE repos; only relevant in paginated mode.
 *  - **display mode** — whether the user is browsing via infinite scroll or pagination.
 *
 * A single API page fills many UI pages. UI pages are derived from the in-memory
 * repo cache; additional API pages are fetched on demand when the user advances
 * beyond what is already loaded.
 */
const PAGE_SIZE = 10;

/**
 * TrendingReposFacade — the single orchestration point for the trending repos feature.
 *
 * Provided in TrendingReposPageComponent so its lifecycle is tied to the page, not
 * the application root.
 *
 * Responsibilities:
 *  - Load and paginate trending repos via the repository abstraction
 *  - Expose reactive state as read-only computed signals
 *  - Manage display mode (infinite scroll vs paginated)
 *  - Manage UI pagination (visible page / slice) independently of API pagination
 *  - Manage rating state and sync with localStorage via RatingPersistenceService
 *
 * Components bind to signals only — they never call the repository or
 * persistence service directly.
 */
@Injectable()
export class TrendingReposFacade {
  private readonly repository = inject(TrendingReposRepository);
  private readonly persistence = inject(RatingPersistenceService);

  // --- Private mutable state ---

  private readonly _state = signal<TrendingReposState>(INITIAL_STATE);
  private readonly _ratings = signal<RatingsMap>(this.persistence.load());
  private readonly _displayMode = signal<RepoListDisplayMode>(DEFAULT_DISPLAY_MODE);

  /**
   * Current UI page number (1-indexed). Only meaningful in paginated mode.
   * Separate from the API page counter — one API page covers many UI pages.
   */
  private readonly _uiPage = signal(1);

  /**
   * UI page to advance to once an in-flight API fetch completes.
   * Set by goToNextPage() when a fetch is needed; cleared in the fetch handler.
   */
  private _pendingUiPage: number | null = null;

  /**
   * Guard against concurrent page fetches.
   * Set to true while a request is in-flight; cleared on completion or error.
   */
  private isFetching = false;

  /**
   * Tracks the API page number of the most recent fetch attempt.
   * Used by retry() to deterministically replay the failed request.
   */
  private _lastAttemptedPage = 0;

  // --- Public read-only signals ---

  readonly repos = computed(() => this._state().repos);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly isLoadingMore = computed(() => this._state().isLoadingMore);
  readonly error = computed(() => this._state().error);
  readonly hasMore = computed(() => this._state().hasMore);
  readonly totalCount = computed(() => this._state().totalCount);
  readonly currentPage = computed(() => this._state().currentPage);
  readonly ratings = computed(() => this._ratings());

  /** True when the initial load is done, there are no errors, and the list is empty. */
  readonly isEmpty = computed(
    () =>
      !this._state().isLoading && this._state().error === null && this._state().repos.length === 0,
  );

  // --- Display mode signals ---

  /** The current list-browsing display mode. */
  readonly displayMode = this._displayMode.asReadonly();

  /**
   * True when pagination controls (Previous / Next) should be shown.
   * Only applicable in paginated mode.
   */
  readonly showPaginationControls = computed(() => this._displayMode() === 'paginated');

  /**
   * True when the infinite-scroll sentinel should be rendered.
   * Only applicable in infinite mode, and only while there is more data to load.
   */
  readonly showInfiniteSentinel = computed(() => {
    const state = this._state();
    return (
      this._displayMode() === 'infinite' &&
      state.hasMore &&
      !state.isLoading &&
      !state.isLoadingMore
    );
  });

  // --- UI pagination signals (paginated mode) ---

  /** Current 1-indexed UI page number. */
  readonly visiblePage = this._uiPage.asReadonly();

  /** The configured page size (constant; exposed for templates and tests). */
  readonly pageSize = PAGE_SIZE;

  /**
   * The repos to display to the user.
   *
   *  - **paginated mode**: a PAGE_SIZE slice of the loaded repo cache.
   *  - **infinite mode**: the full accumulated list of loaded repos.
   */
  readonly visibleRepos = computed(() => {
    if (this._displayMode() === 'infinite') {
      return this._state().repos;
    }
    const start = (this._uiPage() - 1) * PAGE_SIZE;
    return this._state().repos.slice(start, start + PAGE_SIZE);
  });

  /** 1-indexed position of the first repo on the current UI page (0 when list is empty). */
  readonly visibleRangeStart = computed(() => {
    if (this._state().repos.length === 0) return 0;
    return (this._uiPage() - 1) * PAGE_SIZE + 1;
  });

  /** 1-indexed position of the last repo on the current UI page. */
  readonly visibleRangeEnd = computed(() => {
    const end = this._uiPage() * PAGE_SIZE;
    return Math.min(end, this._state().repos.length);
  });

  /** Total number of repos loaded from the API so far. */
  readonly totalLoaded = computed(() => this._state().repos.length);

  /**
   * True when the user can advance to the next UI page (paginated mode).
   * Requires either already-loaded data for the next page, or more API pages
   * available to fetch. Disabled while any fetch is in-flight.
   */
  readonly canGoNext = computed(() => {
    const state = this._state();
    if (state.isLoading || state.isLoadingMore) return false;
    const nextPageStartIndex = this._uiPage() * PAGE_SIZE;
    return nextPageStartIndex < state.repos.length || state.hasMore;
  });

  /** True when the user can go back to a previous UI page (paginated mode). */
  readonly canGoPrevious = computed(() => this._uiPage() > 1);

  // --- Actions ---

  /**
   * Switch the list-browsing display mode.
   *
   * Switching to paginated resets the UI page to 1 so the user starts at the
   * beginning of the loaded set. Switching to infinite has no page-state side
   * effects — the full loaded list is shown immediately.
   */
  setDisplayMode(mode: RepoListDisplayMode): void {
    this._displayMode.set(mode);
    if (mode === 'paginated') {
      this._uiPage.set(1);
    }
  }

  /**
   * Load the first page of trending repos.
   * No-ops if a fetch is already in-flight or repos have already been loaded.
   */
  loadInitial(): void {
    if (this.isFetching || this._state().repos.length > 0) return;
    this._patch({ isLoading: true, error: null });
    this._fetchPage(1);
  }

  /**
   * Load the next API page of repos (infinite scroll mode).
   *
   * Delegates to `_triggerNextApiPage` which carries all in-flight and
   * boundary guards. No-ops if already fetching, no more pages, or initial
   * load is still running.
   */
  loadMore(): void {
    this._triggerNextApiPage();
  }

  /**
   * Advance to the next UI page (paginated mode).
   *
   * If the required data is already in the in-memory cache, the page advances
   * instantly. If not, an API fetch is triggered and the page advances only
   * after the fetch completes — the current page remains visible during loading.
   */
  goToNextPage(): void {
    if (!this.canGoNext()) return;
    const nextUiPage = this._uiPage() + 1;
    const nextPageStartIndex = this._uiPage() * PAGE_SIZE;

    if (nextPageStartIndex < this._state().repos.length) {
      this._uiPage.set(nextUiPage);
    } else {
      this._pendingUiPage = nextUiPage;
      this._triggerNextApiPage();
    }
  }

  /**
   * Go back to the previous UI page (paginated mode).
   * No-ops on page 1.
   */
  goToPreviousPage(): void {
    if (!this.canGoPrevious()) return;
    this._uiPage.update((p) => p - 1);
  }

  /**
   * Retry after an error.
   * Replays the exact API page that failed, using the recorded _lastAttemptedPage.
   * If no page was ever attempted, defaults to page 1.
   */
  retry(): void {
    const pageToRetry = this._lastAttemptedPage || 1;
    const isInitialRetry = this._state().repos.length === 0;

    this._patch({
      error: null,
      isLoading: isInitialRetry,
      isLoadingMore: !isInitialRetry,
    });
    this._fetchPage(pageToRetry);
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

  /**
   * Trigger the next API page fetch.
   * No-ops if already fetching, there are no more pages, or initial load is running.
   */
  private _triggerNextApiPage(): void {
    const state = this._state();
    if (this.isFetching || !state.hasMore || state.isLoading) return;
    const nextApiPage = state.currentPage + 1;
    this._patch({ isLoadingMore: true, error: null });
    this._fetchPage(nextApiPage);
  }

  private _fetchPage(page: number): void {
    this.isFetching = true;
    this._lastAttemptedPage = page;

    this.repository
      .fetchTrendingRepos({ page, perPage: API_PER_PAGE, dayRange: DAY_RANGE })
      .subscribe({
        next: (result) => {
          this.isFetching = false;

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

          if (this._pendingUiPage !== null) {
            this._uiPage.set(this._pendingUiPage);
            this._pendingUiPage = null;
          }
        },
        error: (err: AppError) => {
          this.isFetching = false;
          this._pendingUiPage = null;

          const hasLoadedRepos = this._state().repos.length > 0;
          if (hasLoadedRepos) {
            // A later-page failure should not collapse the already loaded list
            // into a global error screen. Keep current data interactive and
            // stop requesting additional pages.
            this._patch({
              isLoading: false,
              isLoadingMore: false,
              hasMore: false,
              error: null,
            });
            return;
          }

          this._patch({
            isLoading: false,
            isLoadingMore: false,
            error: err,
          });
        },
      });
  }

  private _mergeRepos(existing: GithubRepo[], incoming: GithubRepo[]): GithubRepo[] {
    const existingIds = new Set(existing.map((r) => r.id));
    return [...existing, ...incoming.filter((r) => !existingIds.has(r.id))];
  }

  private _patch(patch: Partial<TrendingReposState>): void {
    this._state.update((current) => ({ ...current, ...patch }));
  }
}
