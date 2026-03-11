/**
 * Raw GitHub Search Repositories API response shapes.
 * These types live in the infrastructure layer only —
 * nothing outside infrastructure should ever depend on them.
 *
 * Typed against: https://docs.github.com/en/rest/search/search#search-repositories
 */
export interface GithubApiOwner {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GithubApiRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  created_at: string;
  owner: GithubApiOwner;
}

export interface GithubApiSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GithubApiRepo[];
}
