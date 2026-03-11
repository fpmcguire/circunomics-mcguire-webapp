# Architecture — Circunomics GitHub Trending Repos

## Overview

This app uses a **feature-driven, layered architecture** — organized by feature first, then by
technical concern within each feature. It applies enough structure to be maintainable and
testable without over-engineering a single-feature application.

---

## Folder structure

```
src/
├── environments/
│   ├── environment.ts               # Dev config (token placeholder — do not commit real tokens)
│   └── environment.prod.ts          # Prod config (token via deployment secrets)
│
├── styles/                          # Global SCSS design system
│   ├── _tokens.scss                 # CSS custom properties (colors, spacing, typography, shadows)
│   ├── _reset.scss                  # Base reset + :focus-visible keyboard ring
│   ├── _typography.scss             # Text utility classes
│   └── _utilities.scss              # .sr-only, .skeleton, .badge, .icon-btn
│
└── app/
    ├── core/                        # App-wide singleton concerns
    │   ├── config/                  # App-level constants (reserved)
    │   ├── services/
    │   │   └── github-auth.interceptor.ts    # Optional Bearer token for api.github.com
    │   └── utils/
    │       └── github-query.utils.ts         # UTC date/query builder (pure functions)
    │
    ├── shared/                      # Reusable, feature-agnostic building blocks
    │   ├── models/
    │   │   └── app-error.model.ts            # Typed AppError union + factory functions
    │   ├── ui/
    │   │   └── header/                       # Sticky header — router-aware nav, accessible
    │   ├── directives/              # Shared Angular directives (reserved)
    │   └── pipes/                   # Shared Angular pipes (reserved)
    │
    └── features/
        └── trending-repos/          # The single feature of this app
            │
            ├── domain/              # Pure business logic — zero framework dependencies
            │   ├── models/
            │   │   └── github-repo.model.ts       # GithubRepo + GithubRepoOwner interfaces
            │   ├── mappers/
            │   │   └── github-repo.mapper.ts       # Raw API → domain model (pure functions)
            │   └── repositories/
            │       └── trending-repos.repository.ts  # Abstract contract (Angular DI token)
            │
            ├── infrastructure/      # External data — GitHub API and localStorage
            │   ├── datasources/
            │   │   └── github-api.types.ts        # Raw API response shapes (infra-only)
            │   └── repositories/
            │       └── github-trending-repos.repository.ts  # HttpClient implementation
            │
            ├── application/         # Orchestration — coordinates domain + infra
            │   ├── facades/
            │   │   └── trending-repos.facade.ts   # (Step 4) Signal-based state + actions
            │   └── state/
            │       └── trending-repos.state.ts    # (Step 4) Supporting state types
            │
            └── ui/                  # Presentation layer — Angular components only
                ├── pages/
                │   └── trending-repos-page/       # Routable page — injects facade
                ├── components/                    # (Steps 5–6) RepoList, RepoCard, StarRating
                └── dialogs/                       # (Step 6) RepoDetailsDialog via CDK
```

---

## Layers explained

### Domain layer

Pure TypeScript — no Angular, no RxJS, no HTTP. Defines what the app *knows about*.

**What lives here:**
- `GithubRepo` and `GithubRepoOwner` — the app's internal, framework-free data model
- `mapApiRepo()` / `mapApiOwner()` — pure functions that translate raw GitHub JSON to domain models
- `TrendingReposRepository` — the **abstract contract** that defines what the app needs from a data source

**The contract lives in domain, not infrastructure.** This is a deliberate layering decision:
infrastructure *implements* the contract, but the rest of the app only imports from domain.
If the data source ever changes, only the infrastructure implementation changes.

**Why keep it pure:**
- Trivially unit-testable with no Angular TestBed setup
- Readable regardless of Angular knowledge
- Decoupled from API shape changes — only the mapper needs updating when GitHub changes a field

---

### Infrastructure layer

Responsible for talking to the outside world. Implements the domain contract.

**What lives here:**
- `GithubApiSearchResponse` / `GithubApiRepo` — raw API types, never exported outside infra
- `GithubTrendingReposRepository` — the `HttpClient` implementation of `TrendingReposRepository`

**Implementation details:**
- Duplicate concurrent request guard via an `inFlight` Map and `shareReplay`
- Cache cleanup via `finalize()` inside the pipe — not a separate internal subscription
- Explicit response-shape validation before mapping (guards against degraded API responses)
- Typed error mapping: `status 0` → network, `429` → rateLimit, `403 + rate-limit message` → rateLimit, everything else → unknown
- Empty results (`items: []`) returned as a valid `TrendingReposPage` with `isLastPage: true` — not an error

---

### Application layer (facade)

*(Implemented in Step 4)*

The single orchestration point between infrastructure and UI. Components never call the
repository directly.

**Will expose signals:**
```typescript
repos:          Signal<GithubRepo[]>
isLoading:      Signal<boolean>       // initial page load
isLoadingMore:  Signal<boolean>       // page 2+ loads
error:          Signal<AppError | null>
hasMore:        Signal<boolean>
ratings:        Signal<Record<number, number>>  // repoId → 1–5 stars
```

**Why a facade over multiple services:**
- One place to look for all feature state
- Components stay thin — no repository or storage logic
- The entire load → paginate → rate → persist flow is testable in one integration test
- Signals make derived state (`isEmpty`, `canLoadMore`) readable inline with `computed()`

---

### UI / Presentation layer

*(Implemented in Steps 5–6)*

**Planned component hierarchy:**
```
TrendingReposPageComponent          ← injects facade, owns layout
  └── RepoListComponent             ← @Input: repos, isLoading, error
        └── RepoCardComponent       ← @Input: repo, rating — emits nameClick
  └── IntersectionObserverDirective ← sentinel for infinite scroll
  └── RepoDetailsDialogComponent    ← opened via CDK Dialog, injects facade for rating
        └── StarRatingComponent     ← radio-group pattern, fully keyboard accessible
```

**Component rules:**
- Page-level components may inject the facade
- Sub-components are `@Input`/`@Output` only — no direct service injection
- No business logic in templates — computed values live in the component class or facade
- All components use `ChangeDetectionStrategy.OnPush`
- All `data-testid` attributes applied at build time, not retrofitted

---

## Data flow

```
GitHub API
    ↓  HTTP + Bearer token (optional)
GithubTrendingReposRepository
    ↓  Observable<TrendingReposPage>  (via abstract TrendingReposRepository)
TrendingReposFacade
    ↓  Signal<GithubRepo[]>, Signal<boolean>, Signal<AppError | null> ...
TrendingReposPageComponent
    ↓  @Input bindings
RepoListComponent → RepoCardComponent
                         ↓  (click)
              RepoDetailsDialogComponent
                         ↓  rating change
              TrendingReposFacade → RatingPersistenceService → localStorage
```

---

## State management

**Choice: Angular signals — no NgRx, no BehaviorSubjects**

| Concern | Signals approach |
|---|---|
| Server data | `signal<GithubRepo[]>` — set by facade after each page fetch |
| Pagination | `signal<number>` currentPage, incremented by facade action |
| Initial load | `signal<boolean>` isLoading |
| Subsequent pages | `signal<boolean>` isLoadingMore |
| Error state | `signal<AppError \| null>` — typed, resettable |
| Ratings | `signal<Record<number, number>>` + localStorage sync |
| Derived state | `computed()` — `isEmpty`, `canLoadMore`, etc. |

NgRx would add actions, reducers, effects, and selectors with no benefit at this scale.

---

## Error handling

Errors are typed at the infrastructure boundary and propagated upward as `AppError`:

| HTTP status | Mapped to |
|---|---|
| `0` (no connection / CORS) | `kind: 'network'` |
| `429` | `kind: 'rateLimit'` |
| `403` + rate-limit message | `kind: 'rateLimit'` |
| `403` without rate-limit message | `kind: 'unknown'` |
| Any other status | `kind: 'unknown'` |
| Malformed response shape | `kind: 'unknown'` (shape guard fires before mapping) |
| Empty result set | Not an error — valid `TrendingReposPage` with `isLastPage: true` |

The facade translates `AppError` into user-facing UI state. Components never inspect raw HTTP errors.

---

## Routing

Single lazy-loaded route — the entire `trending-repos` feature is one bundle chunk:

```typescript
{ path: '', loadComponent: () => import('./features/trending-repos/ui/pages/...') }
```

Keeps the initial bundle small. All feature code deferred until route activates.

---

## Accessibility

Accessibility is a structural concern, built in from the start — not a retrofit.

| Concern | Approach |
|---|---|
| Modal | CDK Dialog — focus trap, Escape key, `aria-modal="true"`, `aria-labelledby` |
| Star rating | Radio group — fully keyboard navigable, screen-reader labelled |
| Infinite scroll sentinel | `aria-hidden="true"` — not announced to screen readers |
| Loading/error announcements | `aria-live="polite"` region (Step 5) |
| Skip link | First focusable element in `index.html` — targets `#main-content` |
| Focus ring | `:focus-visible` in global reset — always shown for keyboard users |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` in skeleton + transitions |
| Nav active state | `routerLinkActive` + `ariaCurrentWhenActive="page"` — router-driven, not hardcoded |

---

## Testing strategy

Distribution: ~70% integration · ~20% E2E · ~10% unit

| Type | Tool | What gets tested |
|---|---|---|
| Integration | Vitest + `@testing-library/angular` | Facade flows, component states, modal, rating sync |
| E2E | Playwright | 3–4 critical user paths only |
| Unit | Vitest | Mapper, date builder, error mapping — genuinely complex pure logic only |

**Selector strategy:** `data-testid` in kebab-case throughout — never CSS classes or DOM structure.
Tests use `@testing-library/angular` to test what users see, not implementation details.
No tests for trivial getters, setters, or Angular framework behavior.

---

## Security and privacy

| Concern | Decision |
|---|---|
| GitHub token | Never hardcoded. Local gitignored file or deployment secrets only. |
| Token transmission | Bearer header to `api.github.com` only. Never stored, never logged. |
| `localStorage` | `{ [repoId]: starRating }` only — no PII, minimal footprint |
| External data | Public GitHub API only — no user data collected or transmitted |
| Font loading | Google Fonts at runtime — self-host in production for privacy + performance |

---

## Key tradeoffs

| Decision | Tradeoff |
|---|---|
| Signals over NgRx | Less ceremony; would need NgRx if app grew to multi-feature shared state |
| Single facade | Slightly larger class than pure SRP; justified by test simplicity and readability |
| CDK Dialog | More opinionated API; accessibility correctness is worth it |
| No backend proxy | Exposes rate limiting to unauthenticated users; token env var mitigates |
| `localStorage` for ratings | Simple, no server dep; ratings lost on browser data clear |
| Inter via Google Fonts | Dev convenience; should self-host in production |
