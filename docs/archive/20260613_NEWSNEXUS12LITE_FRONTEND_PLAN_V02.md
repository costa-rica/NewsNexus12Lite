---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Frontend Plan V02

## 1. Overview

This plan covers the Next.js 16 frontend for NewsNexus12Lite: a no-login, session-driven demo UI with a right sidebar, article table with in-place expanding rows, orchestration control panel, color-coded score bubbles, and session-only prompt editing pages. The frontend polls the Lite backend API to show progressive pipeline progress using a single consolidated snapshot endpoint. It makes no direct calls to the NewsNexus12 system.

## 2. Technology Stack

| Component | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Mirrors NewsNexus12 portal/ conventions |
| UI library | React 19 | |
| State management | Redux Toolkit + Redux Persist | Six slices; key slices persisted to sessionStorage |
| Styling | TailwindCSS 4 | |
| HTTP client | fetch or axios | All calls go to the Lite backend only — no NewsNexus12 calls |

## 3. No-Login Architecture

The frontend has no login page, registration flow, or token management. On first load the app calls `GET /api/demo/session` to retrieve or initialize the server-side session; the backend sets the session ID cookie. All subsequent API calls carry the cookie automatically. The user's entry point is the first-launch modal, never an authentication wall.

## 4. Application Structure

### 4.1 Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Main Pipeline Page | RSS search form, article table, orchestration panel, right sidebar |
| `/prompts/approver` | AI Approver Prompts | Gateway prompt editor and expandable hazard table |
| `/prompts/state-assigner` | AI State Assigner Prompts | Single editable prompt plus read-only supporting details |

### 4.2 Root Layout

A shared root layout wraps all pages and renders the right sidebar navigation as a fixed or sticky panel alongside the main content area. On narrower viewports the sidebar collapses to an icon drawer. The layout also renders the `<FirstLaunchModal>` when applicable and a global toast/banner area.

```
<RootLayout>
  <main>{page}</main>
  <RightSidebar>
    <NavLink href="/">Pipeline</NavLink>
    <NavLink href="/prompts/approver">AI Approver Prompts</NavLink>
    <NavLink href="/prompts/state-assigner">State Assigner Prompts</NavLink>
  </RightSidebar>
</RootLayout>
```

Navigation between pages does not clear session state; Redux Persist keeps the active session in `sessionStorage` across client-side route transitions.

## 5. Key Components

### 5.1 First-Launch Modal

`<FirstLaunchModal>` renders over the full page when `session.firstLaunchAnswered` is false. A backdrop blocks all interaction until the user responds.

- **Yes, reset demo**: dispatches `POST /api/demo/first-launch { isFirstTime: true }` and then resets the `articles`, `orchestration`, and `prompts.session` Redux slices to their default states. Sets `session.firstLaunchAnswered = true`.
- **No, continue**: dispatches `POST /api/demo/first-launch { isFirstTime: false }` (no data change) and sets `session.firstLaunchAnswered = true`.

The modal text is exactly: "Is this your first time?" with a brief subtitle ("Start with a clean demo, or continue this session.").

### 5.2 RSS Search Form

`<RssSearchForm>` renders a text input for the query string plus optional controls (date range, language, region). On submit it dispatches a thunk that calls `POST /api/rss/search`, populates the `articles` slice, and clears the active `orchestration` run. A truncation notice appears when the response carries `truncated: true`. Search errors appear inline without clearing previously loaded articles.

A `[Reset Demo]` button triggers `POST /api/demo/reset { scope: "all" }` and performs the same client-side state reset as the first-launch Yes path.

### 5.3 Article Table

`<ArticleTable>` renders a table with columns in this order: Title, Source, Description, Location Score, Assigned State, Semantic Score, AI Approval Status. Score and status columns start empty or with a neutral placeholder before orchestration begins.

Each row is an `<ArticleRow>`. Clicking anywhere on the row toggles expansion via `ui.expandedRowIds`. When expanded, an `<ArticleExpandedRow>` renders inline below the row. Collapsing a row does not destroy article state — the `articles` slice retains all loaded pipeline data.

Row-level status badges (pending, processing, complete, skipped, failed) are shown on each row.

### 5.4 Article Expanded Row

`<ArticleExpandedRow>` shows four sections that populate progressively while the pipeline runs:

1. **Metadata**: title, source, description, URL (as an external link), published date, current row status.
2. **Processing timeline**: a horizontal sequence of five stage indicators (Scraping, Location, State, Semantic, AI Approver), each with a status icon (pending, running, complete, failed, skipped).
3. **Score area**: one `<ScoreBubble>` per scored stage. Bubbles begin in a pending state and fill in as each stage completes.
4. **Explanation panel**: appears when a bubble is clicked; shows reasoning, confidence, prompt input, and prompt output for the selected stage.

The expanded row reads from the `articles` slice, which the shared polling loop keeps up to date via snapshot data. When a bubble is clicked, the frontend fetches `GET /api/articles/{articleId}/explanations/{stage}` — this is a user-action fetch, not a poll, and counts against the global API budget only when the user explicitly interacts.

### 5.5 Score Bubbles

`<ScoreBubble>` renders a color-coded clickable chip.

| Value | Color |
| --- | --- |
| `>= 0.80` | Green |
| `0.50–0.79` | Amber |
| `< 0.50` | Red |
| `pending` / `running` | Neutral gray with subtle pulse animation |
| `failed` | Red outline with error icon |
| `skipped` | Gray with dash indicator |

Clicking a bubble dispatches `GET /api/articles/{articleId}/explanations/{stage}` and stores the result in `ui.selectedExplanation`. Each bubble carries `role="button"`, `aria-label` (e.g., "Location Score 0.88"), and `tabIndex="0"` for keyboard accessibility.

### 5.6 Orchestration Control Panel

`<OrchestrationPanel>` renders alongside the article table and stays visible while the user scrolls.

- Five stage rows with animated status indicators.
- Overall progress percentage.
- Current stage label.
- `[Start Run]` button (disabled when no articles are loaded or a run is active).
- `[Stop Run]` button (visible and enabled when a run is active).

On **Start Run**: dispatches a thunk that calls `POST /api/orchestration/runs` with the current article IDs. The returned `runId` is stored in the `orchestration` slice and starts the snapshot polling loop.

On **Stop Run**: dispatches a thunk that calls `POST /api/orchestration/runs/{runId}/cancel`. On a successful response, the orchestration slice is updated to reflect a pending cancellation. The polling loop continues until the snapshot response confirms `status: "cancelled"`, at which point polling stops and the UI reflects the cancelled state. Any snapshot responses carrying the old `runId` after a cancel confirmation are discarded via a run-ID guard in the reducer.

### 5.7 AI Approver Prompts Page

`<ApproverPromptsPage>` shows:

- A session status badge: **Default** or **Modified**.
- A `<GatewayPromptEditor>`: a multiline textarea pre-filled with the session gateway prompt.
- An expandable hazard table with three rows: Chemical, Wildfire, Severe Weather. Each row expands to a multiline textarea for that hazard prompt.
- `[Apply to Session]`: calls `PUT /api/prompts { scope: "approver", prompts: {...} }` and marks the approver prompt group as dirty.
- `[Reset Approver Prompts]`: calls `POST /api/demo/reset { scope: "approverPrompts" }` and resets only `prompts.session.approver` to defaults.

### 5.8 AI State Assigner Prompts Page

`<StateAssignerPromptsPage>` shows:

- A session status badge: **Default** or **Modified**.
- A single multiline textarea for the assignment prompt (editable).
- A read-only details panel showing `promptId`, `outputRules`, and version metadata from the seeded defaults.
- `[Apply to Session]` and `[Reset State Assigner Prompt]` buttons with the same pattern as the Approver page.

## 6. Redux State Slices

| Slice | Key State |
| --- | --- |
| `session` | `sessionId`, `firstLaunchAnswered`, `lastResetAt` |
| `rssSearch` | `query`, loading, error, `lastQuery` |
| `articles` | `items` (Article array), `expandedIds` (ID set), `rowStatuses` |
| `orchestration` | `runId`, `currentStage`, `stageStatuses`, `overallProgress`, `isPolling`, `pollError`, `pollFailureCount`, `cancellationPending` |
| `prompts` | `defaults` (from Postgres via session init), `session` (editable copy), dirty flags by group, validation errors |
| `ui` | `sidebarRoute`, modal open state, `selectedExplanation`, toast/banner messages |

**Redux Persist configuration:** The `session`, `articles`, `orchestration`, and `prompts` slices are persisted to `sessionStorage`. The `ui` slice is excluded. The `rssSearch` slice persists only `lastQuery`.

**Session storage on refresh (OQ-004 resolved):** If `sessionStorage` holds prior state, the Redux store hydrates from it and the first-launch modal is skipped. If no prior state exists, the store initializes empty and the modal appears.

## 7. Polling Strategy

The global API cap is **200 requests per hour and 1,000 requests per day per IP** (global — all endpoints count). The polling design must fit within this budget across a full demo session.

### 7.1 Single Consolidated Snapshot Poll

During an active run, the frontend polls only `GET /api/orchestration/runs/{runId}/snapshot` — a single endpoint that returns both run status (stage statuses, current stage, overall progress) and full article data (pipeline stage statuses and scores). This consolidates what would otherwise be two separate 2-second polling calls from V01 into one call at a longer interval, reducing request volume by approximately 80% compared to the V01 approach.

There is no separate article-list polling loop. The snapshot response provides all data needed for the article table and expanded row to update progressively.

### 7.2 Polling Interval and Backoff

**Default interval**: 5 seconds. A snapshot every 5 seconds during a 5-minute run costs 60 requests. Combined with non-poll actions for one complete demo flow, the expected total is 70–80 requests — well within the hourly budget.

**On polling failure:** increment `pollFailureCount`. After three consecutive failures, display a non-blocking stale-data warning (last-updated timestamp in the panel) and switch to exponential backoff starting at 10 seconds and capping at 30 seconds. The last known-good data is never cleared.

**Stop conditions:**
- Run status reaches `complete`, `failed`, or `cancelled` in a snapshot response.
- User initiates a reset or new search.
- An active run cancel is confirmed by the snapshot.

**Duplicate poll guard:** A polling flag in the `orchestration` slice prevents two concurrent snapshot loops for the same run.

### 7.3 User-Action Fetches (not polled)

The following requests are triggered by user actions, not the polling loop, and count against the global budget only when the user explicitly interacts:

- `GET /api/articles/{articleId}` — fetched when a user expands a row and needs detail not already in the snapshot.
- `GET /api/articles/{articleId}/explanations/{stage}` — fetched on bubble click.
- `GET /api/prompts` — fetched on prompt page load.

### 7.4 Budget Summary for Normal Demo Use

| Action | Estimated Requests |
| --- | --- |
| Session init + first-launch answer | 2 |
| RSS search | 1 |
| Start run | 1 |
| Snapshot polls (5-min run at 5s interval) | ~60 |
| Expanded-row article fetches (a few rows) | 3–5 |
| Explanation fetches (a few bubble clicks) | 3–5 |
| Prompt edit + apply | 2 |
| Reset (optional) | 1 |
| **Total per run flow** | **~73–77** |

This leaves roughly 120–130 requests unused in the hour for retries, additional runs, or browsing prompt pages.

## 8. Reset and State Consistency

| Reset Trigger | Frontend Behavior |
| --- | --- |
| First-launch **Yes** | Clear `articles.items`, clear `orchestration`, reset `prompts.session` to `prompts.defaults`, set `session.firstLaunchAnswered = true` |
| Manual **Reset Demo** | Same as above; leave `session.firstLaunchAnswered = true` |
| Prompt page **Reset [group]** | Reset only `prompts.session.[group]` to defaults; clear that group's dirty flag |
| New RSS search | Replace `articles.items`; clear `orchestration` (run ID, stage statuses, progress) |
| Browser refresh with prior sessionStorage | Hydrate state from sessionStorage; skip first-launch modal |
| Browser refresh without prior sessionStorage | Initialize empty state; show first-launch modal |

A reset during an active run first calls `POST /api/orchestration/runs/{runId}/cancel` (if a run is active) before clearing client state. The run-ID guard in the articles reducer discards any late snapshot responses for the old run after the reset.

## 9. Empty States and Error Handling

| State | UI Behavior |
| --- | --- |
| No articles loaded | Table shows empty state with instruction to run a search. Orchestration Start Run is disabled. |
| Search returned 0 results | Empty state with message; orchestration remains disabled |
| Search truncated to 10 | Inline notice: results were limited to 10 articles |
| Search error | Inline error banner; prior article list preserved if any |
| Failed pipeline stage | Score bubble shows failed state; expanded row shows stage error |
| Run cancelled by user | Orchestration panel shows cancelled state; articles retain their last populated values |
| Rate limit exceeded | Banner message: "Too many requests — please wait before trying again." Retry-After value from the 429 header |
| Polling stale | Non-blocking warning with last-updated timestamp; no data cleared |
| Prompt page unsaved changes | Indicator showing "Session modified" on the page until Apply is clicked |

## 10. Open Architecture Decisions

| Decision | Recommendation | Needs Confirmation? |
| --- | --- | --- |
| Next.js routing | App Router (Next.js 16 default) | Confirm against NewsNexus12 portal routing style |
| sessionStorage vs localStorage | sessionStorage for session-scoped demo data | No — sessionStorage is correct per PRD A-003 |
| Polling interval | 5 seconds for snapshot poll | No; configurable via env var for testing |
| Expanded-row detail fetch | On row expand if not already in snapshot; user-action only | No |
