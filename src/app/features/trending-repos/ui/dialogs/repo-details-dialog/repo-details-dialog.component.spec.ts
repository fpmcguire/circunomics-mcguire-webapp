import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { RepoDetailsDialogComponent } from './repo-details-dialog.component';
import { RepoDetailsDialogData } from './repo-details-dialog.types';
import { GithubRepo } from '../../../domain/models/github-repo.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRepo = (overrides: Partial<GithubRepo> = {}): GithubRepo => ({
  id: 1,
  name: 'awesome-lib',
  fullName: 'octocat/awesome-lib',
  description: 'A fantastic open-source library',
  url: 'https://github.com/octocat/awesome-lib',
  stars: 4800,
  openIssues: 23,
  createdAt: new Date('2024-03-01'),
  owner: {
    id: 42,
    login: 'octocat',
    avatarUrl: 'https://avatars.githubusercontent.com/u/42',
    profileUrl: 'https://github.com/octocat',
  },
  ...overrides,
});

const makeMockDialogRef = () => ({ close: vi.fn() });

const renderDialog = (
  overrides: Partial<RepoDetailsDialogData> = {},
  mockRef = makeMockDialogRef(),
) => {
  const data: RepoDetailsDialogData = {
    repo: makeRepo(),
    currentRating: 0,
    ...overrides,
  };
  return render(RepoDetailsDialogComponent, {
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: mockRef },
    ],
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RepoDetailsDialogComponent', () => {
  describe('repo details rendering', () => {
    it('renders the repo full name in the dialog title', async () => {
      await renderDialog();
      expect(screen.getByTestId('repo-details-modal-name')).toHaveTextContent(
        'octocat/awesome-lib',
      );
    });

    it('renders the repo description', async () => {
      await renderDialog();
      expect(screen.getByTestId('repo-details-modal-description')).toHaveTextContent(
        'A fantastic open-source library',
      );
    });

    it('shows a fallback when description is null', async () => {
      await renderDialog({ repo: makeRepo({ description: null }) });
      expect(screen.getByTestId('repo-details-modal-description')).toHaveTextContent(
        'No description provided.',
      );
    });

    it('renders the formatted star count', async () => {
      await renderDialog({ repo: makeRepo({ stars: 4800 }) });
      expect(screen.getByText('4.8k stars')).toBeInTheDocument();
    });

    it('renders the GitHub link pointing to the repo URL', async () => {
      await renderDialog();
      const link = screen.getByRole('link', { name: /view on github/i });
      expect(link).toHaveAttribute('href', 'https://github.com/octocat/awesome-lib');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has a close button', async () => {
      await renderDialog();
      expect(screen.getByTestId('repo-details-modal-close-button')).toBeInTheDocument();
    });
  });

  describe('star rating', () => {
    it('renders the star rating component', async () => {
      await renderDialog();
      expect(screen.getByTestId('repo-rating-star-1')).toBeInTheDocument();
      expect(screen.getByTestId('repo-rating-star-5')).toBeInTheDocument();
    });

    it('passes the current rating to the star rating component', async () => {
      await renderDialog({ currentRating: 3 });
      for (let i = 1; i <= 3; i++) {
        expect(screen.getByTestId(`repo-rating-star-${i}`)).toHaveClass(
          'star-rating__label--filled',
        );
      }
    });

    it('shows "Click a star to rate" hint when rating is 0', async () => {
      await renderDialog({ currentRating: 0 });
      expect(screen.getByText(/click a star to rate/i)).toBeInTheDocument();
    });

    it('updates the feedback text when a star is selected', async () => {
      const user = userEvent.setup();
      await renderDialog({ currentRating: 0 });

      await user.click(screen.getByTestId('repo-rating-star-4'));

      expect(screen.getByText(/rated 4 out of 5 stars/i)).toBeInTheDocument();
    });
  });

  describe('Save rating button', () => {
    it('is disabled when no rating has been selected', async () => {
      await renderDialog({ currentRating: 0 });
      expect(screen.getByRole('button', { name: /save rating/i })).toBeDisabled();
    });

    it('is enabled when the user selects a star', async () => {
      const user = userEvent.setup();
      await renderDialog({ currentRating: 0 });

      await user.click(screen.getByTestId('repo-rating-star-3'));

      expect(screen.getByRole('button', { name: /save rating/i })).not.toBeDisabled();
    });

    it('is enabled when a pre-existing rating is loaded', async () => {
      await renderDialog({ currentRating: 2 });
      expect(screen.getByRole('button', { name: /save rating/i })).not.toBeDisabled();
    });

    it('calls dialogRef.close with stars when Save is clicked', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog({ currentRating: 0 }, mockRef);

      await user.click(screen.getByTestId('repo-rating-star-5'));
      await user.click(screen.getByRole('button', { name: /save rating/i }));

      expect(mockRef.close).toHaveBeenCalledWith({ stars: 5 });
    });

    it('saves a changed rating over a pre-existing one', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog({ currentRating: 2 }, mockRef);

      await user.click(screen.getByTestId('repo-rating-star-4'));
      await user.click(screen.getByRole('button', { name: /save rating/i }));

      expect(mockRef.close).toHaveBeenCalledWith({ stars: 4 });
    });
  });

  describe('dismiss behaviour (no rating committed)', () => {
    it('calls dialogRef.close with no arguments when X icon is clicked', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog({}, mockRef);

      await user.click(screen.getByTestId('repo-details-modal-close-button'));

      expect(mockRef.close).toHaveBeenCalledWith();
    });

    it('calls dialogRef.close with no arguments when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog({}, mockRef);

      await user.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(mockRef.close).toHaveBeenCalledWith();
    });

    it('does not commit rating when user selects a star then dismisses via X', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog({ currentRating: 0 }, mockRef);

      await user.click(screen.getByTestId('repo-rating-star-3'));
      await user.click(screen.getByTestId('repo-details-modal-close-button'));

      expect(mockRef.close).toHaveBeenCalledWith();
      expect(mockRef.close).not.toHaveBeenCalledWith(
        expect.objectContaining({ stars: expect.any(Number) }),
      );
    });
  });
});
