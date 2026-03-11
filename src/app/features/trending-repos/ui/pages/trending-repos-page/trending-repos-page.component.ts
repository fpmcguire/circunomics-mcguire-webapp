import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';

import { TrendingReposFacade } from '../../../application/facades/trending-repos.facade';
import { GithubRepo } from '../../../domain/models/github-repo.model';
import { RepoListComponent } from '../../components/repo-list/repo-list.component';
import { RepoPaginationComponent } from '../../components/repo-pagination/repo-pagination.component';
import { RepoDetailsDialogComponent } from '../../dialogs/repo-details-dialog/repo-details-dialog.component';
import {
  RepoDetailsDialogData,
  RepoDetailsDialogResult,
} from '../../dialogs/repo-details-dialog/repo-details-dialog.types';

@Component({
  selector: 'app-trending-repos-page',
  templateUrl: './trending-repos-page.component.html',
  styleUrl: './trending-repos-page.component.scss',
  providers: [TrendingReposFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RepoListComponent, RepoPaginationComponent, NgTemplateOutlet],
})
export class TrendingReposPageComponent implements OnInit {
  readonly facade = inject(TrendingReposFacade);
  private readonly dialog = inject(Dialog);

  ngOnInit(): void {
    this.facade.loadInitial();
  }

  /**
   * Opens the repo details dialog when a card name is clicked.
   *
   * CDK Dialog handles:
   *  - Focus trap within the dialog
   *  - Escape key closes the dialog
   *  - Backdrop click closes the dialog
   *  - Focus restoration to the triggering element on close
   *
   * Rating flow: the dialog returns { stars } on close; the facade
   * persists the rating only when stars > 0.
   */
  onNameClick(repo: GithubRepo): void {
    const ref = this.dialog.open<RepoDetailsDialogResult, RepoDetailsDialogData>(
      RepoDetailsDialogComponent,
      {
        data: { repo, currentRating: this.facade.getRating(repo.id) },
        ariaLabelledBy: 'repo-details-dialog-title',
        panelClass: 'repo-details-dialog-panel',
        backdropClass: 'repo-details-dialog-backdrop',
      },
    );

    ref.closed.subscribe((result) => {
      if (result && result.stars > 0) {
        this.facade.setRating(repo.id, result.stars);
      }
    });
  }
}
