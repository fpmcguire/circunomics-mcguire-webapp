# Circunomics GitHub Trending Repos — Implementation Roadmap

> **Status key:** ✅ Done · ⏳ Pending

---

## Step 1 — Tooling Setup ✅ DONE

**Goal:** Clean, verified baseline with all tooling in place before any feature work.

### Delivered
- ESLint (flat config, ESLint 10) + `angular-eslint` + `typescript-eslint`
- Playwright configured (`playwright.config.ts`, `e2e/` directory)
- `@angular/cdk` installed
- `@testing-library/angular` + `user-event` + `jest-dom`
- Prettier installed, configured, all source files formatted
- `src/environments/environment.ts` + `environment.prod.ts` — environment config scaffold with empty `githubToken` field (populated optionally in Step 3)
- `environment.local.ts` pattern documented and added to `.gitignore`
- `package.json` scripts: `lint`, `format`, `format:check`, `e2e`, `e2e:ui`, `test:watch`
- `README.md` rewritten — commands, tooling table, rate-limit guidance
- `PROJECT.md` created — architecture rationale, library decisions, security posture

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 2/2 passing |
| `ng lint` | ✅ All files pass |
| `prettier --check` | ✅ Clean |

---

## Step 2 — Architecture Scaffold + Base Styles ✅ DONE

**Goal:** Folder structure, design system, and app shell before any feature logic.

### Delivered
- All Angular starter placeholder content removed
- Full feature-driven folder structure created (explicit `mkdir` — no brace expansion):
  ```
  src/app/
    core/config|utils|services/
    shared/ui/header|models|pipes|directives/
    features/trending-repos/
      domain/models|mappers|repositories/
      application/facades|state/
      infrastructure/repositories|datasources/
      ui/pages|components|dialogs/
  ```
- `.gitkeep` in all empty directories so scaffold is fully tracked by git
- SCSS design system: `_tokens.scss`, `_reset.scss`, `_typography.scss`, `_utilities.scss`
- `HeaderComponent` — sticky, accessible, `routerLinkActive` + `ariaCurrentWhenActive="page"`
- App shell — `<app-header>` + `<main id="main-content">` + `<router-outlet>`
- `index.html` — `lang="en"`, meta description, Inter font, skip-to-content link
- `app.config.ts` — `provideHttpClient(withFetch())`, `provideAnimationsAsync()`, `withComponentInputBinding()`
- Lazy-loaded route wired to placeholder page component
- `@angular/animations` added (was missing, caused build error)

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 2/2 passing |
| `ng lint` | ✅ All files pass |

---

## Step 3 — Domain + Data Layer ✅ DONE

**Goal:** Type-safe, well-tested data layer that the facade and UI can depend on.

### Delivered

**Domain layer:**
- `GithubRepo` + `GithubRepoOwner` — readonly domain interfaces, zero framework deps
- `mapApiOwner()` + `mapApiRepo()` — pure mapping functions, independently testable
- `TrendingReposRepository` — abstract class as Angular DI token, lives in **domain** (not infra)

**Infrastructure layer:**
- `GithubApiSearchResponse` / `GithubApiRepo` / `GithubApiOwner` — raw API types, infra-only
- `GithubTrendingReposRepository` — full `HttpClient` implementation:
  - UTC-safe `buildCreatedAfterQuery()` query builder
  - Response-shape validation guard before mapping
  - Explicit empty-result handling (`isLastPage: true`, not an error)
  - `finalize()`-based in-flight cache cleanup (not an internal subscribe)
  - Typed error mapping: network / rateLimit / unknown
  - Duplicate concurrent request guard via `inFlight` Map + `shareReplay`

**Core layer:**
- `github-query.utils.ts` — `formatDateForGithub`, `daysAgo`, `buildCreatedAfterQuery` (UTC throughout)
- `github-auth.interceptor.ts` — functional interceptor, fires only for `api.github.com`

  > **Optional PAT support introduced here.** Step 3 is where live API calls begin,
  > so this is the right moment to add rate-limit mitigation. The app works fully
  > without a token (GitHub allows ~10 unauthenticated search req/min). A Personal
  > Access Token raises this to 5,000 req/hr and is useful during development or
  > demos — it is not a functional dependency. See `environment.ts` and `README.md`
  > for setup instructions.

**Shared layer:**
- `app-error.model.ts` — `AppError` discriminated union + `APP_ERRORS` factory functions

**Wired in app.config.ts:**
- `githubAuthInterceptor` registered via `withInterceptors()`
- `TrendingReposRepository` bound to `GithubTrendingReposRepository`

### Tests (27/27 passing)
| File | Tests | Type |
|---|---|---|
| `app.spec.ts` | 2 | Integration — shell landmarks |
| `github-query.utils.spec.ts` | 8 | Unit — date/query builder (UTC edge cases) |
| `github-repo.mapper.spec.ts` | 5 | Unit — domain mapper |
| `github-trending-repos.repository.spec.ts` | 12 | Integration — HTTP, all error kinds, empty results, deduplication, retry-after-error |

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 27/27 passing |
| `ng lint` | ✅ All files pass |
| `prettier --check` | ✅ Clean |

---

## Step 4 — Facade + State ✅ DONE

**Goal:** Single, signal-based application layer that all UI components depend on.

### Delivered

**State layer** `application/state/trending-repos.state.ts`:
- `TrendingReposState` — immutable snapshot interface for all feature state
- `INITIAL_STATE` — clean starting values
- `RatingsMap` — `Record<number, number>` keyed by repo ID

**RatingPersistenceService** `infrastructure/datasources/rating-persistence.service.ts`:
- localStorage read/write with full defensive validation
- Handles: JSON parse failures, non-object values, out-of-range ratings, quota errors
- Silent degradation — never crashes if storage is unavailable
- Stores only `{ [repoId]: 1–5 }` — no PII

**TrendingReposFacade** `application/facades/trending-repos.facade.ts`:
- Public signals: `repos`, `isLoading`, `isLoadingMore`, `error`, `hasMore`, `totalCount`, `currentPage`, `ratings`, `isEmpty`
- Actions: `loadInitial()`, `loadNextPage()`, `retry()`, `setRating()`, `getRating()`
- Concurrent fetch guard via `isFetching` boolean
- `_lastAttemptedPage` — `retry()` replays the exact failed page, not `currentPage + 1`
- ID-based deduplication on page merge
- Provided in `TrendingReposPageComponent.providers` — lifecycle scoped to the feature page, not the app root

**Corrections pass (Tech Lead review):**
- `TrendingReposFacade` moved from `app.config.ts` into `TrendingReposPageComponent.providers`
- `currentPage` exposed as public computed signal
- `retry()` tightened: uses `_lastAttemptedPage` for deterministic page replay
- Stale Step 3/placeholder comments removed from route and page component files
- `isEmpty` test suite rewritten — reads as confident documentation

### Tests (62/62 passing)
| File | Tests | Type |
|---|---|---|
| `app.spec.ts` | 2 | Integration — shell landmarks |
| `github-query.utils.spec.ts` | 8 | Unit — date/query builder |
| `github-repo.mapper.spec.ts` | 5 | Unit — domain mapper |
| `github-trending-repos.repository.spec.ts` | 12 | Integration — HTTP, errors, deduplication |
| `rating-persistence.service.spec.ts` | 8 | Unit — localStorage validation + recovery |
| `trending-repos.facade.spec.ts` | 27 | Integration — all facade flows |

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 62/62 passing |
| `ng lint` | ✅ All files pass |
| `prettier --check` | ✅ Clean |

---

## Step 5 — List UI + Infinite Scroll ✅ DONE

**Goal:** Polished, accessible, responsive repo list with infinite scroll and all UI states.

### Deliverables
- `TrendingReposPageComponent` — replaces placeholder; page heading, list, all states, sentinel
- `RepoListComponent` — semantic `<ul>/<li>`, `role="list"`, all UI state branches
- `RepoCardComponent` — avatar, name button, description, stars badge, issues badge, rating (shown only when `rating > 0`)
- Skeleton loading, loading-more indicator, error + retry, empty state
- `IntersectionObserverDirective` — sentinel-based infinite scroll; `disabled` input prevents churn during active fetches

### Corrections applied after Tech Lead review
- `trending-repos-list-item-name-link` → `trending-repos-list-item-name-button` (element is `<button>`, not `<a>`)
- Rating block hidden when `rating === 0` — only shown after user rates in modal
- `console.log` hook removed from `onNameClick()`
- `IntersectionObserverDirective` hardened with `disabled` input + `connect()`/`disconnect()` cycle
- Duplicate owner text removed from card footer (owner already shown in `owner/repo` title)
- `docs/REQUIREMENTS.md` and `docs/ARCHITECTURE.md` added; `TESTING.md` added at project root

### data-testid conventions
```
trending-repos-page-title     trending-repos-list
trending-repos-list-item      trending-repos-list-item-name-button
trending-repos-list-item-rating
trending-repos-loading        trending-repos-loading-more
trending-repos-error          trending-repos-error-retry
trending-repos-empty
```

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 92/92 passing |
| `ng lint` | ✅ All files pass |

---

## Step 6 — Modal + Rating ⏳ PENDING

**Goal:** Accessible repo details modal with 5-star rating synced back to the list.

### Planned deliverables
- `RepoDetailsDialogComponent` via Angular CDK Dialog
  - Focus trap, Escape closes, backdrop click closes
  - Focus restored to triggering element on close
  - `role="dialog"`, `aria-labelledby`, `aria-modal="true"`
- `StarRatingComponent` — radio-group pattern, ARIA labelled, keyboard navigable
- Rating synced to facade → list shows stars + number after modal closes
- Draggable header via CDK DragDrop **only if** keyboard/focus behavior remains intact

### data-testid conventions
```
repo-details-modal            repo-details-modal-close-button
repo-details-modal-name       repo-details-modal-description
repo-rating-star-1 … repo-rating-star-5
```

---

## Step 7 — Hardening + Tests + Docs ⏳ PENDING

**Goal:** Harden what is already mostly correct. Polish and audit — not catch-up.

### Planned deliverables
- Accessibility audit — keyboard walkthrough, screen reader spot-check, contrast check, fix findings
- Responsive polish — 360px / 768px / 1024px verified, touch targets ≥ 44×44px
- Visual QA — Circunomics design language: clean, spacious, light, teal/blue accents
- Playwright E2E:
  1. Initial page load shows trending repos
  2. Scrolling loads next page
  3. Modal open → rate → close → rating visible in list
  4. Error state displayed when API fails
- `PROJECT.md` finalized — tradeoffs, first + final test run results
- Final verification gate: build ✓ · tests ✓ · lint ✓ · prettier ✓ · E2E ✓

---

## Tech Lead notes (incorporated)

| Feedback | Applied |
|---|---|
| Accessibility built in from start, not retrofitted | Steps 5 & 6 definition of done includes a11y from day one |
| Drag modal explicitly secondary to accessibility | Step 6 — accessibility first, drag conditional on zero regression |
| PROJECT.md should start early | Started in Step 1 ✅ |
| Explicit API error/rate-limit strategy | Step 3 (error mapping) + Step 4 (UX signals) ✅ |
| Step 7 = hardening, not cleanup | Reframed throughout ✅ |
| Repository abstraction belongs in domain, not infra | Fixed in Step 3 correction pass ✅ |
| Use `finalize()` not internal subscribe for cache cleanup | Fixed in Step 3 correction pass ✅ |
| UTC-safe date utilities | Fixed in Step 3 correction pass ✅ |
| Explicit empty-result + malformed-response handling | Fixed in Step 3 correction pass ✅ |
| Docs must stay in sync with actual code | Updated after each step ✅ |
