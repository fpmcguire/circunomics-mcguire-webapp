# Architecture — Circunomics GitHub Trending Repos

## Overview

This app uses a **feature-driven, layered architecture** — organized by feature first, then by
technical concern within each feature. This is the right choice for a focused Angular SaaS app:
it keeps related logic co-located, makes each feature self-contained, and scales cleanly without
the ceremony of full enterprise DDD.

The architecture is deliberately pragmatic. It applies enough structure to be maintainable and
testable without over-engineering a single-feature application.

---

## Folder structure

```
src/
├── styles/                          # Global SCSS design system
│   ├── _tokens.scss                 # CSS custom properties (colors, spacing, typography)
│   ├── _reset.scss                  # Base reset + :focus-visible keyboard ring
│   ├── _typography.scss             # Text utility classes
│   └── _utilities.scss              # sr-only, skeleton, badge, icon-btn
│
├── environments/
│   ├── environment.ts               # Development config (GitHub token placeholder)
│   └── environment.prod.ts          # Production config (token via deployment secrets)
│
└── app/
    ├── core/                        # App-wide singleton concerns
    │   ├── config/                  # App-level constants and configuration objects
    │   ├── utils/                   # Pure utility functions (date builders, formatters)
    │   └── services/                # App-scoped services (e.g. HTTP interceptors)
    │
    ├── shared/                      # Reusable, feature-agnostic building blocks
    │   ├── ui/                      # Shared presentational components (header, etc.)
    │   ├── models/                  # Shared interfaces not owned by a single feature
    │   ├── pipes/                   # Shared Angular pipes
    │   └── directives/              # Shared Angular directives (e.g. intersection observer)
    │
    └── features/
        └── trending-repos/          # The single feature of this app
            ├── domain/              # Pure business logic — no framework dependencies
            │   ├── models/          # GithubRepo, GithubRepoOwner interfaces
            │   └── mappers/         # Raw API → domain model mapping functions
            │
            ├── application/         # Orchestration layer — coordinates domain + infra
            │   ├── facades/         # TrendingReposFacade — signal-based state + actions
            │   └── state/           # Supporting state types and helpers
            │
            ├── infrastructure/      # External data concerns — API, storage
            │   ├── repositories/    # Abstract repository interface + implementation
            │   └── datasources/     # GitHub API HTTP calls, localStorage persistence
            │
            └── ui/                  # Presentation layer — Angular components only
                ├── pages/           # Routable top-level page components
                ├── components/      # Reusable feature components (card, list, rating)
                └── dialogs/         # CDK Dialog modal components
```

---

## Layers explained

### Domain layer

The domain layer contains pure TypeScript — no Angular, no RxJS, no HTTP. It defines what the
app *knows about*, not how it fetches or displays it.

**What lives here:**
- `GithubRepo` and `GithubRepoOwner` interfaces — the app's internal representation of a repo
- Mapper functions that translate raw GitHub API JSON into domain models

**Why keep it pure:**
- Trivially unit-testable with no setup
- Completely decoupled from the API shape — if GitHub changes a field name, only the mapper changes
- Readable by anyone regardless of Angular knowledge

```
GitHub API JSON  →  mapper()  →  GithubRepo  →  rest of the app
```

---

### Infrastructure layer

The infrastructure layer is responsible for talking to the outside world — the GitHub API and
`localStorage`. It implements the repository interface defined by the domain.

**What lives here:**
- `TrendingReposRepository` — abstract interface (the contract)
- `GithubTrendingReposRepository` — `HttpClient` implementation of that contract
- Rate-limit and network error handling — mapped to typed domain errors here, not in the facade
- Duplicate request guard — prevents concurrent fetches at the data layer
- `RatingPersistenceService` — localStorage read/write, keyed by repo ID

**Why abstract behind an interface:**
- The facade depends on the interface, not the implementation
- Tests swap in a mock repository with zero HTTP involvement
- If the data source ever changes (e.g. a backend proxy), only the implementation changes

---

### Application layer (facade)

The facade is the single orchestration point between infrastructure and UI. Components never call
the repository directly.

**What lives here:**
- `TrendingReposFacade` — exposes signals consumed by components
- Pagination state — current page, has-more flag, append logic
- Error state — typed (network | rateLimit | unknown) with retry action
- Rating state — in-memory signal map + delegated to persistence service

**Why a facade instead of a service-per-concern:**
- One place to look for all feature state
- Components stay thin and dumb
- Easy to test the full load→paginate→rate→persist flow in a single integration test
- Signals make derived state (e.g. `isEmpty = repos.length === 0 && !isLoading`) readable inline

**Signal shape:**
```typescript
repos:          Signal<GithubRepo[]>
isLoading:      Signal<boolean>       // initial page load
isLoadingMore:  Signal<boolean>       // page 2+ loads
error:          Signal<AppError | null>
hasMore:        Signal<boolean>
ratings:        Signal<Record<number, number>>  // repoId → 1–5
```

---

### UI / Presentation layer

Components are purely presentational where possible. They receive data via inputs or inject the
facade directly (page-level components only).

**Component hierarchy:**
```
TrendingReposPageComponent        ← injects facade, owns layout
  └── RepoListComponent           ← @Input: repos, isLoading, error
        └── RepoCardComponent     ← @Input: repo, rating — emits nameClick
  └── IntersectionObserverDirective  ← sentinel for infinite scroll
  └── RepoDetailsDialogComponent  ← opened via CDK Dialog, injects facade for rating
        └── StarRatingComponent   ← radio-group pattern, fully keyboard accessible
```

**Rules for components:**
- Page components may inject the facade
- Sub-components are input/output only — no service injection
- No business logic in templates — computed values belong in the component class or facade
- All components use `ChangeDetectionStrategy.OnPush`

---

## State management

**Choice: Angular signals — no NgRx, no BehaviorSubjects**

For a single-feature app, signals are the correct tool:

| Concern | How it's handled |
|---|---|
| Server data | Fetched by facade, stored in a `signal<GithubRepo[]>` |
| Pagination | `currentPage` signal, incremented by facade action |
| Loading states | Separate `isLoading` / `isLoadingMore` signals |
| Error state | Typed `signal<AppError \| null>` |
| Ratings | `signal<Record<number, number>>` + localStorage sync |
| Derived state | `computed()` — e.g. `isEmpty`, `canLoadMore` |

NgRx would add significant boilerplate (actions, reducers, effects, selectors) with no benefit
at this scale. A signal-based facade gives the same unidirectional data flow with far less ceremony.

---

## Routing

Single lazy-loaded route — the entire `trending-repos` feature is one chunk:

```typescript
{
  path: '',
  loadComponent: () => import('./features/trending-repos/ui/pages/...')
}
```

This keeps the initial bundle small. All feature code is deferred until the route activates.

---

## Accessibility architecture

Accessibility is a structural concern, not a feature bolt-on.

| Concern | Approach |
|---|---|
| Modal | CDK Dialog — focus trap, Escape, `aria-modal`, `aria-labelledby` |
| Star rating | Radio group — keyboard navigable, screen-reader labelled |
| Infinite scroll | Sentinel `<div aria-hidden="true">` — not announced to screen readers |
| Loading states | `aria-live="polite"` region for loading/error announcements |
| Skip link | First focusable element in `index.html` — jumps to `#main-content` |
| Focus ring | `:focus-visible` in global reset — always visible, never suppressed for mouse |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` respected in skeleton and transitions |

---

## Testing architecture

The test suite follows the ~70 / 20 / 10 distribution recommended by the project brief:

| Type | Share | What gets tested |
|---|---|---|
| Integration (Vitest) | ~70% | Facade flows, component rendering states, modal behavior, rating sync |
| E2E (Playwright) | ~20% | 3–4 critical user paths only |
| Unit (Vitest) | ~10% | Mapper, date builder, error mapping — genuinely complex pure logic only |

**Key principles:**
- Tests use `data-testid` selectors in kebab-case — never CSS classes or DOM structure
- Integration tests use `@testing-library/angular` — test what the user sees, not implementation
- No tests for trivial getters, setters, or obvious framework behavior
- The facade is the primary integration test target — it owns all interesting logic

---

## Security and privacy

| Concern | Decision |
|---|---|
| GitHub token | Never hardcoded — injectable via gitignored local env file or deployment secrets |
| localStorage | Stores only `{ [repoId]: starRating }` — minimal, no PII |
| External data | All data comes from the public GitHub API — no user data is collected or transmitted |
| Font loading | Google Fonts loaded at runtime — self-host in production for stricter privacy |

---

## Key tradeoffs

| Decision | Tradeoff accepted |
|---|---|
| Signals over NgRx | Less infrastructure ceremony; would need NgRx if app grew to many features with shared state |
| Single facade | Slightly larger class than pure SRP would suggest; justified by test simplicity |
| CDK Dialog over custom modal | More opinionated API; accessibility correctness is worth it |
| No backend proxy | Exposes rate limiting to unauthenticated users; token env var mitigates for authenticated use |
| Lazy route per feature | One chunk is fine now; would split further if more features were added |
| Inter via Google Fonts | Convenient for development; should be self-hosted in production for privacy and performance |
