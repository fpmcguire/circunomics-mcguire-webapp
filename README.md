# Circunomics — GitHub Trending Repos

A polished Angular 21 web app listing the most-starred GitHub repositories created in the last
30 days, built as a coding challenge submission for Circunomics.

> **Full architecture, decisions, and tradeoffs are documented in [PROJECT.md](./PROJECT.md).**

### What it does

- Fetches the most-starred GitHub repositories created in the last 30 days
- Supports **two browsing modes**, switchable at any time:
  - **Paged view** (default) — explicit Previous / Next controls, 10 repos per page
  - **Infinite scroll** — auto-loads as you scroll, accumulates the full list
- Switches mode via a toggle in the page header, or via `?mode=infinite` / `?mode=paginated` in the URL — useful for demos and review
- Loads GitHub API data on demand in both modes — no unnecessary prefetching
- Lets you rate any repository 1–5 stars via a modal; ratings persist across navigation and browser sessions
- **About modal** in the page header — explains app purpose, browsing modes, ratings, data source, and GitHub API rate-limit behaviour in plain language

> **Original challenge spec** requested infinite scroll. Paged view was introduced as a UX experiment (Step 5.5). Both modes are now available simultaneously — see `ROADMAP.md` for rationale.

---

## Getting started

### Prerequisites

- Node.js 20+
- npm 11+

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm start
# → http://localhost:4200
```

---

## Available commands

| Command                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `npm start`            | Start dev server at `localhost:4200`                             |
| `npm run build`        | Production build                                                 |
| `npm run build:subdir` | Production build for `/circunomics-webapp/` subdirectory hosting |
| `npm test`             | Run unit/integration tests (Vitest)                              |
| `npm run test:watch`   | Run tests in watch mode                                          |
| `npm run lint`         | Run ESLint                                                       |
| `npm run format`       | Format source with Prettier                                      |
| `npm run format:check` | Check formatting without writing                                 |
| `npm run e2e`          | Run Playwright E2E tests                                         |
| `npm run e2e:ui`       | Open Playwright interactive UI                                   |

---

## Deploying without SSR (subdirectory hosting)

This app is already configured as a client-side rendered Angular application (no SSR server required).

For deployment to `https://frank-mcguire.com/circunomics-webapp`:

1. Build with subdirectory URLs:

```bash
npm run build:subdir
```

2. Deploy the contents of `dist/circunomics-mcguire-webapp/browser/` to your server under:

- `/circunomics-webapp/`

3. Configure your web server to rewrite all unknown paths under `/circunomics-webapp/*` to:

- `/circunomics-webapp/index.html`

Why the rewrite is needed:

- Angular routing is client-side. Without the rewrite, refreshing a deep link (for example `/circunomics-webapp/repo/123`) returns a server 404.

Example rewrite targets by server:

- Nginx: `try_files $uri $uri/ /circunomics-webapp/index.html;`
- Apache: `RewriteRule ^circunomics-webapp/.*$ /circunomics-webapp/index.html [L]`

---

## GitHub API rate limits

The app uses the public GitHub Search API (`api.github.com`), which allows **10 requests/minute**
unauthenticated and **5,000 requests/hour** with a Personal Access Token.

To use a token locally:

1. Generate a fine-grained token at [github.com/settings/tokens](https://github.com/settings/tokens)
   — no scopes are required for public API access.
2. Create `src/environments/environment.local.ts` (this file is gitignored — never commit it):
   ```typescript
   export const environment = {
     production: false,
     githubToken: 'your_token_here',
   };
   ```
3. Add a `fileReplacement` entry in your local `angular.json` pointing to this file.

The token is sent only as a `Bearer` Authorization header to `api.github.com`.
It is never stored, logged, or persisted beyond the HTTP request.

**Never commit a token to source control.**

### Graceful error handling (for review)

The app handles GitHub API failures differently depending on _when_ they happen:

- **Initial load fails** (for example, first request gets 403/429):
  - The app shows the dedicated error state with a Retry button.
  - This prevents rendering an empty/broken list before any data exists.

- **Later-page fetch fails** after repos are already loaded (applies to both modes):
  - Already loaded repos remain visible and interactive.
  - The display-mode toggle remains usable.
  - The app does **not** switch to the global full-page error UI.
  - Further API paging is stopped for that session (`hasMore = false`) to avoid repeated failing requests.

This behavior is implemented in the trending repos facade and validated with tests for both:

- **Paginated mode**: later-page 403 keeps current page/list usable.
- **Infinite mode**: later-page 403 keeps accumulated list and toggle usable.

---

## Tooling

| Tool                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| Angular 21               | Framework — standalone components, signals, modern control flow         |
| Vitest                   | Unit and integration test runner                                        |
| Playwright               | End-to-end tests                                                        |
| ESLint + angular-eslint  | Linting (flat config, ESLint 10)                                        |
| Prettier                 | Code formatting                                                         |
| @angular/cdk             | Accessible dialog — focus trap, Escape, `aria-modal`, focus restoration |
| @testing-library/angular | Integration testing utilities                                           |

---

## Project structure

See [PROJECT.md](./PROJECT.md) and [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full details.

---

## Future enhancements

See [FUTURE-FEATURES.md](./FUTURE-FEATURES.md) for proposed enhancements (dynamic age-range selector, star-history chart) with feasibility notes and API tradeoffs. These are not committed roadmap scope.
