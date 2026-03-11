import { render, screen, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StarRatingComponent } from './star-rating.component';

const renderRating = (currentRating = 0, repoId = 1) =>
  render(StarRatingComponent, {
    componentInputs: { currentRating, repoId },
  });

describe('StarRatingComponent', () => {
  describe('rendering', () => {
    it('renders 5 star labels', async () => {
      await renderRating();
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`repo-rating-star-${i}`)).toBeInTheDocument();
      }
    });

    it('renders 5 radio inputs', async () => {
      await renderRating();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
    });

    it('shows all empty stars when rating is 0', async () => {
      await renderRating(0);
      const labels = screen.getAllByRole('radio').map((r) => r.closest('label'));
      labels.forEach((l) => expect(l).not.toHaveClass('star-rating__label--filled'));
    });

    it('fills stars up to the current rating', async () => {
      await renderRating(3);
      for (let i = 1; i <= 3; i++) {
        expect(screen.getByTestId(`repo-rating-star-${i}`)).toHaveClass(
          'star-rating__label--filled',
        );
      }
      for (let i = 4; i <= 5; i++) {
        expect(screen.getByTestId(`repo-rating-star-${i}`)).not.toHaveClass(
          'star-rating__label--filled',
        );
      }
    });

    it('marks the matching radio as checked', async () => {
      await renderRating(2);
      const radios = screen.getAllByRole('radio');
      expect(radios[1]).toBeChecked(); // index 1 = value 2
    });

    it('gives each label a descriptive title attribute', async () => {
      await renderRating();
      expect(screen.getByTestId('repo-rating-star-1')).toHaveAttribute('title', '1 star');
      expect(screen.getByTestId('repo-rating-star-5')).toHaveAttribute('title', '5 stars');
    });
  });

  describe('interaction', () => {
    it('emits ratingChange when a star radio changes', async () => {
      const user = userEvent.setup();
      const { fixture } = await renderRating();
      const spy = vi.fn();
      fixture.componentInstance.ratingChange.subscribe(spy);

      // Click the 4th star label — triggers the underlying radio change
      await user.click(screen.getByTestId('repo-rating-star-4'));
      expect(spy).toHaveBeenCalledWith(4);
    });

    it('emits ratingChange with value 1 when first star is clicked', async () => {
      const user = userEvent.setup();
      const { fixture } = await renderRating();
      const spy = vi.fn();
      fixture.componentInstance.ratingChange.subscribe(spy);

      await user.click(screen.getByTestId('repo-rating-star-1'));
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('shows hover preview when mouse enters a star label', async () => {
      await renderRating(0);
      // Fire mouseenter on star 3 — stars 1, 2, 3 should appear filled
      fireEvent.mouseEnter(screen.getByTestId('repo-rating-star-3'));

      for (let i = 1; i <= 3; i++) {
        expect(screen.getByTestId(`repo-rating-star-${i}`)).toHaveClass(
          'star-rating__label--filled',
        );
      }
    });

    it('clears hover preview when mouse leaves the fieldset', async () => {
      await renderRating(0);
      const fieldset = screen.getByRole('group');

      fireEvent.mouseEnter(screen.getByTestId('repo-rating-star-3'));
      fireEvent.mouseLeave(fieldset);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`repo-rating-star-${i}`)).not.toHaveClass(
          'star-rating__label--filled',
        );
      }
    });
  });
});
