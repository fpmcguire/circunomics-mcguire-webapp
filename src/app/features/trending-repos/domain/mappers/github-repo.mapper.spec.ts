import { describe, it, expect } from 'vitest';
import { mapApiRepo, mapApiOwner } from './github-repo.mapper';
import { GithubApiRepo, GithubApiOwner } from '../../infrastructure/datasources/github-api.types';

const mockOwner: GithubApiOwner = {
  id: 1,
  login: 'torvalds',
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  html_url: 'https://github.com/torvalds',
};

const mockApiRepo: GithubApiRepo = {
  id: 42,
  name: 'linux',
  full_name: 'torvalds/linux',
  description: 'Linux kernel source tree',
  html_url: 'https://github.com/torvalds/linux',
  stargazers_count: 180000,
  open_issues_count: 320,
  created_at: '2011-09-04T22:48:12Z',
  owner: mockOwner,
};

describe('mapApiOwner', () => {
  it('maps snake_case API fields to camelCase domain fields', () => {
    const result = mapApiOwner(mockOwner);
    expect(result.id).toBe(1);
    expect(result.login).toBe('torvalds');
    expect(result.avatarUrl).toBe('https://avatars.githubusercontent.com/u/1');
    expect(result.profileUrl).toBe('https://github.com/torvalds');
  });
});

describe('mapApiRepo', () => {
  it('maps all core fields correctly', () => {
    const result = mapApiRepo(mockApiRepo);
    expect(result.id).toBe(42);
    expect(result.name).toBe('linux');
    expect(result.fullName).toBe('torvalds/linux');
    expect(result.description).toBe('Linux kernel source tree');
    expect(result.url).toBe('https://github.com/torvalds/linux');
    expect(result.stars).toBe(180000);
    expect(result.openIssues).toBe(320);
  });

  it('converts the ISO date string to a Date object', () => {
    const result = mapApiRepo(mockApiRepo);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getFullYear()).toBe(2011);
  });

  it('maps the nested owner correctly', () => {
    const result = mapApiRepo(mockApiRepo);
    expect(result.owner.login).toBe('torvalds');
    expect(result.owner.avatarUrl).toBe('https://avatars.githubusercontent.com/u/1');
  });

  it('preserves null description', () => {
    const repoWithNoDescription = { ...mockApiRepo, description: null };
    const result = mapApiRepo(repoWithNoDescription);
    expect(result.description).toBeNull();
  });
});
