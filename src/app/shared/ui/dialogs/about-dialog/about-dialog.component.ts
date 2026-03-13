import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

/**
 * AboutDialogComponent
 *
 * Displays a polished, user-facing overview of the app: purpose, browsing
 * modes, ratings, data source, and GitHub API rate-limit behaviour.
 *
 * Opened via Angular CDK Dialog — the same modal system used for
 * RepoDetailsDialogComponent. The CDK handles focus trap, Escape, backdrop
 * click, focus restoration, and aria-modal semantics.
 *
 * Overlay priority:
 *   The dialog is opened with `panelClass: 'about-dialog-panel'` and
 *   `backdropClass: 'about-dialog-backdrop'`. The CDK renders each dialog
 *   into its own OverlayContainer portal in DOM order, so whichever dialog
 *   is opened last sits on top. No ad-hoc z-index hacks are needed — the
 *   CDK's stacking model guarantees About appears above RepoDetailsDialog
 *   when opened while another dialog is already open.
 *
 * The component itself carries no state — it is purely presentational.
 */
@Component({
  selector: 'app-about-dialog',
  templateUrl: './about-dialog.component.html',
  styleUrl: './about-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'about-dialog',
    'data-testid': 'app-about-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'about-dialog-title',
  },
})
export class AboutDialogComponent {
  private readonly dialogRef = inject(DialogRef);

  protected close(): void {
    this.dialogRef.close();
  }
}
