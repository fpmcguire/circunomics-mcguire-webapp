import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

import { GithubRepo } from '../../../domain/models/github-repo.model';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { RepoDetailsDialogData, RepoDetailsDialogResult } from './repo-details-dialog.types';

/**
 * RepoDetailsDialogComponent
 *
 * Displays full details for a single trending repository and lets the user
 * assign a 1–5 star rating.
 *
 * Opened via Angular CDK Dialog — the CDK handles:
 *  - Focus trap (tab cycling within the dialog)
 *  - Escape key closes the dialog (dismiss — no rating saved)
 *  - Backdrop click closes the dialog (dismiss — no rating saved)
 *  - Focus restoration to the triggering element on close
 *  - role="dialog", aria-modal="true" on the overlay pane
 *
 * The page component passes `ariaLabelledBy: 'repo-details-dialog-title'` in
 * the open config, connecting the dialog title to the overlay's accessible name.
 *
 * Rating flow — Option A (explicit save):
 *  - Dialog opens with the current persisted rating pre-filled
 *  - User selects a star → selectedRating signal updates (preview only)
 *  - "Save rating" button → saveAndClose() → returns { stars: selectedRating() }
 *  - X icon / Cancel / Escape / backdrop → dismiss() → returns undefined
 *  - Page component saves only when result is defined and stars > 0
 *
 * Draggable dialog:
 *  - CDK DragDrop drag-to-reposition was intentionally not implemented.
 *  - Accessibility and focus behaviour take priority over drag interaction.
 *  - If drag is added in a future iteration it must be verified to leave
 *    keyboard navigation, focus trap, and Escape handling fully intact.
 */
@Component({
  selector: 'app-repo-details-dialog',
  templateUrl: './repo-details-dialog.component.html',
  styleUrl: './repo-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StarRatingComponent],
  host: {
    class: 'repo-details-dialog',
    'data-testid': 'repo-details-modal',
  },
})
export class RepoDetailsDialogComponent {
  // data must be declared before selectedRating so the signal initializer can read it
  protected readonly data = inject<RepoDetailsDialogData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<RepoDetailsDialogResult>>(DialogRef);

  /** Current rating selection within this dialog session. */
  protected readonly selectedRating = signal(this.data.currentRating);

  /** True when the user has selected a star and the Save button should be enabled. */
  protected readonly canSave = computed(() => this.selectedRating() > 0);

  protected get repo(): GithubRepo {
    return this.data.repo;
  }

  protected get formattedStars(): string {
    const n = this.repo.stars;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  protected get createdAtFormatted(): string {
    return this.repo.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  protected onRatingChange(stars: number): void {
    this.selectedRating.set(stars);
  }

  /**
   * Save the selected rating and close.
   * Only reachable via the explicit "Save rating" button — not triggered by
   * Escape, backdrop click, or the Cancel/X buttons.
   */
  protected saveAndClose(): void {
    this.dialogRef.close({ stars: this.selectedRating() });
  }

  /**
   * Dismiss the dialog without saving.
   * Called by the X icon and Cancel buttons. Escape and backdrop click also
   * produce this outcome via CDK's default close behaviour (undefined result).
   */
  protected dismiss(): void {
    this.dialogRef.close();
  }
}
