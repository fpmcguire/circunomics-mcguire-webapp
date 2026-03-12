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
- Actions: `loadInitial()`, `goToNextPage()`, `goToPreviousPage()`, `retry()`, `setRating()`, `getRating()`
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

## Step 5 — List UI ✅ DONE

**Goal:** Polished, accessible, responsive repo list with all UI states.

### Deliverables
- `TrendingReposPageComponent` — replaces placeholder; page heading, list, all states
- `RepoListComponent` — semantic `<ul>/<li>`, `role="list"`, all UI state branches
- `RepoCardComponent` — avatar, name button, description, stars badge, issues badge, rating (shown only when `rating > 0`)
- Skeleton loading, error + retry, empty state
- `IntersectionObserverDirective` — utility directive retained in shared/directives (used by future scroll needs); removed from page template as part of Step 5.5

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
trending-repos-loading
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

## Step 5.5 — Paginated List View ✅ DONE

**Goal:** Replace the continuous infinite-scroll browsing experience with an explicit paginated list — a deliberate UX/product adjustment beyond the original challenge brief, introduced at stakeholder request.

### Context and rationale

The original challenge specification asked for infinite scroll. After Step 5 shipped, stakeholders requested a bounded list presentation with explicit page navigation. Step 5.5 implements that enhancement while preserving the underlying on-demand GitHub API pagination architecture intact.

**Key design decision:** The word "pagination" means two different things in this codebase and they are kept strictly separate:

| Term | What it means |
|---|---|
| **API page** | A batch of up to 100 repos fetched from the GitHub Search API (`page=N` query param) |
| **UI page** | A visible slice of 10 repos rendered to the user at one time |

A single API page fills 10 UI pages. The system fetches additional API pages only when the user navigates beyond what is already cached in memory.

### Deliverables

**Facade additions (`TrendingReposFacade`):**
- `_uiPage` — private signal tracking current UI page (1-indexed)
- `_pendingUiPage` — pending navigation target while an API fetch is in-flight
- `visiblePage` — read-only public signal
- `visibleRepos` — computed slice of 10 repos for the current UI page
- `visibleRangeStart` / `visibleRangeEnd` — 1-indexed range for the range indicator
- `totalLoaded` — total repos in the in-memory cache
- `canGoNext` / `canGoPrevious` — computed booleans accounting for cache and API state
- `goToNextPage()` — instant if cached; triggers API fetch + advances only after data arrives
- `goToPreviousPage()` — instant decrement, always operates on cached data
- `PAGE_SIZE = 10` constant (named separately from `API_PER_PAGE`)

**New component:**
- `RepoPaginationComponent` — fully presentational; receives all state as inputs, emits `previousClick` / `nextClick`; Previous/Next buttons, page indicator, range indicator, loading spinner on Next during fetch

**Updated components:**
- `TrendingReposPageComponent` — imports `RepoPaginationComponent`; binds all facade pagination signals; `IntersectionObserverDirective` removed from template
- `RepoListComponent` — `isLoadingMore` input removed (loading feedback moved to pagination control)

**Removed from Step 5:**
- Infinite scroll sentinel `<div>` in page template
- `isLoadingMore` input on `RepoListComponent`
- Loading-more indicator block in `RepoListComponent` template

### data-testid additions
```
trending-repos-pagination
trending-repos-pagination-prev-button   trending-repos-pagination-next-button
trending-repos-pagination-page-indicator
trending-repos-pagination-range-indicator
```

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 115/115 passing |
| `ng lint` | ✅ All files pass |

---

## Step 6 — Modal + Rating ✅ DONE

**Goal:** Accessible repo details modal with 5-star rating synced back to the list.

### Delivered

**`StarRatingComponent`** `ui/components/star-rating/`:
- Radio-group pattern — browser handles arrow-key navigation natively
- Controlled component: parent owns the persisted rating via `currentRating` input signal
- Hover preview: `hoverRating` signal drives visual fill before selection is committed
- `displayRating` computed signal — hover takes priority over persisted rating
- `focus-within` outline on each label for keyboard visibility
- data-testids: `repo-rating-star-1` … `repo-rating-star-5`

**`RepoDetailsDialogComponent`** `ui/dialogs/repo-details-dialog/`:
- Opened via Angular CDK `Dialog` service — CDK provides: focus trap, Escape closes, backdrop click closes, `role="dialog"`, `aria-modal="true"`, focus restoration to triggering element
- `ariaLabelledBy: 'repo-details-dialog-title'` connects dialog title to overlay accessible name
- Data injected via CDK `DIALOG_DATA` token — `{ repo, currentRating }`
- `selectedRating` signal tracks the user's in-dialog selection; initialized from `currentRating`
- Closes with `{ stars: selectedRating() }` via both X icon button and footer Close button
- Shows: owner avatar, full name, description, star count, open issues, creation date, GitHub link, rating section
- `aria-live="polite"` rating feedback region announces selection changes
- data-testids: `repo-details-modal`, `repo-details-modal-close-button`, `repo-details-modal-name`, `repo-details-modal-description`

**`TrendingReposPageComponent` — updated:**
- Injects CDK `Dialog` service
- `onNameClick(repo)` opens the dialog passing `{ repo, currentRating: facade.getRating(repo.id) }`
- Subscribes to `dialogRef.closed` — calls `facade.setRating(repoId, stars)` when `stars > 0`
- Star rating appears on the card list immediately after dialog closes (reactive via facade signal)

**Global overlay styles** (`styles.scss`):
- `.repo-details-dialog-backdrop` — semi-transparent black at 45% opacity
- `.repo-details-dialog-panel` — `width: min(600px, 95vw)`, `max-height: 90vh`

**Rating flow — Option A (explicit save):**
1. Dialog opens with current persisted rating pre-filled
2. User selects a star → `selectedRating` signal updates (preview only — not yet committed)
3. **"Save rating"** button (enabled only when `canSave()`) → `saveAndClose()` → `dialogRef.close({ stars })`
4. X icon / Cancel button / Escape / backdrop → `dismiss()` → `dialogRef.close()` (no result — rating unchanged)
5. Page receives close result — persists only when result is defined and `stars > 0`

**External link accessibility** (`View on GitHub`):
- SVG icon is `aria-hidden="true"` + `focusable="false"`
- Visually-hidden `<span class="sr-only">(opens in new tab)</span>` appended inside the `<a>` for clean screen-reader announcement

**Draggable dialog — intentionally deferred:**
- CDK DragDrop drag-to-reposition was evaluated and deliberately not implemented
- Focus trap, keyboard navigation, and Escape handling are prioritised over drag interaction
- If drag is added in a future iteration it must be verified to leave all accessibility behaviour intact
- Documented in component JSDoc

### data-testid conventions
```
repo-details-modal            repo-details-modal-close-button
repo-details-modal-name       repo-details-modal-description
repo-rating-star-1 … repo-rating-star-5
```

### Tests (143/143 passing)
| File | Tests | New? |
|---|---|---|
| `app.spec.ts` | 2 | — |
| `github-query.utils.spec.ts` | 8 | — |
| `github-repo.mapper.spec.ts` | 5 | — |
| `github-trending-repos.repository.spec.ts` | 12 | — |
| `rating-persistence.service.spec.ts` | 8 | — |
| `trending-repos.facade.spec.ts` | 38 | — |
| `repo-card.component.spec.ts` | 12 | — |
| `repo-list.component.spec.ts` | 15 | — |
| `repo-pagination.component.spec.ts` | 15 | — |
| `star-rating.component.spec.ts` | 10 | ✅ New |
| `repo-details-dialog.component.spec.ts` | 18 | ✅ New |

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 143/143 passing |
| `ng lint` | ✅ All files pass |

### Corrections applied after Tech Lead review
| Feedback | Applied |
|---|---|
| Stale `infrastructure/repositories/trending-repos.repository.ts` | ✅ Deleted |
| `docs/REQUIREMENTS.md` definition of done contradicts Step 5.5 | ✅ Rewritten — notes original brief, implemented behaviour, and rationale link |
| Dialog dismissal should not implicitly commit rating | ✅ Option A — explicit **Save rating** button; X / Cancel / Escape / backdrop all dismiss without saving |
| Draggable dialog — document intentional deferral | ✅ Documented in component JSDoc and ROADMAP |
| `IntersectionObserverDirective` — decide: keep or remove | ✅ Removed — no remaining usage |
| External-link SVG should be `aria-hidden` + `sr-only` span | ✅ Applied |

---

## Step 7 — Hardening + Tests + Docs ✅ DONE

**Goal:** Harden what is already mostly correct. Polish and audit — not catch-up.

### Delivered

**`RepoCardComponent` — modernized to Angular signal APIs:**
- `@Input({ required: true }) repo` → `input.required<GithubRepo>()`
- `@Input() rating` → `input(0)`
- `@Output() nameClick = new EventEmitter()` → `output<GithubRepo>()`
- `get starArray()`, `get formattedStars()`, `get ratingLabel()` → `computed()` signals
- Template updated to signal-call syntax (`repo()`, `rating()`, `formattedStars()`, etc.)
- Spec updated to subscribe via `fixture.componentInstance.nameClick.subscribe()`
- Now consistent with `StarRatingComponent` and `RepoPaginationComponent`

**`TrendingReposPageComponent` — subscription safety:**
- `ref.closed.subscribe(...)` → `ref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)`
- `DestroyRef` injected; safe against the (theoretical) case of component destruction
  before a dialog result arrives

**Accessibility hardening:**
- `<main id="main-content">` gains `tabindex="-1"` — skip-to-content link now correctly
  moves keyboard focus to the main content region on activation
- `repo-card__name` button: explicit `background: none; border: none; padding: 0;` reset
  removes all browser default button chrome cleanly
- `repo-card__name` button: `min-height: 44px` ensures the touch target meets the
  44×44px minimum for pointer/touch users; `align-items: center` keeps text vertically centred
- `repo-card__name` button: `&:focus-visible` outline added — keyboard focus ring now visible

**Responsive polish:**
- Page component: `padding` reduces from `var(--space-8) var(--space-6)` to
  `var(--space-6) var(--space-4)` at `max-width: 400px` — legible at 360px
- Repo card: `padding` reduces from `var(--space-5) var(--space-6)` to `var(--space-4)`
  at `max-width: 400px` — cards stay readable and unclipped on narrow screens
- Pagination breakpoint at 480px already present from Step 5.5

**Playwright E2E — 4 critical-path scenarios (17 tests):**
- `e2e/helpers.ts` — mock data factory (`makeRepo`, `FIFTEEN_REPOS`, `EIGHT_REPOS`),
  `mockGithubApi()` and `mockGithubRateLimit()` route interceptors
- `e2e/trending-repos.spec.ts`:
  1. **Initial page load** — title, repo list, 10 cards, count, pagination controls
  2. **Pagination navigation** — disabled prev on page 1, Next advances, range label, prev returns to page 1, page indicator
  3. **Modal + rating** — open, name/description shown, Save disabled before star selection,
     rating appears on card after save, X dismiss does not save, Escape does not save
  4. **Error state** — rate limit error shown, retry button present, retry re-fetches successfully
- All tests use `page.route()` — deterministic, no live network required

**`PROJECT.md` finalized:**
- Folder structure updated to reflect full delivered codebase
- Final test run results recorded (143 unit/integration + 17 E2E)
- E2E section added with scenario breakdown
- Draggable dialog deferral noted in known tradeoffs

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 143/143 passing |
| `ng lint` | ✅ All files pass |
| E2E | ✅ 17 tests written across 4 scenarios |

### Carry-forward items — resolved
| Item | Resolution |
|---|---|
| `RepoCardComponent` `@Input`/`@Output` modernization | ✅ Done — `input()`/`output()` throughout |
| `ref.closed.subscribe()` subscription cleanup | ✅ Done — `takeUntilDestroyed()` applied |

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
