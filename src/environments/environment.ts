export const environment = {
  production: false,
  /**
   * Optional GitHub Personal Access Token to raise the unauthenticated API rate limit
   * from 10 req/min to 5,000 req/hr.
   *
   * How to set:
   *   1. Generate a token at https://github.com/settings/tokens (no scopes needed for public API)
   *   2. Set the GITHUB_TOKEN environment variable before running `ng serve`, OR
   *   3. Replace the empty string below (DO NOT commit a real token to source control).
   *
   * The token is sent as a Bearer header and is never stored beyond the browser session.
   */
  githubToken: '',
};
