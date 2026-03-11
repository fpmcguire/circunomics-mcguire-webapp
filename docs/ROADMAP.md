# Circunomics GitHub Trending Repos — Implementation Roadmap

> **Status key:** ✅ Done · 🔄 In Progress · ⏳ Pending

---

## Step 1 — Tooling Setup ✅ DONE

**Goal:** Clean, verified baseline with all tooling in place before any feature work.

### Delivered
- ESLint (flat config, ESLint 10) + `angular-eslint` + `typescript-eslint`
- Playwright configured (`playwright.config.ts`, `e2e/` directory)
- `@angular/cdk` installed (accessible dialog + future drag support)
- `@testing-library/angular` + `user-event` + `jest-dom`
- Prettier installed, configured, all source files formatted
- `src/environments/environment.ts` + `environment.prod.ts` — GitHub token support, never hardcoded
- `environment.local.ts` added to `.gitignore`
- `package.json` scripts: `lint`, `format`, `format:check`, `e2e`, `e2e:ui`, `test:watch`
- `README.md` rewritten — commands, tooling table, rate-limit guidance
- `PROJECT.md` created — architecture rationale, library decisions, security posture, first test run recorded

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 2/2 passing |
| `ng lint` | ✅ All files pass |
| `prettier --check` | ✅ Clean |

---

## Step 2 — Architecture Scaffold + Base Styles ✅ DONE

**Goal:** Folder structure, design system, and app shell in place before any feature logic.

### Delivered
- All Angular starter placeholder content removed
- Feature-driven folder structure created (explicit `mkdir` — no brace expansion):
  ```
  src/app/
    core/config|utils|services/
    shared/ui/header|models|pipes|directives/
    features/trending-repos/
      domain/models|mappers/
      application/facades|state/
      infrastructure/repositories|datasources/
      ui/pages|components|dialogs/
  ```
- SCSS design system (`src/styles/`):
  - `_tokens.scss` — CSS custom properties: colors, spacing, radius, shadow, typography, transitions
  - `_reset.scss` — base reset, `:focus-visible` keyboard focus ring
  - `_typography.scss` — text size/color/weight utilities, truncation helpers
  - `_utilities.scss` — `.sr-only`, `.skeleton` shimmer, `.badge`, `.icon-btn`
- `HeaderComponent` — sticky, accessible (`role="banner"`, aria labels, keyboard nav)
- App shell — `<app-header>` + `<main id="main-content">` + `<router-outlet>`
- `index.html` — `lang="en"`, meta description, Inter font, skip-to-content link
- `app.config.ts` — `provideHttpClient(withFetch())`, `provideAnimationsAsync()`, `withComponentInputBinding()`
- `app.routes.ts` — lazy-loaded route to trending page, `**` redirect
- `@angular/animations` added (was missing, caused build error)
- Font inlining disabled in prod config (sandbox network; runtime loading unaffected)
- `app.spec.ts` replaced with meaningful shell tests (header landmark, main landmark)

### Verification
| Check | Result |
|---|---|
| `ng build` | ✅ Clean |
| `ng test` | ✅ 2/2 passing |
| `ng lint` | ✅ All files pass |

---

## Step 3 — Domain + Data Layer ⏳ PENDING

**Goal:** Type-safe, well-tested data layer that the facade and UI can depend on.

### Planned deliverables
- `GithubRepo` domain model + `GithubRepoOwner` interface
- `GithubApiResponse` raw API response type (infrastructure-layer only)
- **Mapper** — pure function `mapGithubApiRepo → GithubRepo` (unit tested)
- **Date/query builder utility** — computes `created:>YYYY-MM-DD` dynamically (unit tested)
- `TrendingReposRepository` abstract interface (domain layer)
- `GithubTrendingReposRepository` implementation via `HttpClient`
- **HTTP interceptor** — injects optional GitHub Bearer token from environment config
- **API error mapping** — explicit handling for:
  - Network failures
  - Rate-limit responses (403 / 429)
  - Empty result sets
  - Unexpected API shape changes
- **Duplicate request guard** — built into repository layer, not the facade

### Tests
- Unit: mapper function
- Unit: date/query builder
- Unit: error mapping logic

---

## Step 4 — Facade + State ⏳ PENDING

**Goal:** Single, signal-based application layer that all UI components depend on.

### Planned deliverables
- `TrendingReposFacade` with signals:
  - `repos` — loaded repository list
  - `isLoading` — initial page load state
  - `isLoadingMore` — subsequent page load state
  - `error` — typed error state (network | rateLimit | unknown)
  - `hasMore` — controls infinite scroll sentinel
  - `currentPage` — pagination tracker
- Pagination merge logic — append pages, deduplicate by repo ID
- Concurrent request guard — prevents multiple simultaneous page fetches
- Rating signal map keyed by repository ID
- `RatingPersistenceService` — localStorage read/write, minimal stored data (id → rating only)
- Rate-limit UX signal — surfaces clear user-facing message when GitHub throttles

### Tests (integration-focused)
- Initial load flow
- Pagination / page append
- Error state transitions
- Retry after error
- Rating update and persistence round-trip
- Duplicate load guard

---

## Step 5 — List UI + Infinite Scroll ⏳ PENDING

**Goal:** Polished, accessible, responsive repo list with infinite scroll and all UI states.

### Planned deliverables
- `TrendingReposPageComponent` — replaces Step 2 placeholder; page heading, list, states
- `RepoListComponent` — semantic `<ul>/<li>`, `role="list"`, `aria-label`
- `RepoCardComponent`:
  - Owner avatar (`<img>` with descriptive `alt`)
  - Repo name as clickable link (opens modal)
  - Description with 2-line clamp
  - Stars badge (teal accent)
  - Open issues badge (blue accent)
  - Owner username
  - Star rating display (filled stars + numeric badge) — visible after modal rating
- Loading skeleton state — shimmer placeholders for initial load
- Loading-more indicator — spinner/bar for page 2+
- Error state — descriptive message + retry button
- Empty state — friendly illustration + message
- `IntersectionObserverDirective` — sentinel-based infinite scroll, fallback deduplication guard
- **Accessibility built in from the start** (not retrofitted):
  - Semantic HTML throughout
  - Visible focus states on all interactive elements
  - Screen-reader text for star counts, issue counts, loading states
  - All `data-testid` attributes applied as components are built

### data-testid conventions
```
trending-repos-page-title
trending-repos-list
trending-repos-list-item
trending-repos-list-item-name-link
trending-repos-list-item-rating
trending-repos-loading
trending-repos-loading-more
trending-repos-error
trending-repos-error-retry
trending-repos-empty
```

### Tests (integration-focused)
- List renders with loaded data
- Skeleton shown during initial load
- Error state shown with retry action
- Empty state shown for zero results
- Infinite scroll sentinel triggers next page load
- Rating badge visible after rating is set

---

## Step 6 — Modal + Rating ⏳ PENDING

**Goal:** Accessible, polished repo details modal with 5-star rating synced back to the list.

### Planned deliverables
- `RepoDetailsDialogComponent` via Angular CDK Dialog:
  - Focus trap on open
  - Escape key closes
  - Backdrop click closes
  - Focus restored to triggering element on close
  - `role="dialog"`, `aria-labelledby`, `aria-modal="true"`
- Modal content — same repo details as list card, expanded layout
- `StarRatingComponent`:
  - Radio-group pattern (`<input type="radio">`) for full keyboard accessibility
  - ARIA labelled (`rate this repository, N of 5 stars`)
  - Visual filled/empty star rendering
  - Emits rating change event
- **Draggable header via CDK DragDrop** — implemented only if keyboard/focus behavior remains fully intact; otherwise deferred with a clear code hook for later addition
- Rating synced to `TrendingReposFacade` on change
- List reflects rating (filled stars + number) after modal closes

### data-testid conventions
```
repo-details-modal
repo-details-modal-close-button
repo-details-modal-name
repo-details-modal-description
repo-rating-star-1 … repo-rating-star-5
```

### Tests (integration-focused)
- Modal opens on repo name click
- Modal closes on close button
- Modal closes on Escape key
- Focus returns to triggering element after close
- Rating selection updates the star control
- Closing modal reflects rating in list item

---

## Step 7 — Hardening + Tests + Docs ⏳ PENDING

**Goal:** Harden what is already mostly correct. This is a polish and audit phase — not a catch-up phase.

### Planned deliverables

#### Accessibility audit
- Manual keyboard-only walkthrough of full app
- Screen reader spot-check (VoiceOver / NVDA)
- Colour contrast check against WCAG AA
- Fix any findings — do not defer

#### Responsive polish
- Mobile (360px+), tablet (768px+), desktop (1024px+) verified
- No layout shift, no overflow, no truncation disasters
- Touch target sizes ≥ 44×44px on mobile

#### Visual QA
- Verify against Circunomics design language: clean, spacious, light, teal/blue accents
- Consistent spacing, shadow, and radius usage throughout

#### Playwright E2E (3–4 tests only)
1. Initial page load shows trending repositories
2. Scrolling to bottom loads next page
3. Opening a repo modal, rating it, closing, seeing rating in list
4. Error state displayed when API fails *(only if cleanly testable)*

#### Documentation
- `PROJECT.md` finalized:
  - Architecture approach and rationale
  - Folder structure overview
  - Libraries added and why
  - State management approach
  - Accessibility decisions
  - Testing strategy summary
  - GDPR / privacy notes
  - Known tradeoffs and future improvements
  - First test run result (recorded in Step 1)
  - Final test run result

#### Final verification gate
| Check | Required result |
|---|---|
| `ng build` | ✅ Clean, no warnings |
| `ng test` | ✅ All passing |
| `ng lint` | ✅ Zero errors |
| `npm run format:check` | ✅ Clean |
| `playwright test` | ✅ All E2E passing |

---

## Tech Lead notes (incorporated)

| Feedback | Applied |
|---|---|
| Accessibility built in from start, not retrofitted | Steps 5 & 6 definition of done includes a11y from day one |
| Drag modal explicitly secondary to accessibility | Step 6 — accessibility first, drag conditional on zero regression |
| PROJECT.md should start early | Started in Step 1 ✅ |
| Explicit API error/rate-limit strategy | Step 3 (error mapping) + Step 4 (UX signals) |
| Step 7 = hardening phase, not cleanup | Reframed — "harden what is already mostly correct" |
| Prettier must be installed or removed | Installed in Step 1 ✅ |
| ESLint must ignore generated folders | Added in Step 1 ✅ |
| Token guidance must not encourage editing tracked files | Tightened in Step 1 ✅ |
| Verification must be evidenced | Build/lint/test outputs recorded at each step ✅ |
