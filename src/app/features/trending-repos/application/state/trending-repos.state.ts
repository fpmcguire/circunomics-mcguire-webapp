import { GithubRepo } from '../../domain/models/github-repo.model';
import { AppError } from '../../../../shared/models/app-error.model';

/**
 * Immutable snapshot of the trending repos feature state.
 * The facade holds this as a signal and derives computed values from it.
 */
export interface TrendingReposState {
  readonly repos: GithubRepo[];
  readonly totalCount: number;
  readonly currentPage: number;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly error: AppError | null;
}

export const INITIAL_STATE: TrendingReposState = {
  repos: [],
  totalCount: 0,
  currentPage: 0,
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  error: null,
};

/**
 * Keyed by repo ID. Value is 1–5 stars, or 0 for unrated (unrated entries
 * are not persisted — only rated repos are written to localStorage).
 */
export type RatingsMap = Record<number, number>;
