export const environment = {
  production: false,
  /**
   * Optional GitHub Personal Access Token to raise the unauthenticated API rate limit
   * from 10 req/min to 5,000 req/hr.
   *
   * DO NOT insert a real token here — this file is tracked by git.
   *
   * Recommended approaches (pick one):
   *   1. Copy `environment.ts` to `environment.local.ts`, add it to .gitignore,
   *      and reference it via a local fileReplacement in angular.json (not committed).
   *   2. Inject via your deployment platform's secrets/environment configuration.
   *
   * The token is sent only as a Bearer Authorization header to api.github.com.
   * It is never stored, logged, or persisted beyond the HTTP request.
   */
  githubToken: '',
};
