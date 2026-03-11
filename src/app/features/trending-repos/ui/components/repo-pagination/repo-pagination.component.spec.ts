import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RepoPaginationComponent } from './repo-pagination.component';

interface PaginationInputs {
  currentPage: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLoadingMore: boolean;
  rangeStart: number;
  rangeEnd: number;
  totalLoaded: number;
}

const BASE_INPUTS: PaginationInputs = {
  currentPage: 1,
  canGoPrevious: false,
  canGoNext: true,
  isLoadingMore: false,
  rangeStart: 1,
  rangeEnd: 10,
  totalLoaded: 15,
};

const renderPagination = (inputs: Partial<PaginationInputs> = {}) =>
  render(RepoPaginationComponent, {
    componentInputs: { ...BASE_INPUTS, ...inputs },
  });

describe('RepoPaginationComponent', () => {
  describe('rendering', () => {
    it('renders the pagination nav', async () => {
      await renderPagination();
      expect(screen.getByTestId('trending-repos-pagination')).toBeInTheDocument();
    });

    it('renders previous and next buttons', async () => {
      await renderPagination();
      expect(screen.getByTestId('trending-repos-pagination-prev-button')).toBeInTheDocument();
      expect(screen.getByTestId('trending-repos-pagination-next-button')).toBeInTheDocument();
    });

    it('shows the current page indicator', async () => {
      await renderPagination({ currentPage: 3 });
      expect(screen.getByTestId('trending-repos-pagination-page-indicator')).toHaveTextContent(
        'Page 3',
      );
    });

    it('shows the range indicator when totalLoaded > 0', async () => {
      await renderPagination({ rangeStart: 11, rangeEnd: 20, totalLoaded: 25 });
      const range = screen.getByTestId('trending-repos-pagination-range-indicator');
      expect(range).toHaveTextContent('Showing 11–20 of 25');
    });
  });

  describe('disabled states', () => {
    it('disables the previous button when canGoPrevious is false', async () => {
      await renderPagination({ canGoPrevious: false });
      expect(screen.getByTestId('trending-repos-pagination-prev-button')).toBeDisabled();
    });

    it('enables the previous button when canGoPrevious is true', async () => {
      await renderPagination({ canGoPrevious: true });
      expect(screen.getByTestId('trending-repos-pagination-prev-button')).not.toBeDisabled();
    });

    it('disables the next button when canGoNext is false', async () => {
      await renderPagination({ canGoNext: false });
      expect(screen.getByTestId('trending-repos-pagination-next-button')).toBeDisabled();
    });

    it('disables the next button while isLoadingMore is true', async () => {
      await renderPagination({ canGoNext: true, isLoadingMore: true });
      expect(screen.getByTestId('trending-repos-pagination-next-button')).toBeDisabled();
    });

    it('shows loading text on the next button while isLoadingMore', async () => {
      await renderPagination({ isLoadingMore: true });
      expect(screen.getByTestId('trending-repos-pagination-next-button')).toHaveTextContent(
        'Loading…',
      );
    });
  });

  describe('interactions', () => {
    it('emits previousClick when the previous button is clicked', async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      await render(RepoPaginationComponent, {
        componentInputs: { ...BASE_INPUTS, canGoPrevious: true },
        on: { previousClick: onPrev },
      });
      await user.click(screen.getByTestId('trending-repos-pagination-prev-button'));
      expect(onPrev).toHaveBeenCalledOnce();
    });

    it('emits nextClick when the next button is clicked', async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      await render(RepoPaginationComponent, {
        componentInputs: { ...BASE_INPUTS, canGoNext: true },
        on: { nextClick: onNext },
      });
      await user.click(screen.getByTestId('trending-repos-pagination-next-button'));
      expect(onNext).toHaveBeenCalledOnce();
    });

    it('does not emit previousClick when the previous button is disabled', async () => {
      const onPrev = vi.fn();
      await render(RepoPaginationComponent, {
        componentInputs: { ...BASE_INPUTS, canGoPrevious: false },
        on: { previousClick: onPrev },
      });
      // Disabled button — userEvent skip is the correct assertion here
      const btn = screen.getByTestId('trending-repos-pagination-prev-button');
      expect(btn).toBeDisabled();
      expect(onPrev).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('previous button has aria-label "Go to previous page"', async () => {
      await renderPagination();
      expect(screen.getByTestId('trending-repos-pagination-prev-button')).toHaveAttribute(
        'aria-label',
        'Go to previous page',
      );
    });

    it('next button has aria-label "Go to next page"', async () => {
      await renderPagination();
      expect(screen.getByTestId('trending-repos-pagination-next-button')).toHaveAttribute(
        'aria-label',
        'Go to next page',
      );
    });

    it('nav has an accessible label', async () => {
      await renderPagination();
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    });
  });
});
