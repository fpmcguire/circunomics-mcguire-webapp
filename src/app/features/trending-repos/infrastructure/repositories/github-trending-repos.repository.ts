import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { GithubApiSearchResponse } from '../datasources/github-api.types';
import { mapApiRepo } from '../../domain/mappers/github-repo.mapper';
import {
  TrendingReposPage,
  TrendingReposQuery,
  TrendingReposRepository,
} from './trending-repos.repository';
import { buildCreatedAfterQuery } from '../../../../core/utils/github-query.utils';
import { AppError, APP_ERRORS } from '../../../../shared/models/app-error.model';
import { HttpErrorResponse } from '@angular/common/http';

const GITHUB_API_BASE = 'https://api.github.com/search/repositories';

@Injectable()
export class GithubTrendingReposRepository extends TrendingReposRepository {
  private readonly http = inject(HttpClient);

  /**
   * Cache of in-flight requests keyed by a canonical request string.
   * Prevents duplicate concurrent fetches for the same page.
   */
  private readonly inFlight = new Map<string, Observable<TrendingReposPage>>();

  override fetchTrendingRepos(query: TrendingReposQuery): Observable<TrendingReposPage> {
    const cacheKey = this.buildCacheKey(query);

    // Return the existing in-flight observable if one is already running
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
      // shareReplay ensures multiple subscribers get the same result
      // and cleans up the cache entry once the request completes
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.inFlight.set(cacheKey, request$);

    // Clean up the cache entry after completion or error
    request$.subscribe({
      complete: () => this.inFlight.delete(cacheKey),
      error: () => this.inFlight.delete(cacheKey),
    });

    return request$;
  }

  private mapResponse(
    response: GithubApiSearchResponse,
    query: TrendingReposQuery,
  ): TrendingReposPage {
    const repos = response.items.map(mapApiRepo);
    const fetchedSoFar = (query.page - 1) * query.perPage + repos.length;
    const isLastPage = repos.length < query.perPage || fetchedSoFar >= response.total_count;

    return { repos, totalCount: response.total_count, isLastPage };
  }

  private mapError(error: HttpErrorResponse): AppError {
    if (error.status === 0) {
      // status 0 = network failure / CORS / no connection
      return APP_ERRORS.network();
    }
    if (error.status === 429) {
      return APP_ERRORS.rateLimit();
    }
    if (error.status === 403) {
      // GitHub returns 403 when the unauthenticated rate limit is exhausted
      const isRateLimit =
        typeof error.error === 'object' &&
        error.error !== null &&
        'message' in error.error &&
        String(error.error['message']).toLowerCase().includes('rate limit');

      return isRateLimit ? APP_ERRORS.rateLimitForbidden() : APP_ERRORS.unknown(403);
    }
    return APP_ERRORS.unknown(error.status);
  }

  private buildCacheKey(query: TrendingReposQuery): string {
    return `${query.page}:${query.perPage}:${query.dayRange}`;
  }
}
