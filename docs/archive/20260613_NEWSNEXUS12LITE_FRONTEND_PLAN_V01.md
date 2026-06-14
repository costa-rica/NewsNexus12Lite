---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Frontend Plan V01

## 1. Overview

This plan covers the Next.js 16 frontend for NewsNexus12Lite: a no-login, session-driven demo UI with a right sidebar, article table with in-place expanding rows, orchestration control panel, color-coded score bubbles, and session-only prompt editing pages. The frontend polls the Lite backend API to show real-time pipeline progress; it makes no direct calls to the NewsNexus12 system.

## 2. Technology Stack

| Component | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Mirrors NewsNexus12 portal/ conventions |
| UI library | React 19 | |
| State management | Redux Toolkit + Redux Persist | Six slices; key slices persisted to sessionStorage |
| Styling | TailwindCSS 4 | |
| HTTP client | fetch or axios | All calls go to the Lite backend only — no NewsNexus12 calls |

## 3. No-Login Architecture

The frontend has no login page, registration flow, or token management. On first load the app calls `GET /api/demo/session` to retrieve or initialize the server-side session (the backend sets the session ID cookie). All subsequent API calls carry the cookie automatically. The user's entry point is the first-launch modal, never an authentication wall.

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

`<FirstLaunchModal>` renders over the full page when `session.firstLaunchAnswered` is false. A backdrop blocks all interaction with the underlying page until the user responds.

- **Yes, reset demo**: dispatches `POST /api/demo/first-launch { isFirstTime: true }` and then resets the `articles`, `orchestration`, and `prompts.session` Redux slices to their default states. Sets `session.firstLaunchAnswered = true`.
- **No, continue**: dispatches `POST /api/demo/first-launch { isFirstTime: false }` (no data change) and sets `session.firstLaunchAnswered = true`.

The modal text is exactly: "Is this your first time?" with a brief subtitle ("Start with a clean demo, or continue this session."). Technical language is avoided.

### 5.2 RSS Search Form

`<RssSearchForm>` renders a text input for the query string plus optional controls (date range, language, region) when the backend supports them. On submit it dispatches a thunk that calls `POST /api/rss/search`, populates the `articles` slice, and clears the active `orchestration` run. A truncation notice appears when the response carries `truncated: true`. Search errors appear inline without clearing previously loaded articles.

A `[Reset Demo]` button adjacent to the form triggers `POST /api/demo/reset { scope: "all" }` and performs the same client-side state reset as the first-launch Yes path.

### 5.3 Article Table

`<ArticleTable>` renders a table with columns in this order: Title, Source, Description, Location Score, Assigned State, Semantic Score, AI Approval Status. Score and status columns start empty or with a neutral placeholder before orchestration begins.

Each row is a `<ArticleRow>`. Clicking anywhere on the row toggles its expansion via the `ui.expandedRowIds` set. When expanded, an `<ArticleExpandedRow>` renders inline below the row without navigating away. Collapsing a row does not destroy article state — the `articles` slice retains all loaded pipeline data.

Row-level status indicators (pending, processing, complete, skipped, failed) are shown as a small status badge on each row.

### 5.4 Article Expanded Row

`<ArticleExpandedRow>` shows four sections that populate progressively while the pipeline runs:

1. **Metadata**: title, source, description, URL (as an external link), published date, current row status.
2. **Processing timeline**: a horizontal sequence of five stage indicators (Scraping, Location, State, Semantic, AI Approver), each with a status icon (pending, running, complete, failed, skipped).
3. **Score area**: one `<ScoreBubble>` per scored stage. Bubbles begin in a pending state and fill in as each stage completes.
4. **Explanation panel**: appears when a bubble is clicked and shows the reasoning, confidence, prompt input, and prompt output for the selected stage.

The expanded row does not run its own independent poll. It reads from the `articles` slice, which the shared polling loop keeps up to date.

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

Clicking a bubble dispatches `GET /api/articles/{articleId}/explanations/{stage}` and stores the result in `ui.selectedExplanation`. The result renders in the expanded row's explanation panel. Each bubble carries `role="button"`, `aria-label` (e.g., "Location Score 0.88"), and `tabIndex="0"` for keyboard accessibility.

### 5.6 Orchestration Control Panel

`<OrchestrationPanel>` renders alongside the article table and stays visible while the user scrolls through articles. It shows:

- Five stage rows with animated status indicators.
- Overall progress percentage.
- Current stage label.
- `[Start Run]` button (disabled when no articles are loaded or a run is already active).
- `[Stop Run]` button (visible and enabled when a run is active).

On **Start Run** the component dispatches a thunk that calls `POST /api/orchestration/runs` with the current `articles` IDs and the `useSessionPrompts: true` flag. The returned `runId` is stored in the `orchestration` slice and starts the polling loop.

On **Stop Run** the component dispatches `POST /api/demo/reset { scope: "run" }` (or a dedicated cancel endpoint if implemented) and clears the active run state.

### 5.7 AI Approver Prompts Page

`<ApproverPromptsPage>` shows:

- A session status badge: **Default** or **Modified**.
- A `<GatewayPromptEditor>`: a multiline textarea pre-filled with the session gateway prompt.
- An expandable hazard table with three rows: Chemical, Wildfire, Severe Weather. Each row expands to a multiline textarea for that hazard prompt.
- `[Apply to Session]` button: calls `PUT /api/prompts { scope: "approver", prompts: {...} }` and marks the approver prompt group as dirty in the `prompts` slice.
- `[Reset Approver Prompts]` button: calls `POST /api/demo/reset { scope: "approverPrompts" }` and resets only `prompts.session.approver` to the defaults.

### 5.8 AI State Assigner Prompts Page

`<StateAssignerPromptsPage>` shows:

- A session status badge: **Default** or **Modified**.
- A single multiline textarea for the assignment prompt (editable).
- A read-only details panel showing supporting details from the seeded defaults: `promptId`, `outputRules`, version metadata.
- `[Apply to Session]` and `[Reset State Assigner Prompt]` buttons with the same pattern as the Approver page.

## 6. Redux State Slices

| Slice | Key State |
| --- | --- |
| `session` | `sessionId`, `firstLaunchAnswered`, `lastResetAt` |
| `rssSearch` | `query`, loading, error, `lastQuery` |
| `articles` | `items` (Article array), `expandedIds` (ID set), `rowStatuses` |
| `orchestration` | `runId`, `currentStage`, `stageStatuses`, `overallProgress`, `isPolling`, `pollError`, `pollFailureCount` |
| `prompts` | `defaults` (from Postgres via session init), `session` (editable copy), dirty flags by group, validation errors |
| `ui` | `sidebarRoute`, modal open state, `selectedExplanation`, toast/banner messages |

**Redux Persist configuration:** The `session`, `articles`, `orchestration`, and `prompts` slices are persisted to `sessionStorage`. The `ui` slice is excluded from persistence so modal and toast state resets on page refresh. The `rssSearch` slice persists only the `lastQuery` field.

**Session storage on refresh (OQ-004 resolved):** If `sessionStorage` holds prior state, the Redux store hydrates from it and the first-launch modal is skipped (the user sees their prior session). If no prior state exists, the store initializes empty and the modal appears.

## 7. Polling Strategy

A single `orchestrationPollLoop` Redux thunk manages all active polling while a run is in progress.

**Loop behavior while `orchestration.runId` is set and status is not terminal:**

1. Call `GET /api/orchestration/runs/{runId}` every 2 seconds. Update the `orchestration` slice with current stage, stage statuses, and overall progress.
2. Call `GET /api/articles?runId={runId}` every 2 seconds, offset by 1 second relative to the run poll. Update the `articles.items` array with the latest snapshots so table columns and expanded rows reflect new stage completions.
3. For any article whose expanded row is open and whose pipeline status changed since the last poll, dispatch a single `GET /api/articles/{articleId}` to fetch full detail. This is not done on every tick — only when a status change is detected in step 2 — to reduce request volume.

**On terminal run status** (`complete`, `failed`, `cancelled`): stop all polling and set `orchestration.isPolling = false`.

**On polling failure:** increment `pollFailureCount`. After three consecutive failures, display a non-blocking stale-data warning (last-updated timestamp visible in the panel) and switch to exponential backoff up to a 10-second interval. The last known-good article data is never cleared.

**On run cancelled by user:** set `orchestration.runId = null` immediately. The poll loop exits on the next tick. Any in-flight poll responses for the cancelled run are discarded via a run-ID guard in the reducer.

At 2-second polling with two endpoints, steady-state generates approximately 60 requests per 60-second window per user, well within the tier-2 rate limit headroom described in the Backend Plan.

## 8. Reset and State Consistency

| Reset Trigger | Frontend Behavior |
| --- | --- |
| First-launch **Yes** | Clear `articles.items`, clear `orchestration`, reset `prompts.session` to `prompts.defaults`, set `session.firstLaunchAnswered = true` |
| Manual **Reset Demo** | Same as above; leave `session.firstLaunchAnswered = true` |
| Prompt page **Reset [group]** | Reset only `prompts.session.[group]` to defaults; clear that group's dirty flag |
| New RSS search | Replace `articles.items`; clear `orchestration` (run ID, stage statuses, progress) |
| Browser refresh with prior sessionStorage | Hydrate state from sessionStorage; skip first-launch modal |
| Browser refresh without prior sessionStorage | Initialize empty state; show first-launch modal |

A reset during an active run sets `orchestration.runId = null` so the poll loop exits immediately. A run-ID guard in the articles reducer discards any late poll responses for the old run.

## 9. Empty States and Error Handling

| State | UI Behavior |
| --- | --- |
| No articles loaded | Table shows empty state with instruction to run a search. Orchestration Start Run is disabled. |
| Search returned 0 results | Empty state with message; orchestration remains disabled |
| Search truncated to 10 | Inline notice: results were limited to 10 articles |
| Search error | Inline error banner; prior article list preserved if any |
| Failed pipeline stage | Score bubble shows failed state; expanded row shows stage error with a hint that the stage can be retried if supported |
| Rate limit exceeded | Banner message: "Too many requests — please wait N minutes before trying again." Retry-After value from the 429 header |
| Polling stale | Non-blocking warning with last-updated timestamp; no data cleared |
| Prompt page unsaved changes | Indicator showing "Session modified" on the page until Apply is clicked |

## 10. Open Architecture Decisions

| Decision | Recommendation | Needs Confirmation? |
| --- | --- | --- |
| Next.js routing | App Router (Next.js 16 default) | Confirm against NewsNexus12 portal routing style |
| sessionStorage vs localStorage | sessionStorage for session-scoped demo data | No — sessionStorage is correct per PRD A-003 |
| Polling interval | 2s for run and table polls | No; can be env-var configurable for testing |
| Expanded-row individual article poll | Conditional on status change detection, not every tick | No |
