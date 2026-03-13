import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { DisplayModeToggleComponent } from './display-mode-toggle.component';

const renderToggle = (mode: 'infinite' | 'paginated' = 'paginated') =>
  render(DisplayModeToggleComponent, { componentInputs: { mode } });

describe('DisplayModeToggleComponent', () => {
  describe('rendering', () => {
    it('renders both mode buttons', async () => {
      await renderToggle();
      expect(screen.getByTestId('trending-repos-display-mode-paginated')).toBeInTheDocument();
      expect(screen.getByTestId('trending-repos-display-mode-infinite')).toBeInTheDocument();
    });

    it('has correct aria role on the container', async () => {
      await renderToggle();
      expect(screen.getByRole('radiogroup', { name: 'List view mode' })).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('marks Paginated as checked when mode is paginated', async () => {
      await renderToggle('paginated');
      const pagBtn = screen.getByTestId('trending-repos-display-mode-paginated');
      const infBtn = screen.getByTestId('trending-repos-display-mode-infinite');
      expect(pagBtn).toHaveAttribute('aria-checked', 'true');
      expect(infBtn).toHaveAttribute('aria-checked', 'false');
    });

    it('marks Infinite as checked when mode is infinite', async () => {
      await renderToggle('infinite');
      const pagBtn = screen.getByTestId('trending-repos-display-mode-paginated');
      const infBtn = screen.getByTestId('trending-repos-display-mode-infinite');
      expect(infBtn).toHaveAttribute('aria-checked', 'true');
      expect(pagBtn).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('modeChange output', () => {
    it('emits infinite when the Infinite button is clicked from paginated', async () => {
      const user = userEvent.setup();
      const { fixture } = await renderToggle('paginated');
      const emitted: string[] = [];
      fixture.componentInstance.modeChange.subscribe((m) => emitted.push(m));

      await user.click(screen.getByTestId('trending-repos-display-mode-infinite'));

      expect(emitted).toEqual(['infinite']);
    });

    it('emits paginated when the Paginated button is clicked from infinite', async () => {
      const user = userEvent.setup();
      const { fixture } = await renderToggle('infinite');
      const emitted: string[] = [];
      fixture.componentInstance.modeChange.subscribe((m) => emitted.push(m));

      await user.click(screen.getByTestId('trending-repos-display-mode-paginated'));

      expect(emitted).toEqual(['paginated']);
    });

    it('does not emit when clicking the already-active button', async () => {
      const user = userEvent.setup();
      const { fixture } = await renderToggle('paginated');
      const emitted: string[] = [];
      fixture.componentInstance.modeChange.subscribe((m) => emitted.push(m));

      await user.click(screen.getByTestId('trending-repos-display-mode-paginated'));

      expect(emitted).toHaveLength(0);
    });
  });
});
