import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay } from 'rxjs/operators';

import { GithubApiSearchResponse } from '../datasources/github-api.types';
import { mapApiRepo } from '../../domain/mappers/github-repo.mapper';
import {
  TrendingReposPage,
  TrendingReposQuery,
  TrendingReposRepository,
} from '../../domain/repositories/trending-repos.repository';
import { buildCreatedAfterQuery } from '../../../../core/utils/github-query.utils';
import { AppError, APP_ERRORS } from '../../../../shared/models/app-error.model';

const GITHUB_API_BASE = 'https://api.github.com/search/repositories';

@Injectable()
export class GithubTrendingReposRepository extends TrendingReposRepository {
  private readonly http = inject(HttpClient);

  /**
   * Cache of in-flight requests keyed by a canonical request string.
   * Prevents duplicate concurrent fetches for the same page.
   * Cleaned up via finalize() in the stream — not via internal subscriptions.
   */
  private readonly inFlight = new Map<string, Observable<TrendingReposPage>>();

  override fetchTrendingRepos(query: TrendingReposQuery): Observable<TrendingReposPage> {
    const cacheKey = this.buildCacheKey(query);

    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const params = new HttpParams()
      .set('q', buildCreatedAfterQuery(query.dayRange))
      .set('sort', 'stars')
      .set('order', 'desc')
      .set('page', query.page.toString())
      .set('per_page', query.perPage.toString());

    const request$ = this.http.get<GithubApiSearchResponse>(GITHUB_API_BASE, { params }).pipe(
      map((response) => this.mapResponse(response, query)),
      catchError((error: HttpErrorResponse) => throwError(() => this.mapError(error))),
      // Clean up the in-flight cache entry when the stream completes or errors.
      // Using finalize() keeps cache lifecycle inside the stream — avoids a
      // separate internal subscribe() just for side effects.
      finalize(() => this.inFlight.delete(cacheKey)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.inFlight.set(cacheKey, request$);
    return request$;
  }

  private mapResponse(
    response: GithubApiSearchResponse,
    query: TrendingReposQuery,
  ): TrendingReposPage {
    // Guard: validate the response shape before attempting to map.
    // GitHub occasionally returns unexpected shapes on degraded API responses.
    if (!this.isValidResponse(response)) {
      throw APP_ERRORS.unknown();
    }

    const repos = response.items.map(mapApiRepo);
    const totalCount = response.total_count;

    // Explicit empty-result check: zero items is a valid, meaningful outcome —
    // not an error. The facade uses isLastPage + repos.length === 0 to show
    // the empty state rather than an error state.
    if (repos.length === 0) {
      return { repos: [], totalCount, isLastPage: true };
    }

    const fetchedSoFar = (query.page - 1) * query.perPage + repos.length;
    const isLastPage = repos.length < query.perPage || fetchedSoFar >= totalCount;

    return { repos, totalCount, isLastPage };
  }

  /**
   * Guards against malformed API responses before mapping begins.
   * Returns false if the response is missing required fields or has unexpected types.
   */
  private isValidResponse(response: unknown): response is GithubApiSearchResponse {
    if (typeof response !== 'object' || response === null) return false;
    const r = response as Record<string, unknown>;
    if (!Array.isArray(r['items'])) return false;
    if (typeof r['total_count'] !== 'number') return false;
    return true;
  }

  private mapError(error: HttpErrorResponse): AppError {
    // status 0 = network failure, CORS error, or no connection
    if (error.status === 0) {
      return APP_ERRORS.network();
    }
    if (error.status === 429) {
      return APP_ERRORS.rateLimit();
    }
    if (error.status === 403) {
      // GitHub returns 403 for rate-limit exhaustion on unauthenticated requests.
      // Check the message to distinguish it from a genuine 403 auth/permission error.
      const isRateLimit =
        typeof error.error === 'object' &&
        error.error !== null &&
        'message' in error.error &&
        String((error.error as Record<string, unknown>)['message'])
          .toLowerCase()
          .includes('rate limit');

      return isRateLimit ? APP_ERRORS.rateLimitForbidden() : APP_ERRORS.unknown(403);
    }
    return APP_ERRORS.unknown(error.status);
  }

  private buildCacheKey(query: TrendingReposQuery): string {
    return `${query.page}:${query.perPage}:${query.dayRange}`;
  }
}
