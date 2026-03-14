import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { AboutDialogComponent } from '../dialogs/about-dialog/about-dialog.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly dialog = inject(Dialog);
  private readonly document = inject(DOCUMENT);

  /**
   * Opens the About dialog.
   *
   * This is intentionally reachable at any time — including while a
   * RepoDetailsDialog is already open. Opening About in that context is a
   * deliberate product choice: the header remains interactive so users can
   * access app-level context without having to dismiss whatever they were
   * looking at first.
   *
   * CDK overlay ordering handles the stacking correctly: About is appended
   * to the document after the existing dialog and therefore sits on top as
   * the active focus-trapped surface. Closing About returns focus here;
   * the underlying dialog is unaffected.
   */
  openAbout(): void {
    const ref = this.dialog.open(AboutDialogComponent, {
      ariaLabelledBy: 'about-dialog-title',
      panelClass: 'about-dialog-panel',
      backdropClass: 'about-dialog-backdrop',
      maxHeight: 'calc(100dvh - 24px)',
    });

    this.document.body.classList.add('about-open');
    ref.closed.subscribe(() => {
      this.document.body.classList.remove('about-open');
    });
  }
}
