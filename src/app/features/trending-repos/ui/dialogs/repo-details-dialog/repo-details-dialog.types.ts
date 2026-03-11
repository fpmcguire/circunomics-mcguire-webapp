import { GithubRepo } from '../../../domain/models/github-repo.model';

/** Data injected into the dialog by the page component. */
export interface RepoDetailsDialogData {
  readonly repo: GithubRepo;
  /** Current persisted rating for this repo (0 = unrated). */
  readonly currentRating: number;
}

/** Value emitted when the dialog closes. */
export interface RepoDetailsDialogResult {
  /** Star rating selected by the user (1–5). 0 means the user made no selection. */
  readonly stars: number;
}
