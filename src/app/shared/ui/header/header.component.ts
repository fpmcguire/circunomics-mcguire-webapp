import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  openAbout(): void {
    this.dialog.open(AboutDialogComponent, {
      ariaLabelledBy: 'about-dialog-title',
      panelClass: 'about-dialog-panel',
      backdropClass: 'about-dialog-backdrop',
    });
  }
}
