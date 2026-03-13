# PROJECT.md — Circunomics GitHub Trending Repos

> This document is updated incrementally as each implementation milestone is completed.
> Full architectural rationale lives in [ARCHITECTURE.md](./docs/ARCHITECTURE.md).
> Step-by-step delivery plan lives in [ROADMAP.md](./ROADMAP.md).
> Proposed future enhancements live in [FUTURE-FEATURES.md](./FUTURE-FEATURES.md) — not committed roadmap scope.

---

## Architecture

### Approach

Feature-driven, layered architecture — organized by feature first, then by technical concern
within each feature. Keeps related logic co-located, makes each feature self-contained, and
scales cleanly without DDD ceremony.

### Folder structure

```
src/
├── environments/
│   ├── environment.ts               # Dev config — GitHub token placeholder (gitignored local override)
│   └── environment.prod.ts          # Prod config — token via deployment secrets only
├── styles/
│   ├── _tokens.scss                 # CSS custom properties: colors, spacing, radius, shadow, type
│   ├── _reset.scss                  # Base reset + :focus-visible keyboard ring
│   ├── _typography.scss             # Text size/color/weight utility classes
│   └── _utilities.scss              # .sr-only, .skeleton shimmer, .badge, .icon-btn
└── app/
    ├── app.ts                       # Root component — shell layout only
    ├── app.html                     # <app-header> + <main> + <footer> + <router-outlet>
    ├── app.config.ts                # provideHttpClient, interceptor, repository binding
    ├── app.routes.ts                # Lazy route → trending-repos page
    │
    ├── core/
    │   ├── services/
    │   │   └── github-auth.interceptor.ts   # Injects optional Bearer token for api.github.com
    │   └── utils/
    │       └── github-query.utils.ts        # UTC-safe date/query builder (pure functions)
    │
    ├── shared/
    │   ├── models/
    │   │   └── app-error.model.ts           # Typed AppError discriminated union + factory fns
    │   └── ui/
    │       ├── header/                      # Sticky app header, router-aware nav
    │       └── footer/                      # App footer — version, GitHub link, author
    │
    └── features/
        └── trending-repos/
            ├── domain/
            │   ├── models/
            │   │   └── github-repo.model.ts        # GithubRepo + GithubRepoOwner interfaces
            │   ├── mappers/
            │   │   └── github-repo.mapper.ts        # Pure API→domain mapping functions
            │   └── repositories/
            │       └── trending-repos.repository.ts # Abstract contract (DI token)
            │
            ├── infrastructure/
            │   ├── datasources/
            │   │   ├── github-api.types.ts          # Raw GitHub API response shapes (infra only)
            │   │   └── rating-persistence.service.ts# localStorage rating store
            │   └── repositories/
            │       └── github-trending-repos.repository.ts  # HttpClient implementation
            │
            ├── application/
            │   ├── facades/
            │   │   └── trending-repos.facade.ts     # Single orchestration point for the feature
            │   └── state/
            │       └── trending-repos.state.ts      # State snapshot interface + INITIAL_STATE
            │
            └── ui/
                ├── pages/
                │   └── trending-repos-page/         # TrendingReposPageComponent
                ├── components/
                │   ├── repo-card/                   # Presentational repo card
                │   ├── repo-list/                   # List + all UI states (skeleton, error, empty)
                │   ├── repo-pagination/              # Previous/Next pagination controls
                │   ├── star-rating/                 # Interactive 5-star rating (radio-group pattern)
                │   └── display-mode-toggle/         # Segmented control — paginated / infinite
                └── dialogs/
                    └── repo-details-dialog/         # CDK Dialog — full repo details + rating
```

Shared UI and directives at `src/app/shared/`:
```
shared/
  ui/
    header/          # HeaderComponent — router-aware nav + About button (injects CDK Dialog)
    footer/          # FooterComponent
    dialogs/
      about-dialog/  # AboutDialogComponent — app-level CDK Dialog, purely presentational
  directives/
    intersection-observer.directive.ts  # IntersectionObserver with configurable root element
```

### Key layering rule

The **domain layer owns the repository contract** (`TrendingReposRepository` abstract class).
Infrastructure implements it. The application facade depends on the domain contract, not the
implementation — making it straightforward to swap in a mock for tests.

```
UI components
     ↓ injects
TrendingReposFacade (application)
     ↓ depends on abstract contract
TrendingReposRepository (domain)
     ↑ implemented by
GithubTrendingReposRepository (infrastructure)
```

### State management

Angular signals — no NgRx. For a single-feature app, signals give the same unidirectional data
flow with far less boilerplate. The facade exposes three strictly separated concepts:

**API pagination state** (GitHub fetch tracking):
`repos`, `isLoading`, `isLoadingMore`, `error`, `hasMore`, `currentPage`, `totalCount`, `ratings`

**Display mode state** (presentation only — does not affect data loading):
`displayMode`, `showPaginationControls`, `showInfiniteSentinel`

Initialised from the `?mode` query param on page load. Toggling in the UI calls `facade.setDisplayMode()` directly — no URL write-back needed for functionality, though a query param link like `?mode=infinite` is a convenient shareable demo link. Switching modes never triggers a re-fetch; both modes read from the same in-memory repo cache.

**UI presentation state** (slice + navigation — `visibleRepos` covers both modes):
`visibleRepos`, `visiblePage`, `visibleRangeStart`, `visibleRangeEnd`, `totalLoaded`, `canGoNext`, `canGoPrevious`

In **paginated** mode `visibleRepos` returns a PAGE_SIZE (10) slice of the cache. In **infinite** mode it returns the full accumulated list.

**Three-way distinction:**

| Concept | What it is |
|---|---|
| **API page** | A batch of up to 100 repos fetched from GitHub (`page=N` query param) |
| **UI page** | A visible slice of 10 repos (paginated mode only) |
| **Browsing mode** | How the user navigates the loaded list (`paginated` or `infinite`) |

A single API page fills 10 UI pages. Additional API pages are fetched on demand — either when
the user advances beyond the loaded set in paginated mode, or when the scroll sentinel fires in
infinite mode. The data loading behaviour is identical regardless of browsing mode.

All signals are consumed directly by components; no component manages its own data or navigation state.

---

## Libraries added and why

| Library | Reason |
|---|---|
| `@angular/cdk` | Accessible Dialog — focus trap, Escape, `aria-modal`, focus restoration |
| `@angular/animations` | Required by CDK and `provideAnimationsAsync()` |
| `@testing-library/angular` | Integration tests — test user behavior, not implementation details |
| `@testing-library/user-event` | Realistic user interaction simulation in tests |
| `@testing-library/jest-dom` | Expressive DOM matchers (`toBeVisible`, `toHaveTextContent`, etc.) |
| `eslint` + `angular-eslint` | Linting with Angular-specific rules, ESLint 10 flat config |
| `prettier` | Consistent code formatting |
| `@playwright/test` | Critical-path E2E coverage — 5 scenarios, GitHub API mocked via `page.route()` |

---

## Security and privacy

**The app requires no authentication to run.** It uses the public GitHub Search API, which allows
unauthenticated access. A Personal Access Token is an *optional development/demo aid* — not a
functional dependency — that raises the rate limit from ~10 req/min to 5,000 req/hr. PAT support
was introduced in Step 3 (the first step that makes live API calls). The interceptor is a no-op
when `githubToken` is empty, so the app behaves identically without one.

- GitHub token is **never** hardcoded in any tracked file.
- Local token (optional): create `src/environments/environment.local.ts` (gitignored), set `githubToken`.
- Token is sent only as a `Bearer` Authorization header to `api.github.com` — never stored or logged.
- `localStorage` stores only `{ [repoId]: 1-5 }` — no PII, minimal footprint.
- All data is from the public GitHub API. No user data is collected or transmitted by this app.
- Inter font loaded from Google Fonts at runtime — self-host in production for stricter privacy.

---

## How to run

```bash
npm install           # Install all dependencies
npm start             # Dev server → http://localhost:4200
npm test              # Unit + integration tests (Vitest)
npm run test:watch    # Tests in watch mode
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check (CI-safe)
npm run e2e           # Playwright E2E tests (requires dev server: npm start)
npm run e2e:ui        # Playwright interactive UI
```

---

## Test results

### First run — Step 1 baseline
```
Test Files  1 passed (1)
Tests       2 passed (2)
Duration    6.80s
```
*Both tests were the Angular starter placeholder tests, replaced in Step 2.*

### Final run — Step 9
```
Test Files  14 passed (14)
Tests       184 passed (184)
Duration    11.46s
```

| File | Tests | Layer |
|---|---|---|
| `app.spec.ts` | 3 | Integration — shell landmarks, About button |
| `github-query.utils.spec.ts` | 8 | Unit — UTC date/query builder |
| `github-repo.mapper.spec.ts` | 5 | Unit — domain mapper |
| `github-trending-repos.repository.spec.ts` | 12 | Integration — HTTP, all error kinds, deduplication |
| `rating-persistence.service.spec.ts` | 8 | Unit — localStorage validation + recovery |
| `trending-repos.facade.spec.ts` | 58 | Integration — all facade flows, both display modes, ratings |
| `repo-card.component.spec.ts` | 12 | Component — card rendering, output, a11y |
| `repo-list.component.spec.ts` | 15 | Component — all UI states |
| `repo-pagination.component.spec.ts` | 15 | Component — pagination controls |
| `star-rating.component.spec.ts` | 10 | Component — rendering, hover, interaction |
| `repo-details-dialog.component.spec.ts` | 18 | Component — dialog rendering, save vs dismiss |
| `display-mode-toggle.component.spec.ts` | 7 | Component — segmented control rendering + output |
| `intersection-observer.directive.spec.ts` | 5 | Unit — IntersectionObserver directive |
| `about-dialog.component.spec.ts` | 8 | Component — content sections, close behaviour, a11y |

### E2E — Playwright (5 scenarios, 24 tests)
```
e2e/trending-repos.spec.ts
  ├── Initial page load (6 tests)
  ├── Pagination navigation (5 tests)
  ├── Repo details modal and rating (6 tests)
  ├── Error state (4 tests)
  └── Browsing mode toggle (7 tests)
```
*E2E tests use `page.route()` to intercept GitHub API calls — no live network required.*

---

## Known tradeoffs and future improvements

| Tradeoff | Notes |
|---|---|
| Signals over NgRx | Correct for this scope. Revisit if app grows to multi-feature shared state. |
| No backend proxy | Unauthenticated users hit GitHub's ~10 req/min search limit. Optional PAT mitigates during development and demos. |
| Single lazy route chunk | Fine now. Split further if more features are added. |
| Google Fonts at runtime | Convenient for development. Self-host in production for privacy + performance. |
| `localStorage` for ratings | Simple, no server dependency. Ratings are lost on browser data clear. |
| Draggable dialog deferred | CDK DragDrop drag-to-reposition was intentionally not implemented. Accessibility and focus behaviour take priority; drag can be added if it can be proven regression-free. |
| Browsing mode in URL, not localStorage | Mode resets to `paginated` on a fresh URL. This is intentional — the URL is a better source of truth for shareable demo links. Persisting to localStorage would be a small addition if stickiness across sessions is preferred. |
