# FUTURE-FEATURES

This document captures product ideas beyond the current implemented scope of the app, plus two notable capabilities that already exist and should be treated as product strengths worth preserving and expanding.

## Scoring model

**ROI score (1–5)**

- **5** = high product value, high feasibility, strong priority
- **4** = valuable and realistic, but with some added complexity or dependency
- **3** = useful, but either narrower in audience or more effort/risk
- **2** = interesting, but lower immediate payoff or higher implementation cost
- **1** = speculative or low-priority compared with other opportunities

---

## Existing capabilities worth preserving and expanding

### Dual display modes: Infinite and Paginated
**Status:** Already implemented

#### Summary
The app already supports two browsing modes for repository discovery:

- **Infinite** mode for continuous scrolling and progressive loading
- **Paginated** mode for bounded, page-by-page browsing

This is more than a UI toggle. It is a meaningful product capability that demonstrates the app can support alternate browsing behaviors over the same shared data layer.

#### Why this is valuable
This capability creates flexibility for different user preferences and evaluation contexts:

- some users prefer fast exploratory scrolling
- others prefer controlled, bounded navigation
- it supports experiment-style product comparisons without splitting the codebase
- it demonstrates architectural maturity and extensibility

#### Product benefits
- better reviewer/demo experience
- stronger experimentation story
- easier future feature-flagging or A/B-style evaluation
- improved adaptability for different desktop workflows

#### Possible future variations
- remember the last-selected mode per browser
- allow mode selection via saved views
- URL init from query param is already implemented (?mode=paginated / ?mode=infinite on page load); what is not yet done is live write-back — updating the URL when the user toggles mode manually after load
- add analytics hooks for comparing interaction patterns between modes

#### Technical notes / risks
- mode-specific behavior must remain clearly separated from API paging logic
- accessibility and focus behavior must remain consistent in both modes
- documentation must stay clear that both modes share one data layer and one rating/detail workflow

#### ROI
**5 / 5**

---

---

---

### Desktop-only internal scroll container for repository lists
**Status:** Already implemented (fixed in Step 9 hygiene pass)

#### Summary
On non-mobile layouts, the repository list sits inside a dynamically sized container that fills the viewport between the header and footer. Only the list region scrolls — the header and footer remain visible at all times. On mobile, native page scrolling is preserved unchanged.

#### Why this was needed
The layout was fully coded across the flex chain (body → app-root → main → page → list container), but the root link was broken by an Angular view encapsulation issue: `app.scss` styled the host using `.app-root` (a class selector, compiled under `_ngcontent`) rather than `:host` (compiled under `_nghost`). The class rule silently never matched the host element, so the flex chain never resolved and the page scrolled normally instead.

The fix was a single selector change in `app.scss`: `.app-root { ... }` → `:host { ... }`.

#### Product benefits
- stronger SaaS-style dashboard feel — application-like rather than document-like
- core navigation and context remain visible during long browsing sessions
- reduces scroll fatigue in both infinite and paginated modes on desktop
- footer always visible — creates a clear bottom boundary for the content area

#### Possible future variations
- optional remembered list density or height preferences
- future split-view layout with detail pane beside the list

#### Technical notes
- the `IntersectionObserverDirective` correctly uses the list container as its `intersectionRoot` so the infinite scroll sentinel fires relative to the container, not the browser viewport — this was already correct
- mobile layout is unchanged; height constraint only applies at ≥ 641px

#### ROI
**5 / 5** — already delivered; no further implementation cost

---
## Future features

### 1. Dynamic date-range selector
**Status:** Proposed future feature

#### Summary
Replace the fixed “last 30 days” query window with a user-selectable date-range control. Example presets could include:

- 1 day
- 7 days
- 15 days
- 30 days
- 60 days
- 90 days
- 180 days
- 360 days

This would let users explore “trending” repositories over different recent windows rather than a single hardcoded definition.

#### Why this is valuable
Users often want to compare newly emerging repositories with more established recent momentum. A dynamic date range makes the app more exploratory and significantly more useful.

#### Product benefits
- more flexible discovery
- better comparison of short-term vs longer-term trends
- stronger feeling of user control
- natural fit with dual display modes, search, filters, and saved views

#### Possible variations
- preset buttons only
- custom date range picker later
- “recent,” “quarter,” and “year” labels instead of raw day counts
- remember last-used range locally

#### Technical notes / risks
- broad windows can return far more results and increase API load
- longer ranges can blur the meaning of “trending”
- rate-limit handling becomes more important as users explore more combinations
- UI should clearly indicate what date range is active

#### ROI
**5 / 5**

---

### 2. Daily line graph in the repository detail modal
**Status:** Proposed future feature

#### Summary
Add a compact time-series chart to the repo detail modal for the selected date range. The most realistic interpretation is a **daily star-history-style graph**, derived from GitHub stargazer timestamps where feasible.

#### Why this is valuable
A chart adds interpretation and visual trend recognition, making the details modal feel more insightful and less text-only.

#### Product benefits
- richer repository detail experience
- faster visual understanding of momentum
- more compelling demo/review experience
- creates a natural bridge to more analytics-oriented features later

#### Possible variations
- cumulative stars over time
- stars-per-day trend line
- overlay current selected date range
- compact sparkline in list items later for highly ranked repos

#### Technical notes / risks
- this is API-expensive for popular repositories because stargazer history is paginated
- large repositories may require many requests, causing performance and rate-limit pressure
- traffic/views metrics are not generally feasible for arbitrary public repos because GitHub restricts those endpoints
- chart loading states and fallback behavior must be graceful
- likely best implemented only on demand when a detail modal is opened

#### ROI
**3 / 5**

---

### 3. Topic-based repository search
**Status:** Proposed future feature

#### Summary
Allow users to search repositories by GitHub topic, such as:

- `topic:angular`
- `topic:ai`
- `topic:climate-tech`

This would expose topic-focused discovery directly in the UI.

#### Why this is valuable
Topics are one of the cleanest ways to organize discovery around ecosystems, domains, and technologies.

#### Product benefits
- more relevant discovery
- stronger thematic exploration
- pairs naturally with date ranges and display modes
- useful for recruiters, engineers, and product researchers exploring a domain

#### Possible variations
- single topic search
- multi-topic inclusion/exclusion
- suggested/popular topics
- recent topic chips in the UI

#### Technical notes / risks
- topic quality varies by repository because topic tags are user-maintained
- some repos have weak or missing topic metadata
- broad topic searches may still hit search-result and rate-limit limits
- topic filters should remain easy to clear and understand

#### ROI
**5 / 5**

---

### 4. Search-term repository search
**Status:** Proposed future feature

#### Summary
Allow users to search repositories with keyword-based search terms across name, description, topics, or README-related search contexts.

Examples:
- `angular`
- `observability`
- `dashboard`
- `data pipeline`

#### Why this is valuable
This is one of the most immediately understandable product enhancements. It makes the app feel like a true exploration tool rather than a fixed leaderboard.

#### Product benefits
- broadens the usefulness of the app dramatically
- supports targeted exploration and product research
- pairs well with topic filters and date ranges
- creates a natural path toward saved views and advanced filtering

#### Possible variations
- simple keyword search
- advanced search fields later
- debounced search
- “search within current results” vs “new GitHub query” modes

#### Technical notes / risks
- GitHub search syntax and qualifiers can be powerful but also confusing if exposed too directly
- long/complex queries can fail validation
- search endpoints have stricter rate limits than many other REST endpoints
- the UI should make it clear when the current result set reflects a filtered search rather than a default trending view

#### ROI
**5 / 5**

---

### 5. AI-prompt-assisted repository search
**Status:** Proposed future feature

#### Summary
Allow the user to enter a natural-language request, then translate it into a GitHub repository search query.

Example:
- user prompt: “Find recently created Angular dashboard libraries with charts”
- translated search query: keywords + GitHub qualifiers for date, language, and search fields

This would be an AI-assisted query builder, not native semantic search from GitHub.

#### Why this is valuable
It lowers the barrier to powerful search and makes the app feel more innovative and user-friendly, especially for non-expert users.

#### Product benefits
- friendlier discovery experience
- reduces need to learn GitHub query syntax
- supports exploratory and conversational workflows
- differentiates the product experience from raw GitHub search

#### Possible variations
- one-click prompt suggestions
- visible “translated query” for transparency
- edit-and-refine workflow
- hybrid mode: AI prompt + advanced manual filters

#### Technical notes / risks
- GitHub does not natively support natural-language search queries; translation logic must be built externally
- an AI layer adds cost, complexity, and result-quality variance
- users may expect true semantic understanding beyond what the translated GitHub query can deliver
- the app should show the generated query clearly so the behavior feels trustworthy

#### ROI
**3 / 5**

---

### 6. Saved views / watchlists
**Status:** Proposed future feature

#### Summary
Let users save a reusable browsing configuration, such as:
- display mode
- date range
- search term
- topic
- sort option
- filters

Saved views could then be reopened with one click.

#### Why this is valuable
This turns the app from a one-time exploration tool into a reusable workflow tool. It supports continuity, repeatability, and return usage.

#### Product benefits
- stronger personalization
- faster repeat exploration
- increased retention and return value
- excellent fit with dual display modes, search, and filtering

#### Possible variations
- local-only saved views
- pinned default view
- import/export saved views
- team-shared views if a backend is ever introduced

#### Technical notes / risks
- local-only implementation is straightforward, but shared/team views would require backend support
- saved-view naming and management UI should remain simple
- stored configurations must evolve safely if future query models change

#### ROI
**4 / 5** — high value, but almost entirely downstream: saved views have little utility without date-range, search, or topic filters being built first. The implementation order correctly reflects this dependency.

---

### 7. Compare repositories side by side
**Status:** Proposed future feature

#### Summary
Allow users to select 2–4 repositories and compare them side by side across key metrics such as:
- stars
- open issues
- owner
- language
- created date
- local rating

#### Why this is valuable
Comparison helps users move from passive browsing to decision-making. It is especially useful when several repos appear similar at first glance.

#### Product benefits
- supports more deliberate evaluation
- makes the app more useful for shortlisting
- increases decision-support value
- pairs well with saved views and local ratings

#### Possible variations
- compare from list checkboxes
- compare from detail modal
- compact compare tray
- export compare snapshot later

#### Technical notes / risks
- requires careful selection-state management
- compare UI can become cluttered if too many fields are included
- some comparison metrics may need normalization or clearer labels to be meaningful

#### ROI
**4 / 5**

---

### 8. Advanced filters panel
**Status:** Proposed future feature

#### Summary
Add a structured filter panel for refining results by criteria such as:
- language
- minimum stars
- owner or organization
- topic
- created range
- exclude forks

#### Why this is valuable
Advanced filters let users narrow noisy result sets quickly and make the app feel significantly more powerful.

#### Product benefits
- better precision in discovery
- stronger professional/research use cases
- complements search, topics, and date range features
- makes saved views substantially more valuable

#### Possible variations
- inline compact filters
- expandable advanced panel
- removable filter chips
- presets for common filter bundles

#### Technical notes / risks
- the UI can become crowded if too many controls are added too early
- GitHub search qualifier support is strong but not unlimited
- filters should be clearly visible and easy to reset
- documentation and query-state handling become more important as combinations grow

#### ROI
**4 / 5** — multiplier feature, not a foundation feature. Its value is real but contingent: it becomes substantially more useful once search, topics, and date range exist to generate the combinations worth filtering. Score reflects that dependency.

---

### 9. Repository trend snapshot
**Status:** Proposed future feature

#### Summary
In the detail modal, add a compact interpretation block with metrics such as:
- repository age
- stars per day since creation
- issues-to-stars ratio
- simple momentum summary

#### Why this is valuable
This adds interpretation on top of raw stats, helping users understand what the numbers imply.

#### Product benefits
- more insight without requiring users to calculate mentally
- richer detail modal
- useful bridge toward lightweight analytics
- good complement to rating and future charting

#### Possible variations
- scorecard-style panel
- simple badges
- “momentum” classification labels
- later combine with daily chart view

#### Technical notes / risks
- derived metrics must be explained clearly to avoid false precision
- simple formulas are fine, but labels should avoid sounding overly scientific
- should stay compact and readable inside the modal

#### ROI
**4 / 5**

---

### 10. Collections / shortlists
**Status:** Proposed future feature

#### Summary
Let users classify repositories into lightweight local categories such as:
- Interested
- Reviewing
- Favorite
- Ignore

#### Why this is valuable
This supports triage and curation behavior, making the app more useful over repeated sessions.

#### Product benefits
- simple but sticky workflow enhancement
- pairs well with saved views and comparison
- increases perceived usefulness without needing a backend
- creates a more personal research space

#### Possible variations
- icon-based quick actions in the list
- shortlist drawer
- filter by collection status
- export shortlist later

#### Technical notes / risks
- should stay lightweight and not become a heavy task-management feature
- local persistence rules must be clear
- categorization UI must avoid clutter in list rows

#### ROI
**4 / 5**

## Recommended order of implementation

> Desktop internal scroll container has been implemented and is no longer on this list.

1. Dynamic date-range selector
2. Search-term repository search
3. Topic-based repository search
4. Saved views / watchlists
5. Advanced filters panel
6. Compare repositories
7. Repository trend snapshot
8. Collections / shortlists
9. Daily line graph
10. AI-prompt-assisted search
