# Circunomics – GitHub Trending Repos

A polished Angular 21 web app listing the most-starred GitHub repositories created in the last 30 days, built as a coding challenge submission for Circunomics.

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

The app uses the public GitHub Search API (`api.github.com`), which is rate-limited to **10 requests/minute** unauthenticated.

To raise this to **5,000 requests/hour**, you can supply a GitHub Personal Access Token (no scopes required for public API access):

1. Generate a token at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Create a **local, gitignored** file at `src/environments/environment.local.ts`
3. Set `githubToken: 'your_token_here'` and wire it via a local `fileReplacement` in `angular.json`

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

See [PROJECT.md](./PROJECT.md) for the full architecture overview.
