import { test, expect } from '@playwright/test';
import {
  mockGithubApi,
  mockGithubRateLimit,
  FIFTEEN_REPOS,
  EIGHT_REPOS,
  makeRepo,
} from './helpers';

// =============================================================================
// Critical-path E2E tests — Circunomics GitHub Trending Repos
//
// All GitHub API calls are intercepted via page.route() so tests are
// deterministic and do not depend on network access or rate limits.
// =============================================================================

const scrollInfiniteListToBottom = async (page: Parameters<typeof test>[0]['page']) => {
  const listContainer = page.locator('.repos-page__list-container').first();
  await expect(listContainer).toBeVisible();

  await listContainer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
};

// ── 1. Initial page load ─────────────────────────────────────────────────────

test.describe('Initial page load', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, FIFTEEN_REPOS, 15);
  });

  test('renders the page title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-page-title')).toBeVisible();
    await expect(page.getByTestId('trending-repos-page-title')).toHaveText('Trending Repositories');
  });

  test('shows the repo list after loading', async ({ page }) => {
    await page.goto('/');
    // Wait for the loading skeleton to clear and the list to appear
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
  });

  test('renders 10 repo cards on the first page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    const cards = page.getByTestId('trending-repos-list-item');
    await expect(cards).toHaveCount(10);
  });

  test('shows the first repo name', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    // First repo in mock data is owner-1/repo-1
    await expect(page.getByText('repo-1').first()).toBeVisible();
  });

  test('shows the repository count in the page header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('15 repositories found on GitHub')).toBeVisible();
  });

  test('shows pagination controls once data loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-pagination')).toHaveCount(2); // top + bottom
  });
});

// ── 2. Pagination navigation ──────────────────────────────────────────────────

test.describe('Pagination navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, FIFTEEN_REPOS, 15);
  });

  test('Previous button is disabled on page 1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    // Both top and bottom prev buttons should be disabled on first page
    const prevBtns = page.getByTestId('trending-repos-pagination-prev-button');
    await expect(prevBtns.first()).toBeDisabled();
  });

  test('clicking Next advances to page 2 and shows the next 5 repos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-pagination-next-button').first().click();

    // Page 2 should show repos 11–15 (5 items)
    const cards = page.getByTestId('trending-repos-list-item');
    await expect(cards).toHaveCount(5);
  });

  test('Top button appears off page 1 and returns to page 1 when clicked', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    const topButton = page.getByTestId('trending-repos-pagination-top-button').first();
    const pageIndicator = page.getByTestId('trending-repos-pagination-page-indicator').first();

    await expect(topButton).toHaveCount(0);

    await page.getByTestId('trending-repos-pagination-next-button').first().click();
    await expect(pageIndicator).toHaveText('Page 2');
    await expect(topButton).toBeVisible();

    await topButton.click();
    await expect(pageIndicator).toHaveText('Page 1');
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(10);
  });

  test('range indicator updates on page 2', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-pagination-next-button').first().click();

    // Keep this tolerant to copy additions like the current "loaded" suffix.
    const rangeIndicator = page.getByTestId('trending-repos-pagination-range-indicator').first();
    await expect(rangeIndicator).toContainText('Showing 11–15 of 15');
  });

  test('later-page 403 in Paginated mode keeps list and toggle usable', async ({ page }) => {
    // Override describe-level mock so this test can emulate a later API-page failure.
    await page.unroute('**/api.github.com/search/repositories**');

    await page.route('**/api.github.com/search/repositories**', (route) => {
      const requestUrl = new URL(route.request().url());
      const pageParam = Number(requestUrl.searchParams.get('page') ?? '1');

      if (pageParam === 2) {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'API rate limit exceeded' }),
        });
        return;
      }

      const pageStart = (pageParam - 1) * 100 + 1;
      const items = Array.from({ length: 100 }, (_, i) => makeRepo(pageStart + i));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 500,
          incomplete_results: false,
          items,
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    await expect(page.getByTestId('trending-repos-display-mode-toggle')).toBeVisible();

    // Walk through cached UI pages from API page 1 (100 repos => 10 UI pages).
    const nextButton = page.getByTestId('trending-repos-pagination-next-button').first();
    const pageIndicator = page.getByTestId('trending-repos-pagination-page-indicator').first();
    for (let i = 0; i < 9; i++) {
      await nextButton.click();
    }
    await expect(pageIndicator).toHaveText('Page 10');

    // This click requires API page 2 and will return 403.
    await nextButton.click();

    // App should keep already loaded data interactive and show retry UI.
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    await expect(page.getByText('repo-91').first()).toBeVisible();
    await expect(page.getByTestId('trending-repos-display-mode-toggle')).toBeVisible();
    await expect(page.getByTestId('trending-repos-error')).toBeVisible();
    await expect(page.getByTestId('trending-repos-error-retry')).toBeVisible();

    // Switching to infinite mode must remain usable with already loaded repos.
    await page.getByTestId('trending-repos-display-mode-infinite').click();
    await expect(page.getByTestId('trending-repos-pagination')).toHaveCount(0);
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(100);
  });

  test('Previous button navigates back to page 1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    // Go to page 2
    await page.getByTestId('trending-repos-pagination-next-button').first().click();
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(5);

    // Go back to page 1
    await page.getByTestId('trending-repos-pagination-prev-button').first().click();
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(10);
  });

  test('page indicator shows current page number', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    const pageIndicator = page.getByTestId('trending-repos-pagination-page-indicator').first();
    await expect(pageIndicator).toHaveText('Page 1');

    await page.getByTestId('trending-repos-pagination-next-button').first().click();
    await expect(pageIndicator).toHaveText('Page 2');
  });

  test('Next and Previous reset paginated list scroll to top', async ({ page }) => {
    await page.unroute('**/api.github.com/search/repositories**');

    const firstApiPage = Array.from({ length: 100 }, (_, i) => makeRepo(i + 1));
    await page.route('**/api.github.com/search/repositories**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 500,
          incomplete_results: false,
          items: firstApiPage,
        }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    const listContainer = page.locator('.repos-page__list-container').first();
    await expect(listContainer).toBeVisible();

    await listContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const scrolledDown = await listContainer.evaluate((el) => el.scrollTop);
    expect(scrolledDown).toBeGreaterThan(0);

    await page.getByTestId('trending-repos-pagination-next-button').first().click();
    await expect(page.getByTestId('trending-repos-pagination-page-indicator').first()).toHaveText(
      'Page 2',
    );
    expect(await listContainer.evaluate((el) => el.scrollTop)).toBe(0);

    await listContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.getByTestId('trending-repos-pagination-prev-button').first().click();
    await expect(page.getByTestId('trending-repos-pagination-page-indicator').first()).toHaveText(
      'Page 1',
    );
    expect(await listContainer.evaluate((el) => el.scrollTop)).toBe(0);
  });
});

// ── 3. Modal open → rate → save → rating visible in list ─────────────────────

test.describe('Repo details modal and rating', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, EIGHT_REPOS, 8);
  });

  test('opens modal when a repo name button is clicked', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();

    await expect(page.getByTestId('repo-details-modal')).toBeVisible();
  });

  test('modal shows the repo name', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();

    await expect(page.getByTestId('repo-details-modal-name')).toContainText('repo-1');
  });

  test('modal shows the repo description', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();

    await expect(page.getByTestId('repo-details-modal-description')).toContainText(
      'Description for repository number 1',
    );
  });

  test('Save rating button is disabled before selecting a star', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();

    await expect(page.getByRole('button', { name: /save rating/i })).toBeDisabled();
  });

  test('selecting a star enables the Save rating button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();
    await page.getByTestId('repo-rating-star-4').click();

    await expect(page.getByRole('button', { name: /save rating/i })).toBeEnabled();
  });

  test('rating appears on the card after saving via modal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    // Open first repo's modal
    await page.getByTestId('trending-repos-list-item-name-button').first().click();
    await expect(page.getByTestId('repo-details-modal')).toBeVisible();

    // Rate 4 stars and save
    await page.getByTestId('repo-rating-star-4').click();
    await page.getByRole('button', { name: /save rating/i }).click();

    // Modal should close
    await expect(page.getByTestId('repo-details-modal')).not.toBeVisible();

    // Rating indicator should now appear on the first card
    const firstCard = page.getByTestId('trending-repos-list-item').first();
    await expect(firstCard.getByTestId('trending-repos-list-item-rating')).toBeVisible();
  });

  test('dismissing via X button does not save the rating', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();
    await page.getByTestId('repo-rating-star-5').click();

    // Dismiss via X — no save
    await page.getByTestId('repo-details-modal-close-button').click();

    // Rating block should NOT appear on the card
    const firstCard = page.getByTestId('trending-repos-list-item').first();
    await expect(firstCard.getByTestId('trending-repos-list-item-rating')).not.toBeVisible();
  });

  test('closing modal with Escape key does not save the rating', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-list-item-name-button').first().click();
    await page.getByTestId('repo-rating-star-3').click();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('repo-details-modal')).not.toBeVisible();

    const firstCard = page.getByTestId('trending-repos-list-item').first();
    await expect(firstCard.getByTestId('trending-repos-list-item-rating')).not.toBeVisible();
  });
});

// ── 4. Error state ────────────────────────────────────────────────────────────

test.describe('Error state', () => {
  test('shows error state when the GitHub API returns a rate limit error', async ({ page }) => {
    await mockGithubRateLimit(page);
    await page.goto('/');

    await expect(page.getByTestId('trending-repos-error')).toBeVisible();
    await expect(page.getByTestId('trending-repos-error')).toContainText(
      'GitHub rate limit reached',
    );
  });

  test('shows a retry button in the error state', async ({ page }) => {
    await mockGithubRateLimit(page);
    await page.goto('/');

    await expect(page.getByTestId('trending-repos-error-retry')).toBeVisible();
  });

  test('retry button re-fetches and shows repos when the API recovers', async ({ page }) => {
    // First call: rate limit
    let callCount = 0;
    await page.route('**/api.github.com/search/repositories**', (route) => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'API rate limit exceeded' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_count: 8,
            incomplete_results: false,
            items: EIGHT_REPOS,
          }),
        });
      }
    });

    await page.goto('/');
    await expect(page.getByTestId('trending-repos-error')).toBeVisible();

    await page.getByTestId('trending-repos-error-retry').click();

    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(8);
  });

  test('does not show repo list when in error state', async ({ page }) => {
    await mockGithubRateLimit(page);
    await page.goto('/');

    await expect(page.getByTestId('trending-repos-error')).toBeVisible();
    await expect(page.getByTestId('trending-repos-list')).not.toBeVisible();
  });
});

// ── 5. Display mode switching ─────────────────────────────────────────────────

test.describe('Display mode switching', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, FIFTEEN_REPOS, 15);
  });

  test('mode toggle is visible on page load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-display-mode-toggle')).toBeVisible();
  });

  test('Paginated button is active by default', async ({ page }) => {
    await page.goto('/');
    const paginatedBtn = page.getByTestId('trending-repos-display-mode-paginated');
    await expect(paginatedBtn).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('trending-repos-display-mode-infinite')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('pagination controls are visible in paginated mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    await expect(page.getByTestId('trending-repos-pagination').first()).toBeVisible();
  });

  test('switching to Infinite mode hides pagination controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-display-mode-infinite').click();

    await expect(page.getByTestId('trending-repos-pagination')).toHaveCount(0);
  });

  test('switching to Infinite mode shows all loaded repos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    // Paginated mode shows 10 of 15
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(10);

    await page.getByTestId('trending-repos-display-mode-infinite').click();

    // Infinite mode shows all 15 loaded repos
    await expect(page.getByTestId('trending-repos-list-item')).toHaveCount(15);
  });

  test('switching to Infinite mode shows the scroll sentinel', async ({ page }) => {
    // Remove the describe-level route mock so this test can enforce hasMore=true.
    await page.unroute('**/api.github.com/search/repositories**');

    // `hasMore` stays true only if the API page is full (per_page=100) and
    // total_count indicates additional pages.
    const firstApiPage = Array.from({ length: 100 }, (_, i) => makeRepo(i + 1));
    let apiCallCount = 0;

    await page.route('**/api.github.com/search/repositories**', (route) => {
      apiCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 500,
          incomplete_results: false,
          items: firstApiPage,
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-display-mode-infinite').click();

    // Infinite mode relies on list-container scrolling; explicitly scroll to
    // trigger sentinel intersection in a deterministic way.
    for (let i = 0; i < 8 && apiCallCount === 1; i++) {
      await scrollInfiniteListToBottom(page);
      await page.waitForTimeout(120);
    }

    await expect(apiCallCount).toBeGreaterThan(1);
  });

  test('later-page 403 in Infinite mode keeps list and mode toggle usable', async ({ page }) => {
    // Override describe-level mock so this test can emulate page-11 failure.
    await page.unroute('**/api.github.com/search/repositories**');

    let sawPage2 = false;

    await page.route('**/api.github.com/search/repositories**', (route) => {
      const requestUrl = new URL(route.request().url());
      const pageParam = Number(requestUrl.searchParams.get('page') ?? '1');

      if (pageParam === 2) {
        sawPage2 = true;
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'API rate limit exceeded' }),
        });
        return;
      }

      const pageStart = (pageParam - 1) * 100 + 1;
      const items = Array.from({ length: 100 }, (_, i) => makeRepo(pageStart + i));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 5000,
          incomplete_results: false,
          items,
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-display-mode-infinite').click();

    // Drive the internal scroll container until API page 2 is requested and fails.
    for (let i = 0; i < 20 && !sawPage2; i++) {
      await scrollInfiniteListToBottom(page);
      await page.waitForTimeout(120);
    }

    await expect(sawPage2).toBe(true);

    // App should keep already loaded data interactive and show retry UI.
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();
    await expect(page.getByTestId('trending-repos-list-item').first()).toBeVisible();
    await expect(page.getByTestId('trending-repos-display-mode-toggle')).toBeVisible();
    await expect(page.getByTestId('trending-repos-error')).toBeVisible();
    await expect(page.getByTestId('trending-repos-error-retry')).toBeVisible();

    // Switching to paginated mode must remain usable with loaded data.
    await page.getByTestId('trending-repos-display-mode-paginated').click();
    await expect(page.getByTestId('trending-repos-pagination').first()).toBeVisible();

    const pageIndicator = page.getByTestId('trending-repos-pagination-page-indicator').first();
    await expect(pageIndicator).toHaveText('Page 1');
    await page.getByTestId('trending-repos-pagination-next-button').first().click();
    await expect(pageIndicator).toHaveText('Page 2');
  });

  test('switching back to Paginated mode restores pagination controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-display-mode-infinite').click();
    await expect(page.getByTestId('trending-repos-pagination')).toHaveCount(0);

    await page.getByTestId('trending-repos-display-mode-paginated').click();
    await expect(page.getByTestId('trending-repos-pagination').first()).toBeVisible();
  });

  test('desktop uses internal list-container scrolling in Infinite mode', async ({ page }) => {
    // Override describe-level mock with enough data to force overflow.
    await page.unroute('**/api.github.com/search/repositories**');

    const firstApiPage = Array.from({ length: 100 }, (_, i) => makeRepo(i + 1));
    await page.route('**/api.github.com/search/repositories**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 500,
          incomplete_results: false,
          items: firstApiPage,
        }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-display-mode-infinite').click();

    const listContainer = page.locator('.repos-page__list-container').first();
    await expect(listContainer).toBeVisible();

    const metricsBefore = await listContainer.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    expect(metricsBefore.scrollHeight).toBeGreaterThan(metricsBefore.clientHeight);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await listContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const containerScrollTopAfter = await listContainer.evaluate((el) => el.scrollTop);
    expect(containerScrollTopAfter).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('?mode=infinite query param initialises infinite mode', async ({ page }) => {
    await page.goto('/?mode=infinite');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await expect(page.getByTestId('trending-repos-display-mode-infinite')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('trending-repos-pagination')).toHaveCount(0);
  });

  test('?mode=paginated query param initialises paginated mode', async ({ page }) => {
    await page.goto('/?mode=paginated');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await expect(page.getByTestId('trending-repos-display-mode-paginated')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('trending-repos-pagination').first()).toBeVisible();
  });
});

// ── 6. Rating persists across mode switches ───────────────────────────────────

test.describe('Ratings persist across mode switches', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, EIGHT_REPOS, 8);
  });

  test('rating set in paginated mode is visible after switching to infinite', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    // Rate the first repo
    await page.getByTestId('trending-repos-list-item-name-button').first().click();
    await page.getByTestId('repo-rating-star-3').click();
    await page.getByRole('button', { name: /save rating/i }).click();

    // Verify rating is shown in paginated mode
    const firstCardPaginated = page.getByTestId('trending-repos-list-item').first();
    await expect(firstCardPaginated.getByTestId('trending-repos-list-item-rating')).toBeVisible();

    // Switch to infinite mode
    await page.getByTestId('trending-repos-display-mode-infinite').click();

    // Rating should still be visible on the same card
    const firstCardInfinite = page.getByTestId('trending-repos-list-item').first();
    await expect(firstCardInfinite.getByTestId('trending-repos-list-item-rating')).toBeVisible();
  });
});

// ── 7. About modal ────────────────────────────────────────────────────────────

test.describe('About modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, EIGHT_REPOS, 8);
  });

  test('About button is visible in the header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-about-button')).toBeVisible();
  });

  test('clicking About opens the modal with expected title', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('app-about-button').click();
    await expect(page.getByTestId('app-about-modal')).toBeVisible();
    await expect(page.getByTestId('app-about-modal-title')).toHaveText('About this app');
  });

  test('About modal contains key content sections', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('app-about-button').click();
    await expect(page.getByTestId('app-about-modal-section-browsing-modes')).toBeVisible();
    await expect(page.getByTestId('app-about-modal-section-ratings')).toBeVisible();
    await expect(page.getByTestId('app-about-modal-section-api-limits')).toBeVisible();
  });

  test('About modal closes via the X button', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('app-about-button').click();
    await expect(page.getByTestId('app-about-modal')).toBeVisible();

    await page.getByTestId('app-about-modal-close-button').click();
    await expect(page.getByTestId('app-about-modal')).not.toBeVisible();
  });

  test('About modal closes via Escape key', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('app-about-button').click();
    await expect(page.getByTestId('app-about-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('app-about-modal')).not.toBeVisible();
  });

  test('About modal opens cleanly while repo details dialog is open', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    // Open the repo details dialog first
    await page.getByTestId('trending-repos-list-item-name-button').first().click();
    await expect(page.getByTestId('repo-details-modal')).toBeVisible();

    // Open About on top
    await page.getByTestId('app-about-button').click();
    await expect(page.getByTestId('app-about-modal')).toBeVisible();

    // Both are technically in DOM; About is the active/top dialog
    // Close About — repo details should still be behind it
    await page.getByTestId('app-about-modal-close-button').click();
    await expect(page.getByTestId('app-about-modal')).not.toBeVisible();
  });
});
