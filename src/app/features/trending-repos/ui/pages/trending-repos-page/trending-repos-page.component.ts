import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';

import { TrendingReposFacade } from '../../../application/facades/trending-repos.facade';
import { GithubRepo } from '../../../domain/models/github-repo.model';
import { RepoListDisplayMode } from '../../../domain/models/repo-list-display-mode.model';
import { RepoListComponent } from '../../components/repo-list/repo-list.component';
import { RepoPaginationComponent } from '../../components/repo-pagination/repo-pagination.component';
import { DisplayModeToggleComponent } from '../../components/display-mode-toggle/display-mode-toggle.component';
import { IntersectionObserverDirective } from '../../../../../shared/directives/intersection-observer.directive';
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
  imports: [
    NgTemplateOutlet,
    RepoListComponent,
    RepoPaginationComponent,
    DisplayModeToggleComponent,
    IntersectionObserverDirective,
  ],
})
export class TrendingReposPageComponent implements OnInit {
  readonly facade = inject(TrendingReposFacade);

  private readonly dialog = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  /**
   * Reference to the scrollable list container element.
   * Passed to IntersectionObserverDirective as the observation root so the
   * sentinel fires relative to the container rather than the window viewport.
   */
  @ViewChild('listContainer', { static: true })
  listContainerRef!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this._applyModeFromQueryParam();
    this.facade.loadInitial();
  }

  /** Called when the infinite-scroll sentinel enters the scroll viewport. */
  onSentinelIntersected(): void {
    this.facade.loadMore();
  }

  /**
   * Opens the repo details dialog when a card name is clicked.
   *
   * CDK Dialog handles focus trap, Escape key, backdrop click, and focus
   * restoration. Rating is persisted only when the dialog closes with a result.
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

    ref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result && result.stars > 0) {
        this.facade.setRating(repo.id, result.stars);
      }
    });
  }

  /**
   * Read `?mode=infinite|paginated` from the URL and apply it as the initial
   * display mode. Silently ignores unknown values — the facade default is used.
   */
  private _applyModeFromQueryParam(): void {
    const param = this.route.snapshot.queryParamMap.get('mode') as RepoListDisplayMode | null;
    if (param === 'infinite' || param === 'paginated') {
      this.facade.setDisplayMode(param);
    }
  }
}
