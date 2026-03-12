import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { GithubRepo } from '../../../domain/models/github-repo.model';

/**
 * RepoCardComponent
 *
 * Presentational card for a single trending repository.
 * Emits `nameClick` when the repo name button is activated — the page component
 * passes this to the detail dialog.
 *
 * Read-only star rating display — interactive rating lives in the dialog.
 */
@Component({
  selector: 'app-repo-card',
  templateUrl: './repo-card.component.html',
  styleUrl: './repo-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepoCardComponent {
  readonly repo = input.required<GithubRepo>();
  readonly rating = input(0);

  readonly nameClick = output<GithubRepo>();

  /** Array of 5 booleans for rendering filled/empty stars. */
  protected readonly starArray = computed(() =>
    Array.from({ length: 5 }, (_, i) => i < this.rating()),
  );

  protected readonly formattedStars = computed(() => {
    const n = this.repo().stars;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  });

  protected readonly ratingLabel = computed(() =>
    this.rating() > 0 ? `Rated ${this.rating()} out of 5 stars` : 'Not yet rated',
  );

  protected onNameClick(): void {
    this.nameClick.emit(this.repo());
  }
}
