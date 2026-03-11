# PROJECT.md — Circunomics GitHub Trending Repos

> This document is updated incrementally as each implementation milestone is completed.

---

## Architecture

### Approach

Feature-driven, layered architecture — organized by feature first, then by technical concern within each feature. This keeps related logic co-located, avoids premature abstraction, and scales cleanly as features grow.

```
src/app/
  core/           # App-wide config, HTTP interceptors, utility services
  shared/         # Reusable UI components, pipes, directives, domain-agnostic models
  features/
    trending-repos/
      domain/         # Pure models and mappers (no framework deps)
      application/    # Facade + signal-based state (orchestrates domain + infra)
      infrastructure/ # GitHub API datasource and repository implementation
      ui/             # Pages, components, dialogs (presentational layer)
```

### Why this structure

- Co-location of feature concerns reduces context-switching and makes the feature self-contained
- The domain layer stays framework-free and easily testable in isolation
- The facade/application layer is the only place that touches state — keeps components dumb and predictable
- Infra layer is swappable behind an abstract repository interface — easy to mock in tests

### State management

Angular signals — no NgRx, no BehaviorSubjects. For a single-feature app of this scope, signals are the right tool:
- Minimal boilerplate
- Synchronous reads, explicit mutations
- Native Angular 21 — no extra dependency
- Easy to test and reason about

### Accessibility

- Semantic HTML throughout (main, header, section, article, button)
- Angular CDK Dialog for modal — handles focus trap, Escape, and aria roles
- All interactive controls have accessible names and visible focus states
- Star rating uses radio-group pattern for full keyboard accessibility
- Reduced-motion-respecting transitions

---

## Libraries added and why

| Library | Reason |
|---|---|
| `@angular/cdk` | Accessible Dialog (focus trap, Escape, aria) + future drag support |
| `@testing-library/angular` | Integration tests that test user behavior, not implementation |
| `@testing-library/user-event` | Realistic user interaction simulation in tests |
| `@testing-library/jest-dom` | Expressive DOM matchers (toBeVisible, toHaveTextContent, etc.) |
| `eslint` + `angular-eslint` | Linting with Angular-specific rules, flat config (ESLint 10) |
| `prettier` | Consistent code formatting |
| `@playwright/test` | Critical-path E2E coverage |

---

## Security and privacy

- GitHub token is **never** hardcoded in tracked source files
- Token is injectable via a local gitignored environment override
- localStorage is used only for user rating preferences, keyed by repository ID
- No personal data is collected or transmitted beyond what the GitHub API returns publicly

---

## How to run

See [README.md](./README.md) for full command reference.

---

## Test results

### First test run (Step 1 baseline)

```
Test Files  1 passed (1)
Tests       2 passed (2)
Duration    6.80s
```

*Both tests are the Angular starter placeholder tests — these will be replaced in Step 2.*

### Final test run

*(To be updated after all implementation steps are complete.)*

---

## Known tradeoffs and future improvements

*(To be updated as implementation progresses.)*
