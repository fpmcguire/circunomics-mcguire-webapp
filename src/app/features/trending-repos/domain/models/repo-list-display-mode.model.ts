/**
 * Controls how the repo list is presented to the user.
 *
 *  - `paginated` — explicit Previous / Next controls; shows a bounded slice of results.
 *    This is the default mode and matches the current shipping UX.
 *
 *  - `infinite` — accumulated list with a scroll sentinel at the bottom that triggers
 *    the next API page when it enters the scroll viewport. No pagination controls shown.
 *
 * This type is the single source of truth for display-mode branching in the facade,
 * page template, and components. No ad-hoc string literals elsewhere.
 */
export type RepoListDisplayMode = 'infinite' | 'paginated';

/**
 * The mode used when no query param or runtime override is provided.
 * Keeps existing behaviour for users arriving without a `?mode=` param.
 */
export const DEFAULT_DISPLAY_MODE: RepoListDisplayMode = 'paginated';
