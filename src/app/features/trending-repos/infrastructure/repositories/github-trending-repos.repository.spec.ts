import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GithubTrendingReposRepository } from './github-trending-repos.repository';
import { GithubApiSearchResponse } from '../datasources/github-api.types';

const mockApiResponse: GithubApiSearchResponse = {
  total_count: 2,
  incomplete_results: false,
  items: [
    {
      id: 1,
      name: 'repo-one',
      full_name: 'user/repo-one',
      description: 'First repo',
      html_url: 'https://github.com/user/repo-one',
      stargazers_count: 5000,
      open_issues_count: 12,
      created_at: '2024-02-01T00:00:00Z',
      owner: {
        id: 10,
        login: 'user',
        avatar_url: 'https://avatars.githubusercontent.com/u/10',
        html_url: 'https://github.com/user',
      },
    },
  ],
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

  it('fetches repos and maps them to the domain model', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe((page) => {
      expect(page.repos).toHaveLength(1);
      expect(page.repos[0].name).toBe('repo-one');
      expect(page.repos[0].stars).toBe(5000);
      expect(page.repos[0].owner.login).toBe('user');
    });

    const req = httpMock.expectOne((r) => r.url.includes('api.github.com/search/repositories'));
    expect(req.request.params.get('sort')).toBe('stars');
    expect(req.request.params.get('order')).toBe('desc');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(mockApiResponse);
    httpMock.verify();
  });

  it('marks isLastPage true when fewer items than perPage are returned', () => {
    repo.fetchTrendingRepos({ page: 1, perPage: 30, dayRange: 30 }).subscribe((page) => {
      // 1 item returned, perPage is 30 → must be the last page
      expect(page.isLastPage).toBe(true);
    });

    httpMock.expectOne((r) => r.url.includes('api.github.com')).flush(mockApiResponse);
    httpMock.verify();
  });

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

  it('deduplicates concurrent requests for the same page', () => {
    const query = { page: 1, perPage: 30, dayRange: 30 };
    const results: unknown[] = [];

    repo.fetchTrendingRepos(query).subscribe((p) => results.push(p));
    repo.fetchTrendingRepos(query).subscribe((p) => results.push(p));

    // Only one HTTP request should be in-flight
    const reqs = httpMock.match((r) => r.url.includes('api.github.com'));
    expect(reqs).toHaveLength(1);
    reqs[0].flush(mockApiResponse);

    // Both subscribers received the same result
    expect(results).toHaveLength(2);
    httpMock.verify();
  });
});
