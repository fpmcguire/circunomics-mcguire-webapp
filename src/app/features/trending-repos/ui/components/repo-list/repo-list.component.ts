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
      return 'GitHub API rate limit has been hit. Try again retries immediately; if the limit is still active, wait a few minutes and retry. You can add a personal access token in environment.local.ts to increase your limit.';
    }
    if (this.error?.kind === 'network') {
      return 'Unable to reach GitHub. Check your connection and try again. Try again retries the last request immediately.';
    }
    if (this.error?.kind === 'unknown' && this.error.statusCode === 403) {
      return 'GitHub rejected the request (403). This can be a temporary API limit or permission issue. Try again retries immediately; if it keeps failing, wait a few minutes and retry.';
    }
    return this.error?.message ?? 'An unexpected error occurred.';
  }
}
