import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RepoListComponent } from './repo-list.component';
import { GithubRepo } from '../../../domain/models/github-repo.model';
import { AppError } from '../../../../../shared/models/app-error.model';

const makeRepo = (id: number): GithubRepo => ({
  id,
  name: `repo-${id}`,
  fullName: `user/repo-${id}`,
  description: `Description ${id}`,
  url: `https://github.com/user/repo-${id}`,
  stars: id * 100,
  openIssues: id,
  createdAt: new Date('2024-01-01'),
  owner: {
    id: 99,
    login: 'user',
    avatarUrl: `https://avatars.githubusercontent.com/u/99`,
    profileUrl: 'https://github.com/user',
  },
});

interface ListInputs {
  repos: GithubRepo[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: AppError | null;
  isEmpty: boolean;
  ratings: Record<number, number>;
}

const BASE_INPUTS: ListInputs = {
  repos: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  isEmpty: false,
  ratings: {},
};

const renderList = (inputs: Partial<ListInputs> = {}) =>
  render(RepoListComponent, {
    componentInputs: { ...BASE_INPUTS, ...inputs },
  });

describe('RepoListComponent', () => {
  describe('loading state', () => {
    it('renders skeleton cards during initial load', async () => {
      await renderList({ isLoading: true });
      expect(screen.getByTestId('trending-repos-loading')).toBeInTheDocument();
    });

    it('does not render the repo list while loading', async () => {
      await renderList({ isLoading: true });
      expect(screen.queryByTestId('trending-repos-list')).not.toBeInTheDocument();
    });

    it('announces loading to screen readers', async () => {
      await renderList({ isLoading: true });
      expect(screen.getByText('Loading trending repositories…')).toBeInTheDocument();
    });
  });

  describe('loaded state', () => {
    it('renders the correct number of repo cards', async () => {
      const repos = [makeRepo(1), makeRepo(2), makeRepo(3)];
      await renderList({ repos });
      expect(screen.getAllByTestId('trending-repos-list-item')).toHaveLength(3);
    });

    it('renders the list with correct ARIA attributes', async () => {
      await renderList({ repos: [makeRepo(1)] });
      const list = screen.getByTestId('trending-repos-list');
      expect(list).toHaveAttribute('role', 'list');
      expect(list).toHaveAttribute('aria-label', 'Trending repositories');
    });

    it('passes the correct rating to each card', async () => {
      const repos = [makeRepo(1), makeRepo(2)];
      const ratings = { 1: 4, 2: 0 };
      await renderList({ repos, ratings });
      const cards = screen.getAllByTestId('trending-repos-list-item-rating');
      expect(cards[0]).toHaveAttribute('aria-label', 'Rated 4 out of 5 stars');
      expect(cards[1]).toHaveAttribute('aria-label', 'Not yet rated');
    });
  });

  describe('empty state', () => {
    it('renders the empty state when isEmpty is true and no error', async () => {
      await renderList({ isEmpty: true });
      expect(screen.getByTestId('trending-repos-empty')).toBeInTheDocument();
      expect(screen.getByText('No trending repos found')).toBeInTheDocument();
    });

    it('does not render empty state while loading', async () => {
      await renderList({ isEmpty: true, isLoading: true });
      expect(screen.queryByTestId('trending-repos-empty')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the error panel when error is set', async () => {
      const error: AppError = { kind: 'network', message: 'Network error' };
      await renderList({ error });
      expect(screen.getByTestId('trending-repos-error')).toBeInTheDocument();
    });

    it('shows a rate-limit-specific heading for rateLimit errors', async () => {
      const error: AppError = { kind: 'rateLimit', message: 'rate limited' };
      await renderList({ error });
      expect(screen.getByText('GitHub rate limit reached')).toBeInTheDocument();
    });

    it('shows a generic heading for network errors', async () => {
      const error: AppError = { kind: 'network', message: 'No connection' };
      await renderList({ error });
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders the retry button', async () => {
      const error: AppError = { kind: 'network', message: 'err' };
      await renderList({ error });
      expect(screen.getByTestId('trending-repos-error-retry')).toBeInTheDocument();
    });

    it('emits retryClick when the retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const error: AppError = { kind: 'network', message: 'err' };
      await render(RepoListComponent, {
        componentInputs: { ...BASE_INPUTS, error },
        on: { retryClick: onRetry },
      });
      await user.click(screen.getByTestId('trending-repos-error-retry'));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('has role="alert" on the error panel', async () => {
      const error: AppError = { kind: 'network', message: 'err' };
      await renderList({ error });
      const panel = screen.getByTestId('trending-repos-error');
      expect(panel).toHaveAttribute('role', 'alert');
    });
  });

  describe('loading-more state', () => {
    it('renders the loading-more indicator when isLoadingMore is true', async () => {
      await renderList({ repos: [makeRepo(1)], isLoadingMore: true });
      expect(screen.getByTestId('trending-repos-loading-more')).toBeInTheDocument();
    });

    it('announces to screen readers when loading more', async () => {
      await renderList({ repos: [makeRepo(1)], isLoadingMore: true });
      // The text appears in both the aria-live region and the spinner's sr-only span
      expect(screen.getAllByText('Loading more repositories…').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('nameClick output', () => {
    it('forwards nameClick from a card up to the parent', async () => {
      const user = userEvent.setup();
      const onNameClick = vi.fn();
      await render(RepoListComponent, {
        componentInputs: { ...BASE_INPUTS, repos: [makeRepo(1)] },
        on: { nameClick: onNameClick },
      });
      await user.click(screen.getByTestId('trending-repos-list-item-name-button'));
      expect(onNameClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });
  });
});
