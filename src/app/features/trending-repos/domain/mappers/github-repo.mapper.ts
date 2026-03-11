import { GithubRepo, GithubRepoOwner } from '../models/github-repo.model';
import { GithubApiRepo, GithubApiOwner } from '../../infrastructure/datasources/github-api.types';

/**
 * Maps a raw GitHub API owner object to the domain GithubRepoOwner model.
 * Pure function — no side effects, no framework dependencies.
 */
export function mapApiOwner(raw: GithubApiOwner): GithubRepoOwner {
  return {
    id: raw.id,
    login: raw.login,
    avatarUrl: raw.avatar_url,
    profileUrl: raw.html_url,
  };
}

/**
 * Maps a raw GitHub API repository object to the domain GithubRepo model.
 * Pure function — no side effects, no framework dependencies.
 */
export function mapApiRepo(raw: GithubApiRepo): GithubRepo {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    url: raw.html_url,
    stars: raw.stargazers_count,
    openIssues: raw.open_issues_count,
    createdAt: new Date(raw.created_at),
    owner: mapApiOwner(raw.owner),
  };
}
