# Circunomics GitHub Trending Repos — Implementation Roadmap

> **Status key:** ✅ Done · ⏳ Pending

---

## Step 9 — About modal / app context overlay ✅ DONE

**Goal:** Add a polished, accessible About modal that explains what the app does, how both browsing modes work, how ratings work, what data comes from GitHub, and how the app handles API rate limits — written in calm, user-facing language, not developer jargon.

### Why this was added

A reviewer or first-time user encountering the app has no in-product explanation of its purpose, the browsing mode toggle, or the rating feature. The About modal closes that gap without cluttering the main interface — it lives behind a single, discoverable button in the header.

The rate-limit section is specifically valuable for demo contexts: it sets expectations, explains the Retry path, and mentions that a personal access token can improve resilience in a secure setup.

### Delivered

**`AboutDialogComponent`** (`src/app/shared/ui/dialogs/about-dialog/`):
- Placed in `shared/ui/dialogs/` — app-level concern triggered from the header, not feature-specific like `RepoDetailsDialog`
- Same CDK Dialog system used throughout the app — no second modal mechanism introduced
- Purely presentational — no injected data, no state; just content and a close action
- Six content sections: What this app does · Browsing modes · Ratings · Data source · GitHub API limits · About this implementation
- `data-testid` on all three required sections plus title, modal root, and both close controls

**Header About button** (`app-header__about-btn`):
- Inline info icon + "About" label — visually consistent with the existing nav link style
- `data-testid="app-about-button"`, `aria-label="About this app"`, `min-height: 44px` touch target
- `ChangeDetectionStrategy.OnPush` added to `HeaderComponent` at the same time

**Overlay stacking:**
- CDK Dialog renders each dialog into its own overlay portal in DOM order — the last-opened dialog naturally sits on top with no z-index hacks required
- Opening About while a repo details dialog is open works correctly: About is the active focus-trapped surface; closing About returns focus to the About trigger, leaving the underlying dialog intact
- Decision documented in both the component JSDoc and `styles.scss`

**Global CDK overlay styles** (`styles.scss`):
- `.about-dialog-backdrop` — `rgb(0 0 0 / 0.5)` — slightly deeper than repo-details to signal it is the top layer
- `.about-dialog-panel` — `width: min(560px, 95vw); max-height: 88vh`

**Responsive:**
- Scrollable body (`overflow-y: auto; scrollbar-gutter: stable`) — long content never overflows the modal
- Definition list for browsing modes stacks vertically below 480px
- 44px minimum touch targets on all interactive elements

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="about-dialog-title"` on the host element
- `aria-labelledby` wired to `<h2 id="about-dialog-title">` — CDK receives `ariaLabelledBy` in `dialog.open()` config as well
- CDK focus trap — Tab cycles within the modal only
- Escape closes (CDK default)
- Backdrop click closes (CDK default)
- Focus returns to the About button when modal closes

**New tests:**
- `about-dialog.component.spec.ts` — 8 tests: title rendering, three required section testids, close button presence, X click closes, footer Close button closes, aria-labelledby wiring
- `app.spec.ts` — 1 new test: About button present in header (2 → 3 tests)
- `e2e/trending-repos.spec.ts` — new scenario 7: button visible, opens modal, key sections present, X closes, Escape closes, opens cleanly over repo-details dialog

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean (1 pre-existing budget warning on dialog SCSS) |
| `ng test` | ✅ 184/184 passing (14 files) |
| `ng lint` | ✅ All files pass |

---

## v2.1.0 — Step 9 Polish & Hygiene ✅ DONE

**Goal:** Consolidate enhancements made during Step 9 review into a clean release.

### Changes

- **About modal "What's next" section** — grouped roadmap chips (Discovery & search · Detail & analysis · Personalisation) surfacing future features in user-facing language
- **`:host` selector fix in `app.scss`** — `.app-root` was compiled under `_ngcontent` by Angular's Emulated view encapsulation and never matched the host element; switching to `:host` activates the full flex chain and makes the internal scroll container work as intended
- **Global `app-root` fallback** in `styles.scss` — defensive type selector alongside `:host` for hot-reload and render timing edge cases
- **About dialog overlay CSS improvements** — `100dvh`-aware height, `@supports` fallback for older browsers, tighter viewport-aware width
- **Pagination scroll fix** — `(previousClick)` and `(nextClick)` on the pagination template now correctly route through `onPreviousClick()` / `onNextClick()` on the page component, which also call `_scrollListToTop()`; previously the scroll reset was bypassed
- **`--color-surface-raised` design token added** to `_tokens.scss` — was referenced but undefined, causing the roadmap section background to render as transparent
- **4 new pagination a11y tests** — aria-labels on previous, next, and top buttons; nav landmark label
- **`targeted-e2e.log` removed and added to `.gitignore`**
- **`playwright-report/` removed** from committed tree (already in `.gitignore`)
- **Version bumped** — `package.json` and footer: `2.0.0 → 2.1.0`
- **`TESTING.md` updated** — test counts corrected to 192; `test:ci` script documented for CI usage
- **`package.json`** — `test:ci` script added (`ng test --watch=false`) for clean CI exit
- **README rate-limit wording tightened** — now explicitly names the GitHub Search API sub-limit (10 req/min unauthenticated, 30 req/min authenticated) rather than mixing Search and general REST limits
- **`docs/ARCHITECTURE.md`** — page component comment clarified: hosts the mode toggle UI but facade owns the runtime display-mode state

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean, no warnings |
| `ng test` | ✅ 192/192 passing (14 files) |
| `ng lint` | ✅ All files pass |

---

## v2.0.0 — Post-Step-8 Hygiene Pass ✅ DONE

**Goal:** Submission-clean repo — no committed generated artifacts, accurate docs, consistent wording.

### Delivered
- Removed committed `playwright-report/index.html` (generated output; covered by `.gitignore`)
- Removed `src/app/core/config/.gitkeep` and `src/app/shared/pipes/.gitkeep` — both directories were never populated and had no committed content beyond the placeholder
- Fixed `docs/ARCHITECTURE.md` — two passages incorrectly described display mode as living in the page component and being derived from `queryParams` via `toSignal()`; corrected to reflect the actual implementation: `_displayMode` signal on the facade, initialised once from `ActivatedRoute.snapshot` at page load
- Polished pagination count wording: range indicator now reads `Showing X–Y of Z loaded`; page header reads `N repositories found on GitHub` — the two numbers are now clearly distinct
- Refactored E2E fixtures into `e2e/helpers.ts` (`makeRepo` factory, `FIFTEEN_REPOS`, `EIGHT_REPOS`, `mockGithubApi`, `mockGithubRateLimit`) — shared across all describe blocks, no inline duplication
- Fixed sentinel E2E test — 15 items with `perPage=100` yields `hasMore=false` so the sentinel never appeared; test now mocks a full 100-item first page; assertion uses `poll()` to handle the race between sentinel appearance and immediate IntersectionObserver fire
- Updated `TESTING.md` E2E file tree to match actual describe block names
- Bumped `package.json` version to `2.0.0`

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 175/175 passing (13 files) |
| `ng lint` | ✅ All files pass |

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
    core/utils|services/
    shared/ui/header|models|directives/
    features/trending-repos/
      domain/models|mappers|repositories/
      application/facades|state/
      infrastructure/repositories|datasources/
      ui/pages|components|dialogs/
  ```
- `.gitkeep` added to empty scaffold directories at creation time; removed in v2.0.0 once all directories had real content (`core/config/` and `shared/pipes/` were never populated)
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

## Step 8 — Dual Browsing Modes ✅ DONE

**Goal:** Restore infinite scroll alongside the existing paginated view, positioning both as experiment-ready browsing experiences selectable at runtime — without duplicating the data layer.

### Why this was added

The original challenge brief asked for infinite scroll. Step 5.5 replaced it with explicit pagination as a deliberate UX experiment. Step 8 makes the choice visible to reviewers by supporting both modes simultaneously and allowing instant switching — demonstrating that the architecture can accommodate alternate browsing experiences without restructuring the app.

Framed as experiment-ready UX exploration: one codebase, one shared data layer, two interchangeable presentation treatments. This mirrors the kind of feature-flag / A/B experimentation pattern common in SaaS products, without requiring an external experimentation SDK.

### Delivered

**`RepoListDisplayMode = 'paginated' | 'infinite'`** — defined in `domain/models/repo-list-display-mode.model.ts` alongside `DEFAULT_DISPLAY_MODE`. Placed in the domain layer because the distinction between browsing modes is a product concept, not a UI implementation detail.

**Facade additions:**
- `_displayMode` private signal, initialised from `DEFAULT_DISPLAY_MODE`
- `displayMode` — public read-only signal
- `showPaginationControls` — `computed(() => displayMode() === 'paginated')`
- `showInfiniteSentinel` — `computed(() => infinite && hasMore && !loading)`
- `visibleRepos` — returns the full accumulated list in infinite mode; the 10-item slice in paginated mode. Single signal, two behaviours, zero branching in templates
- `setDisplayMode(mode)` — switches mode; resets `_uiPage` to 1 when switching to paginated
- `loadMore()` — delegates to `_triggerNextApiPage()`; guarded by existing `isFetching` / `hasMore` / `isLoading` checks; used by the infinite scroll sentinel

**Query param initialisation:**
- `?mode=infinite` or `?mode=paginated` in the URL initialises the mode on page load via `ActivatedRoute.snapshot.queryParamMap`
- Any unrecognised value silently falls back to `DEFAULT_DISPLAY_MODE` (`'paginated'`)
- The facade signal is the runtime source of truth; the URL param is read once at `ngOnInit` — no reactive subscription to `queryParams` needed

**`DisplayModeToggleComponent`** (`ui/components/display-mode-toggle/`):
- Segmented control rendered as a `radiogroup` with two `role="radio"` buttons
- `aria-checked` conveys active/inactive state to screen readers
- Fully keyboard operable; no focus jump on mode switch
- Emits `modeChange: OutputEmitterRef<RepoListDisplayMode>` — holds no state

**`IntersectionObserverDirective`** (`shared/directives/`):
- Accepts `intersectionRoot = input<HTMLElement | null>(null)` — on non-mobile, the list scrolls inside a fixed-height container, so the sentinel must be observed relative to *that element*, not the browser viewport
- `rootMargin` and `threshold` are also configurable inputs; defaults match standard usage
- Sentinel div is `aria-hidden="true"` and 1px tall — no visual or screen-reader footprint
- `OnDestroy` disconnects the observer

**Layout — fixed-height scrollable list container (non-mobile):**
- `body`: `height: 100dvh; display: flex; flex-direction: column` — locks the viewport
- `app-root`, `main.app-main`, `.app-main__container`: each `flex: 1; min-height: 0` — propagate height down the tree
- `:host` and `.repos-page`: same chain
- `.repos-page__list-container`: `flex: 1; min-height: 0; overflow-y: auto; scrollbar-gutter: stable` — fills the exact remaining height between the top pagination bar and the footer; footer is always visible
- Bottom pagination bar (`.repos-page__pagination--bottom`): `display: none` at ≥ 641px; visible on mobile where natural document scroll is used instead
- On mobile (≤ 640px): entire chain is released; page grows with content; no fixed heights

**Page template — conditional rendering by mode:**
- `@if (facade.showPaginationControls())` guards all pagination controls
- `@if (facade.showInfiniteSentinel())` guards the sentinel div and wires `(intersected)="onSentinelIntersected()"`
- `[intersectionRoot]="listContainerRef.nativeElement"` on the sentinel — scopes observation to the scroll container
- `@if (facade.isLoadingMore() && !facade.showPaginationControls())` — loading spinner in infinite mode only
- `facade.visibleRepos()` used in both modes — the facade decides what to return

**New and updated tests:**
- `trending-repos.facade.spec.ts` — 20 new tests covering `loadMore()`, `setDisplayMode()`, `visibleRepos` in both modes, `showPaginationControls`, `showInfiniteSentinel` (38 → 58 total)
- `display-mode-toggle.component.spec.ts` — 7 tests: rendering, `aria-checked` state, `modeChange` emission, no-emit on re-click
- `intersection-observer.directive.spec.ts` — 5 tests: observer setup, intersection/non-intersection events, custom root element, disconnect on destroy
- `e2e/trending-repos.spec.ts` — new scenario 5: toggle visibility, default mode, switching hides/shows controls, sentinel shown, query param initialisation, ratings persist across switch

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean (1 budget warning on dialog SCSS — pre-existing) |
| `ng test` | ✅ 175/175 passing (13 files) |
| `ng lint` | ✅ All files pass |
| E2E | ✅ 5 scenarios written across 2 test groups in `trending-repos.spec.ts` |

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

---

## What comes next

Proposed future features — including discovery tools, detail & analysis enhancements, and personalisation capabilities — are tracked and prioritised in **[FUTURE-FEATURES.md](./FUTURE-FEATURES.md)**.

That document is the single source of truth for proposed scope beyond the current implementation. It covers ROI scoring, product rationale, technical notes, and a recommended implementation order.
