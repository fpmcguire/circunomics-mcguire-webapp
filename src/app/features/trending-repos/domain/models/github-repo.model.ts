/**
 * Domain model for a GitHub repository.
 * This is the internal representation used throughout the app.
 * It is intentionally decoupled from the raw GitHub API shape —
 * if the API changes, only the mapper changes.
 */
export interface GithubRepoOwner {
  readonly id: number;
  readonly login: string;
  readonly avatarUrl: string;
  readonly profileUrl: string;
}

export interface GithubRepo {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly description: string | null;
  readonly url: string;
  readonly stars: number;
  readonly openIssues: number;
  readonly createdAt: Date;
  readonly owner: GithubRepoOwner;
}
