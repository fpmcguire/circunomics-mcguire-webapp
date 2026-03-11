import { Observable } from 'rxjs';
import { GithubRepo } from '../models/github-repo.model';

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
 * Abstract repository contract for trending repositories.
 * Lives in the domain layer — infrastructure implements it, the
 * application facade depends on it.
 *
 * This seam is what makes the facade testable without HTTP:
 * swap the binding in TestBed providers to inject a mock.
 */
export abstract class TrendingReposRepository {
  abstract fetchTrendingRepos(query: TrendingReposQuery): Observable<TrendingReposPage>;
}
