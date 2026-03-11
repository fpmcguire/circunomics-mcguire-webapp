import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RepoCardComponent } from './repo-card.component';
import { GithubRepo } from '../../../domain/models/github-repo.model';

const makeRepo = (overrides: Partial<GithubRepo> = {}): GithubRepo => ({
  id: 1,
  name: 'awesome-project',
  fullName: 'octocat/awesome-project',
  description: 'A really awesome open-source project',
  url: 'https://github.com/octocat/awesome-project',
  stars: 1500,
  openIssues: 12,
  createdAt: new Date('2024-01-15'),
  owner: {
    id: 42,
    login: 'octocat',
    avatarUrl: 'https://avatars.githubusercontent.com/u/42',
    profileUrl: 'https://github.com/octocat',
  },
  ...overrides,
});

const renderCard = (repo = makeRepo(), rating = 0) =>
  render(RepoCardComponent, { componentInputs: { repo, rating } });

describe('RepoCardComponent', () => {
  describe('repo name and owner', () => {
    it('renders the owner login and repo name', async () => {
      await renderCard();
      expect(screen.getByTestId('trending-repos-list-item-name-button')).toBeInTheDocument();
      expect(screen.getByText('octocat')).toBeInTheDocument();
      expect(screen.getByText('awesome-project')).toBeInTheDocument();
    });

    it('has a descriptive aria-label on the name button', async () => {
      await renderCard();
      const btn = screen.getByTestId('trending-repos-list-item-name-button');
      expect(btn).toHaveAttribute('aria-label', 'View details for octocat/awesome-project');
    });
  });

  describe('description', () => {
    it('renders the description when present', async () => {
      await renderCard();
      expect(screen.getByText('A really awesome open-source project')).toBeInTheDocument();
    });

    it('shows "No description" when description is null', async () => {
      await renderCard(makeRepo({ description: null }));
      expect(screen.getByText('No description')).toBeInTheDocument();
    });
  });

  describe('stats', () => {
    it('formats stars below 1000 as plain number', async () => {
      await renderCard(makeRepo({ stars: 850 }));
      expect(screen.getByText('850')).toBeInTheDocument();
    });

    it('formats stars >= 1000 with a k suffix', async () => {
      await renderCard(makeRepo({ stars: 1500 }));
      expect(screen.getByText('1.5k')).toBeInTheDocument();
    });

    it('renders the open issues count', async () => {
      await renderCard(makeRepo({ openIssues: 12 }));
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  describe('avatar', () => {
    it('renders the owner avatar with correct src and alt', async () => {
      await renderCard();
      const img = screen.getByAltText('octocat avatar');
      expect(img).toHaveAttribute('src', 'https://avatars.githubusercontent.com/u/42');
    });
  });

  describe('rating display', () => {
    it('hides the rating block when rating is 0', async () => {
      await renderCard(makeRepo(), 0);
      expect(screen.queryByTestId('trending-repos-list-item-rating')).not.toBeInTheDocument();
    });

    it('shows the rating block with correct aria-label when rating is 4', async () => {
      await renderCard(makeRepo(), 4);
      const rating = screen.getByTestId('trending-repos-list-item-rating');
      expect(rating).toHaveAttribute('aria-label', 'Rated 4 out of 5 stars');
    });
  });

  describe('nameClick output', () => {
    it('emits the repo when the name button is clicked', async () => {
      const user = userEvent.setup();
      const onNameClick = vi.fn();
      await render(RepoCardComponent, {
        componentInputs: { repo: makeRepo(), rating: 0 },
        on: { nameClick: onNameClick },
      });
      await user.click(screen.getByTestId('trending-repos-list-item-name-button'));
      expect(onNameClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });
  });

  describe('accessibility', () => {
    it('renders inside an article element with aria-label', async () => {
      await renderCard();
      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'octocat/awesome-project');
    });
  });
});
