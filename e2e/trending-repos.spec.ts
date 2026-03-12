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

// ── 1. Initial page load ─────────────────────────────────────────────────────

test.describe('Initial page load', () => {
  test.beforeEach(async ({ page }) => {
    await mockGithubApi(page, FIFTEEN_REPOS, 15);
  });

  test('renders the page title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-page-title')).toBeVisible();
    await expect(page.getByTestId('trending-repos-page-title')).toHaveText(
      'Trending Repositories',
    );
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
    await expect(page.getByText('15 repositories found')).toBeVisible();
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

  test('range indicator updates on page 2', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('trending-repos-list')).toBeVisible();

    await page.getByTestId('trending-repos-pagination-next-button').first().click();

    // Range should show "Showing 11–15 of 15"
    const rangeIndicator = page.getByTestId('trending-repos-pagination-range-indicator').first();
    await expect(rangeIndicator).toHaveText('Showing 11–15 of 15');
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
