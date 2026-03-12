import { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock GitHub API response builder
// ---------------------------------------------------------------------------

interface MockOwner {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface MockRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  created_at: string;
  owner: MockOwner;
}

const makeOwner = (index: number): MockOwner => ({
  id: 1000 + index,
  login: `owner-${index}`,
  avatar_url: `https://avatars.githubusercontent.com/u/${1000 + index}`,
  html_url: `https://github.com/owner-${index}`,
});

export const makeRepo = (index: number): MockRepo => ({
  id: index,
  name: `repo-${index}`,
  full_name: `owner-${index}/repo-${index}`,
  description: `Description for repository number ${index}`,
  html_url: `https://github.com/owner-${index}/repo-${index}`,
  stargazers_count: 10000 - index * 100,
  open_issues_count: index * 2,
  created_at: '2025-02-10T00:00:00Z',
  owner: makeOwner(index),
});

export const buildGithubResponse = (repos: MockRepo[], totalCount = repos.length) => ({
  total_count: totalCount,
  incomplete_results: false,
  items: repos,
});

// ---------------------------------------------------------------------------
// Route interceptors
// ---------------------------------------------------------------------------

/**
 * Intercept all GitHub Search API calls and return a controlled response.
 * Call once in beforeEach to apply to every test in a file.
 */
export const mockGithubApi = async (
  page: Page,
  repos: MockRepo[],
  totalCount?: number,
): Promise<void> => {
  await page.route('**/api.github.com/search/repositories**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildGithubResponse(repos, totalCount ?? repos.length)),
    });
  });
};

/**
 * Intercept the GitHub API and respond with a 403 rate-limit error.
 */
export const mockGithubRateLimit = async (page: Page): Promise<void> => {
  await page.route('**/api.github.com/search/repositories**', (route) => {
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'API rate limit exceeded' }),
    });
  });
};

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

/** 15 repos — fills 1 full UI page (10) + partial second page (5). */
export const FIFTEEN_REPOS = Array.from({ length: 15 }, (_, i) => makeRepo(i + 1));

/** Single page of 8 repos — less than one full UI page. */
export const EIGHT_REPOS = Array.from({ length: 8 }, (_, i) => makeRepo(i + 1));
