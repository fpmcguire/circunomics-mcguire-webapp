# Testing — Circunomics GitHub Trending Repos

> Adapted from the Prismatic Testing Standards Guide for this project's stack and scope.

---

## Philosophy

**Pragmatic over perfect.** Tests should give you confidence to ship — not hit a coverage number.

- ✅ Test what matters: critical flows, complex logic, integration points
- ✅ Prefer integration tests over isolated unit tests
- ✅ Tests are documentation — names should explain how features work
- ✅ Skip tests that don't give you confidence or document behavior
- ❌ Don't chase coverage metrics
- ❌ Don't test simple getters, Angular framework behavior, or CSS

---

## Test Distribution

| Type | Effort | Tool |
|---|---|---|
| Integration (components + services working together) | **50%** | Vitest + `@testing-library/angular` |
| Unit (complex pure logic only) | **30%** | Vitest |
| E2E (3–5 critical user journeys only) | **20%** | Playwright |

---

## What We Test

### ✅ Unit tests (Vitest) — complex logic only

Write unit tests for logic that has real branching and is genuinely hard to reason about.

**Worth testing:**
```typescript
// ✅ Non-trivial UTC date math with edge cases
buildCreatedAfterQuery(days: number, from?: Date): string

// ✅ Raw API → domain mapping with type narrowing
mapApiRepo(raw: GithubApiRepo): GithubRepo

// ✅ localStorage validation with shape + range guards
RatingPersistenceService.load(): RatingsMap
```

**Not worth testing:**
```typescript
// ❌ Simple getter
get formattedStars(): string { return this.repo.stars >= 1000 ? `${(this.repo.stars / 1000).toFixed(1)}k` : String(this.repo.stars); }

// ❌ Angular DI wiring
// ❌ Signal reads/writes with no logic
```

### ✅ Integration tests (Vitest + Angular Testing Library) — primary test type

Test features working together as a user would experience them. Use `render()` from
`@testing-library/angular` and query by `data-testid`.

**Write integration tests for:**
- Facade flows (load → paginate → error → retry → rating)
- Component rendering states (loading, loaded, empty, error)
- User interactions (button clicks that change state or emit events)
- HTTP repository behavior (responses, errors, deduplication)

**Example — facade integration test:**
```typescript
it('advances to page 2 and shows the correct slice', () => {
  const { facade } = setup([makePage(makeRepos(1, 10)), makePage(makeRepos(11, 5), true)]);
  facade.loadInitial();
  facade.goToNextPage();
  expect(facade.visiblePage()).toBe(2);
  expect(facade.visibleRepos()).toHaveLength(5);
});
```

**Example — component integration test:**
```typescript
it('renders the retry button when error is set', async () => {
  const error: AppError = { kind: 'network', message: 'err' };
  await renderList({ error });
  expect(screen.getByTestId('trending-repos-error-retry')).toBeInTheDocument();
});
```

### ✅ E2E tests (Playwright) — critical paths only

3–5 tests covering the journeys that must work before every release. No more.

**E2E tests for this app:**
1. Initial page load shows trending repos
2. Pagination navigation (Next/Previous, range indicator, page indicator)
3. Clicking a repo name → modal opens → rating → save → star visible in list; dismiss paths do not commit rating
4. GitHub API error state is shown; retry re-fetches successfully
5. Display mode switching — toggle activates infinite/paginated mode; `?mode=` query param initialises mode; sentinel shown in infinite mode; ratings persist across mode switches

All tests use `page.route()` to intercept GitHub API calls — deterministic, no live network required.

**Skip E2E for:**
- Edge cases and error states (cover in integration tests)
- Every button variation
- Pagination count accuracy

---

## Selector Strategy

`data-testid` attributes are the **primary selector** for both Vitest and Playwright.

```
data-testid="{feature}-{component}-{element}-{modifier?}"
```

**This project's conventions:**

| Element | `data-testid` |
|---|---|
| Page title | `trending-repos-page-title` |
| Repo list | `trending-repos-list` |
| Repo card | `trending-repos-list-item` |
| Card name button | `trending-repos-list-item-name-button` |
| Card rating display | `trending-repos-list-item-rating` |
| Loading skeleton | `trending-repos-loading` |
| Error panel | `trending-repos-error` |
| Retry button | `trending-repos-error-retry` |
| Empty state | `trending-repos-empty` |
| Pagination nav | `trending-repos-pagination` |
| Previous page button | `trending-repos-pagination-prev-button` |
| Next page button | `trending-repos-pagination-next-button` |
| Page indicator | `trending-repos-pagination-page-indicator` |
| Range indicator | `trending-repos-pagination-range-indicator` |
| Browsing mode toggle | `browsing-mode-toggle` |
| Infinite scroll sentinel | `trending-repos-infinite-sentinel` |
| End-of-list indicator | `infinite-scroll-end` |
| Modal close | `repo-details-modal-close-button` |
| Modal repo name | `repo-details-modal-name` |
| Star rating inputs | `repo-rating-star-1` … `repo-rating-star-5` |
| Display mode toggle | `trending-repos-display-mode-toggle` |
| Paginated mode button | `trending-repos-display-mode-paginated` |
| Infinite mode button | `trending-repos-display-mode-infinite` |
| Infinite scroll sentinel | `trending-repos-infinite-sentinel` |

**Rules:**
- Always kebab-case
- Specific enough to be unambiguous (`trending-repos-error-retry`, not `retry`)
- Applied at build time in templates — never added as a test afterthought
- Never use CSS classes, DOM structure, or text content as primary selectors

---

## Test File Placement

Tests live next to the file they test:

```
repo-card.component.ts
repo-card.component.spec.ts      ← component integration test

github-repo.mapper.ts
github-repo.mapper.spec.ts       ← unit test (complex pure logic)

trending-repos.facade.ts
trending-repos.facade.spec.ts    ← integration test (primary coverage)
```

E2E tests live in `e2e/`:
```
e2e/
  helpers.ts                     ← mock data factory (makeRepo, FIFTEEN_REPOS, EIGHT_REPOS) + page.route() interceptors
  trending-repos.spec.ts         ← critical user journey tests
    ├── Initial page load
    ├── Pagination navigation
    ├── Repo details modal and rating
    ├── Error state
    ├── Display mode switching
    └── Ratings persist across mode switches
```

---

## Naming Conventions

Test names read as sentences describing behavior, not implementation:

```typescript
// ✅ Describes behavior
it('appends repos from the next page')
it('surfaces a network error via the error signal')
it('replays the exact failed page — not currentPage + 1')
it('clears corrupted storage and returns empty map')

// ❌ Describes implementation
it('calls fetchTrendingRepos with page 2')
it('sets isFetching to false')
it('updates _state signal')
```

---

## What We Don't Test

| Skip | Why |
|---|---|
| Simple Angular `@Input` binding | Framework behavior — trust Angular |
| CSS class application | Use visual review |
| Every validation edge case | Pick the critical ones; skip the rest |
| Third-party library behavior | `IntersectionObserver`, CDK, RxJS |
| `data-testid` presence on elements | Already verified manually; brittle |
| Trivial computed signals (reads only) | No logic to break |

---

## Running Tests

```bash
npm test              # All unit + integration tests (Vitest, single run)
npm run test:watch    # Watch mode during development
npm run e2e           # Playwright E2E (requires dev server on :4200)
npm run e2e:ui        # Playwright interactive UI
```

---

## Current Test State

| File | Tests | Type |
|---|---|---|
| `app.spec.ts` | 2 | Integration — shell landmarks |
| `github-query.utils.spec.ts` | 8 | Unit — UTC date/query builder |
| `github-repo.mapper.spec.ts` | 5 | Unit — domain mapper |
| `github-trending-repos.repository.spec.ts` | 12 | Integration — HTTP, errors, dedup |
| `rating-persistence.service.spec.ts` | 8 | Unit — localStorage validation |
| `trending-repos.facade.spec.ts` | 58 | Integration — all facade flows, both display modes |
| `repo-card.component.spec.ts` | 12 | Integration — card rendering + interactions |
| `repo-list.component.spec.ts` | 15 | Integration — list states + events |
| `repo-pagination.component.spec.ts` | 15 | Integration — pagination controls |
| `star-rating.component.spec.ts` | 10 | Integration — rating widget |
| `repo-details-dialog.component.spec.ts` | 18 | Integration — dialog rendering + save/dismiss |
| `display-mode-toggle.component.spec.ts` | 7 | Integration — segmented control rendering + output |
| `intersection-observer.directive.spec.ts` | 5 | Unit — IntersectionObserver directive |
| **Total** | **175** | |

**E2E (Playwright):** 5 test groups in `e2e/trending-repos.spec.ts`:
1. Initial page load
2. Pagination navigation
3. Repo details modal and rating
4. Error state
5. Display mode switching (toggle, query param, sentinel, ratings across modes)

All GitHub API calls mocked via `page.route()` — no live network required.

---

## Decision Tree

```
Should I write a test for this?
│
├─ Is it a critical user flow? → E2E test (Playwright)
│
├─ Is it complex business logic or a facade/service? → Integration test (Vitest)
│
├─ Is it a pure utility with real branching? → Unit test (Vitest)
│
├─ Is it a simple getter, Angular wiring, or CSS? → Skip
│
└─ Am I unsure what I'm testing? → Skip
```

---

> **Remember:** The goal is working software with confidence to ship — not coverage metrics.
> 10 focused integration tests beat 50 trivial unit tests every time.
