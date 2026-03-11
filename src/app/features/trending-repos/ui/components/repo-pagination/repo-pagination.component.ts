import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * RepoPaginationComponent
 *
 * Presentational pagination controls for the trending repos list.
 * Receives all state as inputs and emits navigation events — it holds
 * no logic of its own.
 *
 * Distinguishes clearly between:
 *  - UI page  — the visible slice currently shown to the user
 *  - loaded   — the total number of repos fetched from the API so far
 *
 * The parent (page component) is responsible for triggering API fetches
 * when the user advances beyond the loaded set.
 */
@Component({
  selector: 'app-repo-pagination',
  templateUrl: './repo-pagination.component.html',
  styleUrl: './repo-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepoPaginationComponent {
  /** Current 1-indexed UI page number. */
  @Input({ required: true }) currentPage = 1;

  /** Whether the previous button should be enabled. */
  @Input({ required: true }) canGoPrevious = false;

  /** Whether the next button should be enabled (accounts for loading state). */
  @Input({ required: true }) canGoNext = false;

  /** True while additional API data is being fetched for the next page. */
  @Input({ required: true }) isLoadingMore = false;

  /** 1-indexed position of the first visible repo (0 when list is empty). */
  @Input({ required: true }) rangeStart = 0;

  /** 1-indexed position of the last visible repo. */
  @Input({ required: true }) rangeEnd = 0;

  /** Total number of repos fetched from the API and held in memory. */
  @Input({ required: true }) totalLoaded = 0;

  /** Emitted when the user clicks the Previous button. */
  @Output() previousClick = new EventEmitter<void>();

  /** Emitted when the user clicks the Next button. */
  @Output() nextClick = new EventEmitter<void>();
}
