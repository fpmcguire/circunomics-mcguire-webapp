import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
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
  private readonly overlay = inject(Overlay);
  private readonly document = inject(DOCUMENT);

  openAbout(): void {
    const ref = this.dialog.open(AboutDialogComponent, {
      ariaLabelledBy: 'about-dialog-title',
      panelClass: 'about-dialog-panel',
      backdropClass: 'about-dialog-backdrop',
      width: 'min(560px, calc(100vw - 2rem))',
      maxWidth: 'calc(100vw - 2rem)',
      maxHeight: 'calc(100dvh - 2rem)',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });

    this.document.body.classList.add('about-open');
    ref.closed.subscribe(() => {
      this.document.body.classList.remove('about-open');
    });
  }
}
