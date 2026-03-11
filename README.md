# Circunomics — GitHub Trending Repos

A polished Angular 21 web app listing the most-starred GitHub repositories created in the last
30 days, built as a coding challenge submission for Circunomics.

> **Full architecture, decisions, and tradeoffs are documented in [PROJECT.md](./PROJECT.md).**

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

| Command | Description |
|---|---|
| `npm start` | Start dev server at `localhost:4200` |
| `npm run build` | Production build |
| `npm test` | Run unit/integration tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Format source with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:ui` | Open Playwright interactive UI |

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

---

## Tooling

| Tool | Purpose |
|---|---|
| Angular 21 | Framework — standalone components, signals, modern control flow |
| Vitest | Unit and integration test runner |
| Playwright | End-to-end tests |
| ESLint + angular-eslint | Linting (flat config, ESLint 10) |
| Prettier | Code formatting |
| @angular/cdk | Accessible dialog, future drag support |
| @testing-library/angular | Integration testing utilities |

---

## Project structure

See [PROJECT.md](./PROJECT.md) and [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full details.
