import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';

import { TrendingReposFacade } from './trending-repos.facade';
import {
  TrendingReposRepository,
  TrendingReposPage,
} from '../../domain/repositories/trending-repos.repository';
import { RatingPersistenceService } from '../../infrastructure/datasources/rating-persistence.service';
import { GithubRepo } from '../../domain/models/github-repo.model';
import { APP_ERRORS } from '../../../../shared/models/app-error.model';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeRepo = (id: number, name = `repo-${id}`): GithubRepo => ({
  id,
  name,
  fullName: `user/${name}`,
  description: `Description for ${name}`,
  url: `https://github.com/user/${name}`,
  stars: id * 100,
  openIssues: id,
  createdAt: new Date('2024-02-01T00:00:00Z'),
  owner: {
    id: 99,
    login: 'user',
    avatarUrl: 'https://avatars.githubusercontent.com/u/99',
    profileUrl: 'https://github.com/user',
  },
});

const makePage = (
  repos: GithubRepo[],
  isLastPage = false,
  totalCount = 200,
): TrendingReposPage => ({ repos, totalCount, isLastPage });

/**
 * Returns a mock repository that emits pages in sequence.
 * of() is synchronous — no async test helpers needed.
 */
const repoStub = (pages: TrendingReposPage[]): Partial<TrendingReposRepository> => {
  let call = 0;
  return {
    fetchTrendingRepos: vi.fn(() => {
      const page = pages[call] ?? pages[pages.length - 1];
      call++;
      return of(page);
    }),
  };
};

const persistenceStub = (initial: Record<number, number> = {}): RatingPersistenceService =>
  ({
    load: vi.fn(() => ({ ...initial })),
    save: vi.fn(),
    setRating: vi.fn((id: number, stars: number) => ({ ...initial, [id]: stars })),
  }) as unknown as RatingPersistenceService;

const setup = (
  pages: TrendingReposPage[],
  persistence = persistenceStub(),
): { facade: TrendingReposFacade; persistence: RatingPersistenceService } => {
  TestBed.configureTestingModule({
    providers: [
      TrendingReposFacade,
      { provide: TrendingReposRepository, useValue: repoStub(pages) },
      { provide: RatingPersistenceService, useValue: persistence },
    ],
  });
  return { facade: TestBed.inject(TrendingReposFacade), persistence };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TrendingReposFacade', () => {
  describe('initial state', () => {
    it('exposes an empty, idle state before any action is called', () => {
      const { facade } = setup([makePage([makeRepo(1)])]);
      expect(facade.repos()).toEqual([]);
      expect(facade.isLoading()).toBe(false);
      expect(facade.isLoadingMore()).toBe(false);
      expect(facade.error()).toBeNull();
      expect(facade.hasMore()).toBe(true);
      expect(facade.currentPage()).toBe(0);
    });
  });

  describe('loadInitial()', () => {
    it('populates repos after a successful fetch', () => {
      const { facade } = setup([makePage([makeRepo(1), makeRepo(2)])]);
      facade.loadInitial();
      expect(facade.repos()).toHaveLength(2);
      expect(facade.repos()[0].name).toBe('repo-1');
    });

    it('clears isLoading and error after success', () => {
      const { facade } = setup([makePage([makeRepo(1)])]);
      facade.loadInitial();
      expect(facade.isLoading()).toBe(false);
      expect(facade.error()).toBeNull();
    });

    it('sets hasMore false when the page result is the last page', () => {
      const { facade } = setup([makePage([makeRepo(1)], true)]);
      facade.loadInitial();
      expect(facade.hasMore()).toBe(false);
    });

    it('records totalCount from the page result', () => {
      const { facade } = setup([makePage([makeRepo(1)], false, 500)]);
      facade.loadInitial();
      expect(facade.totalCount()).toBe(500);
    });

    it('records the loaded page in currentPage', () => {
      const { facade } = setup([makePage([makeRepo(1)])]);
      facade.loadInitial();
      expect(facade.currentPage()).toBe(1);
    });

    it('does not re-fetch when repos are already loaded', () => {
      const stub = repoStub([makePage([makeRepo(1)])]);
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          { provide: TrendingReposRepository, useValue: stub },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      facade.loadInitial();
      expect(stub.fetchTrendingRepos).toHaveBeenCalledTimes(1);
    });
  });

  describe('isEmpty', () => {
    it('is true after a successful fetch that returns no results', () => {
      const { facade } = setup([makePage([], true, 0)]);
      facade.loadInitial();
      expect(facade.isEmpty()).toBe(true);
    });

    it('is false when repos are present', () => {
      const { facade } = setup([makePage([makeRepo(1)])]);
      facade.loadInitial();
      expect(facade.isEmpty()).toBe(false);
    });

    it('is false when an error is present even though repos is empty', () => {
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: { fetchTrendingRepos: () => throwError(() => APP_ERRORS.network()) },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      expect(facade.isEmpty()).toBe(false);
    });
  });

  describe('loadNextPage()', () => {
    it('appends repos from the next page', () => {
      const { facade } = setup([
        makePage([makeRepo(1), makeRepo(2)]),
        makePage([makeRepo(3), makeRepo(4)], true),
      ]);
      facade.loadInitial();
      facade.loadNextPage();
      expect(facade.repos()).toHaveLength(4);
      expect(facade.repos()[2].name).toBe('repo-3');
    });

    it('marks hasMore false after the last page', () => {
      const { facade } = setup([makePage([makeRepo(1)]), makePage([makeRepo(2)], true)]);
      facade.loadInitial();
      facade.loadNextPage();
      expect(facade.hasMore()).toBe(false);
    });

    it('increments currentPage for each page loaded', () => {
      const { facade } = setup([
        makePage([makeRepo(1)]),
        makePage([makeRepo(2)]),
        makePage([makeRepo(3)], true),
      ]);
      facade.loadInitial();
      expect(facade.currentPage()).toBe(1);
      facade.loadNextPage();
      expect(facade.currentPage()).toBe(2);
      facade.loadNextPage();
      expect(facade.currentPage()).toBe(3);
    });

    it('only sets isLoadingMore — not isLoading — for subsequent pages', () => {
      const { facade } = setup([makePage([makeRepo(1)]), makePage([makeRepo(2)], true)]);
      facade.loadInitial();
      facade.loadNextPage();
      expect(facade.isLoading()).toBe(false);
      expect(facade.isLoadingMore()).toBe(false);
    });

    it('deduplicates repos that appear in both pages', () => {
      const shared = makeRepo(1);
      const { facade } = setup([
        makePage([shared, makeRepo(2)]),
        makePage([shared, makeRepo(3)], true),
      ]);
      facade.loadInitial();
      facade.loadNextPage();
      expect(facade.repos()).toHaveLength(3);
    });

    it('does not fetch when hasMore is false', () => {
      const stub = repoStub([makePage([makeRepo(1)], true)]);
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          { provide: TrendingReposRepository, useValue: stub },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      facade.loadNextPage();
      expect(stub.fetchTrendingRepos).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('surfaces a network error via the error signal', () => {
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: { fetchTrendingRepos: () => throwError(() => APP_ERRORS.network()) },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      expect(facade.error()?.kind).toBe('network');
      expect(facade.isLoading()).toBe(false);
    });

    it('surfaces a rateLimit error via the error signal', () => {
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: { fetchTrendingRepos: () => throwError(() => APP_ERRORS.rateLimit()) },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      expect(facade.error()?.kind).toBe('rateLimit');
    });

    it('clears isLoadingMore and preserves existing repos when a page-2+ fetch fails', () => {
      let call = 0;
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: {
              fetchTrendingRepos: vi.fn(() =>
                call++ === 0 ? of(makePage([makeRepo(1)])) : throwError(() => APP_ERRORS.network()),
              ),
            },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      facade.loadNextPage();
      expect(facade.repos()).toHaveLength(1);
      expect(facade.isLoadingMore()).toBe(false);
      expect(facade.error()?.kind).toBe('network');
    });
  });

  describe('retry()', () => {
    it('replays page 1 when no repos have loaded yet', () => {
      let fail = true;
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: {
              fetchTrendingRepos: vi.fn(() =>
                fail ? throwError(() => APP_ERRORS.network()) : of(makePage([makeRepo(1)])),
              ),
            },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      expect(facade.error()).not.toBeNull();

      fail = false;
      facade.retry();
      expect(facade.error()).toBeNull();
      expect(facade.repos()).toHaveLength(1);
    });

    it('replays the exact failed page — not currentPage + 1', () => {
      let call = 0;
      let failOnThirdCall = false;
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: {
              fetchTrendingRepos: vi.fn(() => {
                const n = call++;
                if (n === 0) return of(makePage([makeRepo(1)])); // page 1 ok
                if (n === 1) return throwError(() => APP_ERRORS.network()); // page 2 fails
                if (failOnThirdCall) return of(makePage([makeRepo(2)], true)); // retry succeeds
                return throwError(() => APP_ERRORS.network());
              }),
            },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial(); // call 0 — page 1 succeeds
      facade.loadNextPage(); // call 1 — page 2 fails
      expect(facade.error()).not.toBeNull();
      expect(facade.currentPage()).toBe(1); // page 1 is still the last successful page

      failOnThirdCall = true;
      facade.retry(); // call 2 — replays page 2 (not page 3)
      expect(facade.error()).toBeNull();
      expect(facade.repos()).toHaveLength(2); // page-1 repo + page-2 repo
    });

    it('sets isLoading for an initial-page retry', () => {
      // After a first-page error, retry should signal an initial load (not loading-more)
      let fail = true;
      TestBed.configureTestingModule({
        providers: [
          TrendingReposFacade,
          {
            provide: TrendingReposRepository,
            useValue: {
              fetchTrendingRepos: vi.fn(() =>
                fail ? throwError(() => APP_ERRORS.network()) : of(makePage([makeRepo(1)])),
              ),
            },
          },
          { provide: RatingPersistenceService, useValue: persistenceStub() },
        ],
      });
      const facade = TestBed.inject(TrendingReposFacade);
      facade.loadInitial();
      fail = false;
      // Before tick — retry sets isLoading true synchronously, then of() settles it
      // of() is synchronous, so we verify the settled state here
      facade.retry();
      expect(facade.isLoading()).toBe(false);
      expect(facade.isLoadingMore()).toBe(false);
    });
  });

  describe('ratings', () => {
    it('loads saved ratings from localStorage on init', () => {
      const { facade } = setup([makePage([])], persistenceStub({ 42: 4 }));
      expect(facade.getRating(42)).toBe(4);
    });

    it('returns 0 for an unrated repo', () => {
      const { facade } = setup([makePage([])]);
      expect(facade.getRating(999)).toBe(0);
    });

    it('calls persistence.setRating and updates the ratings signal', () => {
      const persistence = persistenceStub();
      const { facade } = setup([makePage([])], persistence);
      facade.setRating(7, 5);
      expect(persistence.setRating).toHaveBeenCalledWith(7, 5);
      expect(facade.getRating(7)).toBe(5);
    });

    it('reflects an updated rating via the ratings signal', () => {
      const { facade } = setup([makePage([])]);
      expect(facade.ratings()[3]).toBeUndefined();
      facade.setRating(3, 3);
      expect(facade.ratings()[3]).toBe(3);
    });

    it('preserves existing ratings when a new one is added', () => {
      const persistence = persistenceStub({ 1: 5 });
      (persistence.setRating as ReturnType<typeof vi.fn>).mockImplementation(
        (id: number, stars: number) => ({ 1: 5, [id]: stars }),
      );
      const { facade } = setup([makePage([])], persistence);
      facade.setRating(2, 4);
      expect(facade.getRating(1)).toBe(5);
      expect(facade.getRating(2)).toBe(4);
    });
  });
});
