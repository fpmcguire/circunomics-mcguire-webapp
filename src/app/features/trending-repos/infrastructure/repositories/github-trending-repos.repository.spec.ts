import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GithubTrendingReposRepository } from './github-trending-repos.repository';
import { GithubApiSearchResponse } from '../datasources/github-api.types';

const mockOwner = {
  id: 10,
  login: 'user',
  avatar_url: 'https://avatars.githubusercontent.com/u/10',
  html_url: 'https://github.com/user',
};

const makeResponse = (
  items: GithubApiSearchResponse['items'],
  total_count = items.length,
): GithubApiSearchResponse => ({ total_count, incomplete_results: false, items });

const mockItem = {
  id: 1,
  name: 'repo-one',
  full_name: 'user/repo-one',
  description: 'First repo',
  html_url: 'https://github.com/user/repo-one',
  stargazers_count: 5000,
  open_issues_count: 12,
  created_at: '2024-02-01T00:00:00Z',
  owner: mockOwner,
};

describe('GithubTrendingReposRepository', () => {
  let repo: GithubTrendingReposRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), GithubTrendingReposRepository],
    });
    repo = TestBed.inject(GithubTrendingReposRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // --- Happy path ---

  it('fetches repos and maps them to the domain model', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe((page) => {
      expect(page.repos).toHaveLength(1);
      expect(page.repos[0].name).toBe('repo-one');
      expect(page.repos[0].stars).toBe(5000);
      expect(page.repos[0].owner.login).toBe('user');
    });

    const req = httpMock.expectOne((r) => r.url.includes('api.github.com'));
    expect(req.request.params.get('sort')).toBe('stars');
    expect(req.request.params.get('order')).toBe('desc');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(makeResponse([mockItem]));
    httpMock.verify();
  });

  it('marks isLastPage true when fewer items than perPage are returned', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe((page) => {
      expect(page.isLastPage).toBe(true); // 1 item, perPage = 30
    });

    httpMock.expectOne((r) => r.url.includes('api.github.com')).flush(makeResponse([mockItem]));
    httpMock.verify();
  });

  it('marks isLastPage false when a full page is returned with more total', () => {
    const items = Array.from({ length: 2 }, (_, i) => ({ ...mockItem, id: i + 1 }));
    repo.fetchTrendingRepos({ page: 1, perPage: 2, dayRange: 30 }).subscribe((page) => {
      expect(page.isLastPage).toBe(false);
    });

    httpMock.expectOne((r) => r.url.includes('api.github.com')).flush(makeResponse(items, 10));
    httpMock.verify();
  });

  // --- Empty results ---

  it('returns an empty page with isLastPage true when items array is empty', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe((page) => {
      expect(page.repos).toHaveLength(0);
      expect(page.isLastPage).toBe(true);
      expect(page.totalCount).toBe(0);
    });

    httpMock.expectOne((r) => r.url.includes('api.github.com')).flush(makeResponse([], 0));
    httpMock.verify();
  });

  // --- Error mapping ---

  it('maps a 429 HTTP error to a rateLimit AppError', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe({
      error: (err) => {
        expect(err.kind).toBe('rateLimit');
        expect(err.statusCode).toBe(429);
      },
    });

    httpMock
      .expectOne((r) => r.url.includes('api.github.com'))
      .flush('Rate limit exceeded', { status: 429, statusText: 'Too Many Requests' });
    httpMock.verify();
  });

  it('maps a 403 rate-limit error to a rateLimit AppError', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe({
      error: (err) => {
        expect(err.kind).toBe('rateLimit');
        expect(err.statusCode).toBe(403);
      },
    });

    httpMock
      .expectOne((r) => r.url.includes('api.github.com'))
      .flush(
        { message: 'API rate limit exceeded for...' },
        { status: 403, statusText: 'Forbidden' },
      );
    httpMock.verify();
  });

  it('maps a non-rate-limit 403 to an unknown AppError', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe({
      error: (err) => {
        expect(err.kind).toBe('unknown');
        expect(err.statusCode).toBe(403);
      },
    });

    httpMock
      .expectOne((r) => r.url.includes('api.github.com'))
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    httpMock.verify();
  });

  it('maps a 500 error to an unknown AppError', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe({
      error: (err) => {
        expect(err.kind).toBe('unknown');
        expect(err.statusCode).toBe(500);
      },
    });

    httpMock
      .expectOne((r) => r.url.includes('api.github.com'))
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    httpMock.verify();
  });

  it('maps a status-0 error to a network AppError', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe({
      error: (err) => {
        expect(err.kind).toBe('network');
      },
    });

    httpMock
      .expectOne((r) => r.url.includes('api.github.com'))
      .flush('', { status: 0, statusText: 'Unknown Error' });
    httpMock.verify();
  });

  // --- Malformed response ---

  it('throws an unknown AppError when the response shape is invalid', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe({
      error: (err) => {
        expect(err.kind).toBe('unknown');
      },
    });

    // Respond with a shape that is missing the required `items` array
    httpMock.expectOne((r) => r.url.includes('api.github.com')).flush({ total_count: 5 }); // no `items` field
    httpMock.verify();
  });

  // --- Duplicate request deduplication ---

  it('deduplicates concurrent requests for the same page', () => {
    const query = { page: 1, perPage: 30, dayRange: 30 };
    const results: unknown[] = [];

    repo.fetchTrendingRepos(query).subscribe((p) => results.push(p));
    repo.fetchTrendingRepos(query).subscribe((p) => results.push(p));

    // Only one HTTP request should be in-flight
    const reqs = httpMock.match((r) => r.url.includes('api.github.com'));
    expect(reqs).toHaveLength(1);
    reqs[0].flush(makeResponse([mockItem]));

    // Both subscribers should have received the result
    expect(results).toHaveLength(2);
    httpMock.verify();
  });

  it('allows a retry after a failed request clears the in-flight cache', () => {
    const query = { page: 1, perPage: 30, dayRange: 30 };

    // First request — fails
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    repo.fetchTrendingRepos(query).subscribe({ error: () => {} });
    httpMock
      .expectOne((r) => r.url.includes('api.github.com'))
      .flush('error', { status: 500, statusText: 'Server Error' });
    httpMock.verify();

    // Second request after failure — should make a new HTTP call (cache was cleared)
    repo.fetchTrendingRepos(query).subscribe();
    const retryReqs = httpMock.match((r) => r.url.includes('api.github.com'));
    expect(retryReqs).toHaveLength(1);
    retryReqs[0].flush(makeResponse([mockItem]));
    httpMock.verify();
  });
});
