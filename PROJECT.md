# PROJECT.md — Circunomics GitHub Trending Repos

> This document is updated incrementally as each implementation milestone is completed.
> Full architectural rationale lives in [ARCHITECTURE.md](./ARCHITECTURE.md).
> Step-by-step delivery plan lives in [ROADMAP.md](./ROADMAP.md).

---

## Architecture

### Approach

Feature-driven, layered architecture — organized by feature first, then by technical concern
within each feature. Keeps related logic co-located, makes each feature self-contained, and
scales cleanly without DDD ceremony.

### Current folder structure (after Step 3)

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
    ├── app.html                     # <app-header> + <main> + <router-outlet>
    ├── app.config.ts                # provideHttpClient, interceptor, repository binding
    ├── app.routes.ts                # Lazy route → trending-repos page
    │
    ├── core/
    │   ├── config/                  # (reserved — app-level constants)
    │   ├── services/
    │   │   └── github-auth.interceptor.ts   # Injects optional Bearer token for api.github.com
    │   └── utils/
    │       └── github-query.utils.ts        # UTC-safe date/query builder (pure functions)
    │
    ├── shared/
    │   ├── models/
    │   │   └── app-error.model.ts           # Typed AppError discriminated union + factory fns
    │   ├── ui/
    │   │   └── header/                      # Sticky app header, router-aware nav
    │   ├── directives/              # (reserved)
    │   └── pipes/                   # (reserved)
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
            │   │   └── github-api.types.ts          # Raw GitHub API response shapes (infra only)
            │   └── repositories/
            │       └── github-trending-repos.repository.ts  # HttpClient implementation
            │
            ├── application/
            │   ├── facades/         # (Step 4 — TrendingReposFacade)
            │   └── state/           # (Step 4 — supporting state types)
            │
            └── ui/
                ├── pages/
                │   └── trending-repos-page/   # Placeholder — replaced in Step 5
                ├── components/      # (Steps 5–6 — RepoCard, RepoList, StarRating)
                └── dialogs/         # (Step 6 — RepoDetailsDialog)
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
flow with far less boilerplate. The facade (Step 4) will expose: `repos`, `isLoading`,
`isLoadingMore`, `error`, `hasMore`, `ratings` as signals consumed directly by components.

---

## Libraries added and why

| Library | Reason |
|---|---|
| `@angular/cdk` | Accessible Dialog — focus trap, Escape, `aria-modal` |
| `@angular/animations` | Required by CDK and `provideAnimationsAsync()` |
| `@testing-library/angular` | Integration tests — test user behavior, not implementation details |
| `@testing-library/user-event` | Realistic user interaction simulation in tests |
| `@testing-library/jest-dom` | Expressive DOM matchers (`toBeVisible`, `toHaveTextContent`, etc.) |
| `eslint` + `angular-eslint` | Linting with Angular-specific rules, ESLint 10 flat config |
| `prettier` | Consistent code formatting |
| `@playwright/test` | Critical-path E2E coverage (Steps 5–7) |

---

## Security and privacy

- GitHub token is **never** hardcoded in any tracked file.
- Local token: create `src/environments/environment.local.ts` (gitignored), set `githubToken`.
- Production token: inject via deployment platform secrets only.
- Token is sent only as a `Bearer` Authorization header to `api.github.com` — never stored or logged.
- `localStorage` will store only `{ [repoId]: starRating }` — no PII, minimal footprint.
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
npm run e2e           # Playwright E2E tests
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

### Step 3 run (after corrections)
```
Test Files  4 passed (4)
Tests       27 passed (27)
Duration    9.41s
```

| File | Tests | Type |
|---|---|---|
| `app.spec.ts` | 2 | Integration — shell landmarks |
| `github-query.utils.spec.ts` | 8 | Unit — date/query builder |
| `github-repo.mapper.spec.ts` | 5 | Unit — domain mapper |
| `github-trending-repos.repository.spec.ts` | 12 | Integration — HTTP, errors, deduplication |

### Final run
*(Updated after Step 7 is complete.)*

---

## Known tradeoffs and future improvements

| Tradeoff | Notes |
|---|---|
| Signals over NgRx | Correct for this scope. Revisit if app grows to multi-feature shared state. |
| No backend proxy | Unauthenticated users hit GitHub's 10 req/min search limit. Token env var mitigates. |
| Single lazy route chunk | Fine now. Split further if more features are added. |
| Google Fonts at runtime | Convenient for development. Self-host in production for privacy + performance. |
| `localStorage` for ratings | Simple, no server dependency. Ratings are lost on browser data clear. |
