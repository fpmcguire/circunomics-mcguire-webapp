import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DialogRef } from '@angular/cdk/dialog';
import { AboutDialogComponent } from './about-dialog.component';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMockDialogRef = () => ({ close: vi.fn() });

const renderDialog = (mockRef = makeMockDialogRef()) =>
  render(AboutDialogComponent, {
    providers: [{ provide: DialogRef, useValue: mockRef }],
  });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AboutDialogComponent', () => {
  describe('content rendering', () => {
    it('renders the dialog title', async () => {
      await renderDialog();
      expect(screen.getByTestId('app-about-modal-title')).toHaveTextContent('About this app');
    });

    it('renders the browsing modes section', async () => {
      await renderDialog();
      expect(screen.getByTestId('app-about-modal-section-browsing-modes')).toBeInTheDocument();
      expect(
        screen.getByTestId('app-about-modal-section-browsing-modes'),
      ).toHaveTextContent(/paginated/i);
      expect(
        screen.getByTestId('app-about-modal-section-browsing-modes'),
      ).toHaveTextContent(/infinite/i);
    });

    it('renders the ratings section', async () => {
      await renderDialog();
      expect(screen.getByTestId('app-about-modal-section-ratings')).toBeInTheDocument();
      expect(screen.getByTestId('app-about-modal-section-ratings')).toHaveTextContent(
        /1.{1,3}5 star/i,
      );
    });

    it('renders the API limits section', async () => {
      await renderDialog();
      expect(screen.getByTestId('app-about-modal-section-api-limits')).toBeInTheDocument();
      expect(screen.getByTestId('app-about-modal-section-api-limits')).toHaveTextContent(
        /rate.{0,10}limit/i,
      );
      expect(screen.getByTestId('app-about-modal-section-api-limits')).toHaveTextContent(
        /retry/i,
      );
    });

    it('renders the roadmap section with all three groups', async () => {
      await renderDialog();
      const section = screen.getByTestId('app-about-modal-section-roadmap');
      expect(section).toBeInTheDocument();
      expect(section).toHaveTextContent(/discovery/i);
      expect(section).toHaveTextContent(/detail/i);
      expect(section).toHaveTextContent(/personalisation/i);
    });

    it('has a close button', async () => {
      await renderDialog();
      expect(screen.getByTestId('app-about-modal-close-button')).toBeInTheDocument();
    });
  });

  describe('close behaviour', () => {
    it('calls dialogRef.close when the X button is clicked', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog(mockRef);

      await user.click(screen.getByTestId('app-about-modal-close-button'));

      expect(mockRef.close).toHaveBeenCalledOnce();
    });

    it('calls dialogRef.close when the footer Close button is clicked', async () => {
      const user = userEvent.setup();
      const mockRef = makeMockDialogRef();
      await renderDialog(mockRef);

      await user.click(screen.getByRole('button', { name: /^close$/i }));

      expect(mockRef.close).toHaveBeenCalledOnce();
    });
  });

  describe('accessibility', () => {
    it('has the dialog title linked to the aria-labelledby id', async () => {
      await renderDialog();
      const title = screen.getByTestId('app-about-modal-title');
      expect(title).toHaveAttribute('id', 'about-dialog-title');
    });
  });
});
