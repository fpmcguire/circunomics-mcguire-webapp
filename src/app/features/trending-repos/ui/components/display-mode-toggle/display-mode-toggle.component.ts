import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RepoListDisplayMode } from '../../../domain/models/repo-list-display-mode.model';

/**
 * DisplayModeToggleComponent
 *
 * A segmented control that lets the user switch between infinite-scroll and
 * paginated list-browsing modes.
 *
 * Fully presentational — receives the current mode as an input and emits
 * `modeChange` on user interaction. Holds no state.
 *
 * Accessibility:
 *  - Rendered as a `radiogroup` — exactly one option is always selected.
 *  - Each button carries `role="radio"` and `aria-checked`.
 *  - Arrow-key navigation is handled by the browser's radiogroup semantics.
 */
@Component({
  selector: 'app-display-mode-toggle',
  templateUrl: './display-mode-toggle.component.html',
  styleUrl: './display-mode-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayModeToggleComponent {
  /** The currently active display mode. */
  readonly mode = input.required<RepoListDisplayMode>();

  /** Fires when the user selects a different mode. */
  readonly modeChange = output<RepoListDisplayMode>();

  protected select(mode: RepoListDisplayMode): void {
    if (mode !== this.mode()) {
      this.modeChange.emit(mode);
    }
  }
}
