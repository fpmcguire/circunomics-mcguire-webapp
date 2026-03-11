import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
 *  - Escape key closes the dialog
 *  - Backdrop click closes the dialog
 *  - Focus restoration to the triggering element on close
 *  - role="dialog", aria-modal="true" on the overlay pane
 *
 * The page component passes `ariaLabelledBy: 'repo-details-dialog-title'` in
 * the open config, connecting the dialog title to the overlay's accessible name.
 *
 * Rating flow:
 *  - Dialog opens with the current persisted rating
 *  - User selects a star → selectedRating signal updates
 *  - Dialog closes (any path) → returns { stars: selectedRating() }
 *  - Page component saves the rating via facade.setRating() if stars > 0
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

  /** Close the dialog, passing back the current rating selection. */
  protected close(): void {
    this.dialogRef.close({ stars: this.selectedRating() });
  }
}
