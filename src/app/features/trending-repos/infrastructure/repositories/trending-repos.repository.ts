import { Observable } from 'rxjs';
import { GithubRepo } from '../../domain/models/github-repo.model';

export interface TrendingReposPage {
  readonly repos: GithubRepo[];
  readonly totalCount: number;
  /** True when the API indicates there are no more pages to fetch */
  readonly isLastPage: boolean;
}

export interface TrendingReposQuery {
  readonly page: number;
  readonly perPage: number;
  readonly dayRange: number;
}

/**
 * Abstract repository interface for trending repositories.
 * The facade depends on this token, not the concrete implementation —
 * making it trivial to swap in a mock for tests.
 */
export abstract class TrendingReposRepository {
  abstract fetchTrendingRepos(query: TrendingReposQuery): Observable<TrendingReposPage>;
}
