import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { GithubRepo } from '../../../domain/models/github-repo.model';
import { AppError } from '../../../../../shared/models/app-error.model';
import { RatingsMap } from '../../../application/state/trending-repos.state';
import { RepoCardComponent } from '../repo-card/repo-card.component';

/** Number of skeleton cards to render during the initial load. */
const SKELETON_COUNT = 6;

@Component({
  selector: 'app-repo-list',
  templateUrl: './repo-list.component.html',
  styleUrl: './repo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RepoCardComponent],
})
export class RepoListComponent {
  @Input({ required: true }) repos: GithubRepo[] = [];
  @Input({ required: true }) isLoading = false;
  @Input({ required: true }) isLoadingMore = false;
  @Input({ required: true }) error: AppError | null = null;
  @Input({ required: true }) isEmpty = false;
  @Input({ required: true }) ratings: RatingsMap = {};

  @Output() retryClick = new EventEmitter<void>();
  @Output() nameClick = new EventEmitter<GithubRepo>();

  readonly skeletons = Array.from({ length: SKELETON_COUNT });

  getRating(repoId: number): number {
    return this.ratings[repoId] ?? 0;
  }

  get errorHeading(): string {
    return this.error?.kind === 'rateLimit' ? 'GitHub rate limit reached' : 'Something went wrong';
  }

  get errorMessage(): string {
    if (this.error?.kind === 'rateLimit') {
      return 'You have hit the GitHub API rate limit. Add a personal access token in environment.local.ts to increase your limit, or wait a moment and try again.';
    }
    if (this.error?.kind === 'network') {
      return 'Unable to reach GitHub. Check your connection and try again.';
    }
    return this.error?.message ?? 'An unexpected error occurred.';
  }
}
