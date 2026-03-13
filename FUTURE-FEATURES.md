# Future Features

This document captures proposed enhancements for the GitHub trending repositories app, along with feasibility notes, API considerations, and implementation risks.

## 1. Desktop-only scrollable list container between header and footer

### Idea
On non-mobile layouts, place the repository list inside a dynamic container that fills the vertical space between the page header and footer.

The intended behavior is:
- the header remains visible at the top
- the footer remains visible at the bottom of the viewport
- the repository list becomes its own scrollable region
- the list container resizes dynamically as the viewport changes
- the user scrolls the list itself rather than the whole page

This should apply to both supported browsing modes:
- infinite list mode
- paginated list mode

### Feasibility
This is feasible as a frontend layout enhancement and does not require any additional GitHub API access.

The main work is in layout structure, responsive CSS, and behavior adjustments for scrolling logic. On desktop and larger tablet breakpoints, the page can be converted into a viewport-based shell where the central content region stretches to fill the remaining height and the list region uses `overflow: auto`. On mobile, the current document-scroll behavior should remain unchanged.

### Technical implications
- Introduce a desktop-only page layout mode with a constrained viewport-height shell.
- Keep header and footer persistently visible within the viewport.
- Make the list region the scroll container for both list display modes.
- Ensure the container adapts correctly on window resize and orientation changes.
- In infinite-scroll mode, ensure the sentinel observes correctly within the list container rather than the full document scroll context.
- In paginated mode, ensure pagination controls remain visible and usable inside the resized content area.
- Confirm that modal behavior, focus management, keyboard navigation, and screen-reader flow still work correctly in the new layout.

### Risks and tradeoffs
- Layout bugs can appear when mixing sticky or fixed page chrome with dynamic-height content areas.
- Infinite-scroll behavior becomes slightly more complex because the observation root may need to be the list container instead of the page viewport.
- Long descriptions, loading states, and empty/error states must still render cleanly inside a constrained-height region.
- If implemented carelessly, nested scrolling can create accessibility and usability issues.
- This should remain desktop-only; forcing the same pattern onto mobile would likely worsen usability.

### Recommendation
This is a strong future UX enhancement for desktop views. It does not depend on new API capabilities, but it should be treated as a layout-and-interaction feature with careful responsive and accessibility testing.

---

## 2. Dynamic repository age-range selector

### Idea
Allow the user to choose the repository creation window instead of using a fixed 30-day filter.

Possible presets:
- 1 day
- 15 days
- 30 days
- 60 days
- 90 days
- 360 days

### Feasibility
This is feasible with the current GitHub REST API usage model because the app already queries GitHub Search with a `created:>YYYY-MM-DD` filter. The current fixed 30-day cutoff can be replaced with a dynamic value based on the selected range. Public repository search can be used without authentication, although authenticated requests are strongly preferred because they have a much higher rate limit.

### Technical implications
- Add a UI control for the range selection.
- Recompute the search cutoff date whenever the selection changes.
- Reset list state when the date range changes.
- Ensure pagination, ratings, and the repository-detail dialog continue to work correctly with the refreshed result set.
- Consider whether the selected range should be reflected in the URL as a query parameter.

### Risks and tradeoffs
- Larger windows such as 90 or 360 days can produce much larger result sets, which increases API traffic and can make the experience feel slower.
- Search API usage is more sensitive to rate limits than simple local filtering, especially during development or demos. Authenticated requests are likely advisable for a polished experience.
- The UX should make it clear that changing the range refreshes the list and may alter the relative popularity of repositories.

### Recommendation
This is a strong candidate for a future enhancement. It is relatively low risk, fits the current architecture well, and adds clear product value.

---

## 3. Daily line graph in the repository detail dialog

### Idea
Show a daily trend line inside the repository detail popup for the selected date range.

There are two possible interpretations of this feature:
1. **Daily star-history graph**
2. **Daily traffic/views graph**

These are not equally feasible.

### Option A: Daily star-history graph

#### Feasibility
This is feasible for public repositories using the GitHub REST API's stargazer endpoint. GitHub's "List stargazers" endpoint supports the `application/vnd.github.star+json` media type, which includes the timestamp for when each star was created. That means the app can fetch stargazer timestamps, group them by day, and render a daily line chart.

#### Technical implications
- Fetch stargazer events for the selected repository.
- Aggregate `starred_at` timestamps into daily buckets.
- Plot the buckets as a time-series chart in the dialog.
- Align the chart window to the selected date range where appropriate.
- Add loading and error states to the dialog for chart data.

#### Risks and tradeoffs
- This can become API-expensive for popular repositories because stargazer results are paginated. Large repositories may require many requests to produce a useful chart.
- Unauthenticated usage may hit rate limits quickly. Authenticated requests are likely necessary for a reliable chart experience.
- The chart may need limits or simplifications for very large repositories to avoid slow dialog loads.
- The feature should be designed so that chart loading does not block the rest of the dialog.

#### Recommendation
Feasible, but medium risk. Best treated as an optional enhancement with careful rate-limit handling, incremental loading, and graceful fallbacks.

### Option B: Daily traffic/views graph

#### Feasibility
This is not generally feasible for arbitrary public repositories with the app's current public-data access model. GitHub's traffic endpoints expose only the last 14 days of views/clones and require elevated repository access rather than normal public-read access. That makes them unsuitable for a general-purpose chart in this app.

#### Risks and tradeoffs
- Requires stronger repository permissions than the app currently assumes.
- Only supports the last 14 days, which does not align well with 30/60/90/360-day filtering.
- Would not work consistently for arbitrary third-party repositories returned by search.

#### Recommendation
Do not plan the dialog chart around GitHub traffic/views data.

---

## Recommended future direction

If this feature area is pursued, the best path is:

1. Implement the **desktop-only scrollable list container** first if desktop layout polish is the current product priority.
2. Implement the **dynamic age-range selector** next.
3. If a chart is later added, make it a **star-history chart**, not a traffic/views chart.
4. Treat the chart as an **optional enhancement** with strong fallback behavior when rate limits, request volume, or repository size make detailed charting impractical.

## Suggested documentation note

If this file is included in the repository, reference it from `PROJECT.md` or `README.md` as a future-enhancements note rather than as committed roadmap scope.
