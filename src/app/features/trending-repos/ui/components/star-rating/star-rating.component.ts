import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * StarRatingComponent
 *
 * Accessible, interactive 5-star rating widget using a radio-group pattern.
 *
 * - Keyboard navigable via arrow keys (browser-native radio group behaviour)
 * - Screen-reader friendly: each option announces as "N stars"
 * - Hover preview: hovering a star previews the rating before clicking
 * - Controlled: parent owns the persisted rating; this component is stateless
 *   except for the ephemeral hover preview
 *
 * Usage:
 *   <app-star-rating
 *     [currentRating]="selectedRating()"
 *     [repoId]="repo.id"
 *     (ratingChange)="onRatingChange($event)"
 *   />
 */
@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent {
  /** Current persisted rating passed in from parent (0 = unrated). */
  readonly currentRating = input(0);

  /**
   * Repo ID used to namespace the radio input `name` attribute.
   * Prevents radio groups from interfering when multiple rating widgets exist.
   */
  readonly repoId = input(0);

  /** Emits the newly selected star value (1–5) when the user clicks a star. */
  readonly ratingChange = output<number>();

  /** Ephemeral hover state — resets to 0 when the cursor leaves. */
  protected readonly hoverRating = signal(0);

  /**
   * The rating shown visually: hover preview takes priority over persisted rating.
   * Falls back to currentRating when not hovering.
   */
  protected readonly displayRating = computed(() => this.hoverRating() || this.currentRating());

  protected readonly stars = [1, 2, 3, 4, 5] as const;

  protected isFilled(value: number): boolean {
    return value <= this.displayRating();
  }

  protected onSelect(value: number): void {
    this.ratingChange.emit(value);
  }

  protected onHover(value: number): void {
    this.hoverRating.set(value);
  }

  protected onLeave(): void {
    this.hoverRating.set(0);
  }

  protected starLabel(value: number): string {
    return value === 1 ? '1 star' : `${value} stars`;
  }
}
