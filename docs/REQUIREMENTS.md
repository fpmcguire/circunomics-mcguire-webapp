# REQUIREMENTS.md — Circunomics Web App Challenge

## Purpose
Build an Angular web application that lists the most-starred GitHub repositories created in the last 30 days.

## Source of truth
This document is derived from the original `WebAppChallenge` brief.

---

## Functional requirements

### Core user stories
1. The user can view a list of the most-starred GitHub repositories created in the last 30 days.
2. The user sees the results as a list, with one repository per row.
3. For each repository row, the user can see:
   - repository name
   - repository description
   - number of stars
   - number of open issues
   - owner username
   - owner avatar
4. The user can keep scrolling and additional results appear via pagination.

> **Implementation note — browsing modes:** User story 4 in the original brief implies infinite scroll. The app now supports **both** browsing modes simultaneously:
> - **Paged view** (default) — explicit Previous / Next controls, 10 repos per visible page
> - **Infinite scroll** — auto-loads as you scroll, accumulates the full list
>
> Paged view was introduced as a UX experiment at Step 5.5. Infinite scroll was restored alongside it at Step 8, positioning both as experiment-ready browsing experiences selectable via a UI toggle or `?mode=infinite` / `?mode=paginated` query parameter. The underlying GitHub API is fetched incrementally in both modes — new API pages are loaded only when the user navigates or scrolls beyond what is already cached. See `ROADMAP.md` Steps 5.5 and 8 for full rationale.

### Extra-credit user stories
1. Clicking the repository name opens a modal window.
2. The modal shows the same repository details listed above.
3. Inside the modal only, the user can rate the repository using a 5-star rating control.
4. After closing the modal, the selected rating is visible on the right side of the repository name in the list.

---

## Data source requirements

### GitHub API
The application must fetch data from the GitHub Search Repositories API.

Endpoint pattern:

```text
https://api.github.com/search/repositories?q=created:>[Start_Date]&sort=stars&order=desc
```

Pagination example:

```text
https://api.github.com/search/repositories?q=created:>2017-10-22&sort=stars&order=desc&page=2
```

### Data rules
- `[Start_Date]` must represent 30 days before the current date.
- Results must be sorted by stars in descending order.
- Pagination must load additional pages as the user continues scrolling.

---

## UI requirements

### List view
Each repository row must clearly present:
- owner avatar
- repository name
- repository description
- star count
- open issues count
- owner username

### Modal view (extra credit)
The modal must display the same repository details as the list item and include the 5-star rating interaction.

### Rating display (extra credit)
Once a rating is selected in the modal and the modal is closed, that rating must be shown in the list beside the repository name.

---

## Technology requirement
- The solution must use **Angular**.

---

## Quality and submission expectations
The brief explicitly states that evaluation will prioritize the following, in order:
1. code structure
2. programming best practices
3. legibility
4. number of implemented features / delivery speed

Additional expectations from the brief:
- balance feature delivery with code quality
- provide meaningful git commit history and messages
- run tests and provide the results of the first and last test run
- include project details in `PROJECT.md`, such as:
  - choice of libraries
  - how to run the project

---

## Non-functional interpretation notes
The original brief does not prescribe architecture, styling system, testing framework, or accessibility rules beyond Angular as the required framework. Those decisions are implementation choices, not challenge requirements.

That said, any solution should reasonably aim for:
- maintainable code structure
- readable implementation
- reliable pagination behavior
- clear presentation of repository metadata

---

## Definition of done
A submission meets the challenge brief when:
- it is an Angular app
- it fetches and displays the most-starred GitHub repositories created in the last 30 days
- each row shows all required repository details
- users can browse through all results in either browsing mode: infinite scroll (original brief) or explicit previous/next pagination (Step 5.5 enhancement) — both modes available simultaneously via UI toggle or `?mode=` query parameter
- extra-credit modal and rating behavior work if implemented
- project documentation and test run results are included
