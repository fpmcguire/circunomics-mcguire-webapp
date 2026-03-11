import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { GithubRepo } from '../../../domain/models/github-repo.model';

/**
 * RepoCardComponent
 *
 * Presentational card for a single trending repository.
 * Emits `nameClick` when the repo name is activated — the page component
 * passes this to the detail dialog in Step 6.
 *
 * Read-only star rating display only in Step 5. Interactive rating lives in
 * the dialog (Step 6).
 */
@Component({
  selector: 'app-repo-card',
  templateUrl: './repo-card.component.html',
  styleUrl: './repo-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepoCardComponent {
  @Input({ required: true }) repo!: GithubRepo;
  @Input() rating = 0;
  @Output() nameClick = new EventEmitter<GithubRepo>();

  /** Array of 5 booleans for rendering filled/empty stars. */
  get starArray(): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < this.rating);
  }

  get formattedStars(): string {
    return this.repo.stars >= 1000
      ? `${(this.repo.stars / 1000).toFixed(1)}k`
      : String(this.repo.stars);
  }

  get ratingLabel(): string {
    return this.rating > 0 ? `Rated ${this.rating} out of 5 stars` : 'Not yet rated';
  }

  onNameClick(): void {
    this.nameClick.emit(this.repo);
  }
}
