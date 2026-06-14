---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: hermes (gpt-5.5)
modified_by: hermes (gpt-5.5)
---

# NewsNexus12Lite — Frontend TODO V03

Source plan: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_PLAN_V02.md`

---

## Phase 1 — Project Scaffold and Configuration

- [ ] Create the `portal/` directory at the repo root (mirrors NewsNexus12 `portal/` package layout).
- [ ] Initialize a Next.js 16 project in `portal/` using the App Router. Use TypeScript.
- [ ] Confirm the installed versions: Next.js 16, React 19, TailwindCSS 4.
- [ ] Install additional dependencies:
  - `@reduxjs/toolkit`, `react-redux`, `redux-persist`
  - `axios` (or rely on native `fetch`; pick one and document in `portal/README.md`)
- [ ] Install dev dependencies: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- [ ] Configure TailwindCSS 4 per its setup guide. Verify `globals.css` imports TailwindCSS base styles.
- [ ] Configure ESLint with `next/core-web-vitals` and `@typescript-eslint` rules.
- [ ] Add npm scripts: `dev`, `build`, `start`, `test`, `lint`, `type-check` (tsc --noEmit).
- [ ] Create `.env.local.example` documenting required frontend environment variables:
  - `NEXT_PUBLIC_API_BASE_URL` — base URL for the Lite backend (default `http://localhost:4000`).
  - `NEXT_PUBLIC_SNAPSHOT_INTERVAL_MS` — polling interval in ms (default 5000).
- [ ] Add `.env.local` to `.gitignore`.
- [ ] Create the directory structure under `portal/src/`:
  - `app/` — Next.js App Router pages and layouts
  - `components/` — shared UI components
  - `store/` — Redux store, slices, and thunks
  - `hooks/` — custom React hooks
  - `lib/` — API client, constants, utility functions
  - `types/` — shared TypeScript interfaces

### Phase 1 Verification

- [ ] Run `npm run lint` — zero ESLint errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm run build` — Next.js build succeeds.
- [ ] Run `npm test` — test runner exits cleanly (no tests yet; confirm zero failures).

### Phase 1 Commit Guidance

After all Phase 1 verification tasks pass:
- Stage all scaffold files.
- Commit message type: `chore`. Title: `chore: scaffold portal package for newsnexus12lite`. Reference this file and phase in the body.

---

## Phase 2 — Redux Store and State Slices

- [ ] Create `portal/src/store/index.ts`:
  - Configure Redux Toolkit store with all six slices.
  - Configure Redux Persist: persist `session`, `articles`, `orchestration`, `prompts`, and `rssSearch.lastQuery` slices to `sessionStorage`. Exclude the `ui` slice and `rssSearch` loading/error state.
  - Export `store`, `RootState`, and `AppDispatch` types.
- [ ] Create `portal/src/store/sessionSlice.ts`:
  - State: `sessionId: string | null`, `firstLaunchAnswered: boolean`, `lastResetAt: string | null`.
  - Actions: `setSessionId`, `setFirstLaunchAnswered`, `setLastResetAt`.
  - Thunk: `initSession` — calls `GET /api/demo/session`; sets `sessionId` and `firstLaunchAnswered` from the response.
- [ ] Create `portal/src/store/rssSearchSlice.ts`:
  - State: `query: string`, `isLoading: boolean`, `error: string | null`, `lastQuery: string | null`, `truncated: boolean`.
  - Actions: `setQuery`, `clearError`.
  - Thunk: `submitSearch` — calls `POST /api/rss/search`; on success dispatches to `articlesSlice.setArticles` and clears the orchestration slice; on failure sets `error` without clearing articles.
- [ ] Create `portal/src/store/articlesSlice.ts`:
  - State: `items: Article[]`, `expandedIds: string[]` (set of expanded row IDs), `rowStatuses: Record<string, RowStatus>`.
  - Actions: `setArticles`, `updateArticleFromSnapshot`, `toggleExpanded`, `collapseRow`, `clearArticles`.
  - `toggleExpanded` adds or removes an article ID from `expandedIds`.
  - `updateArticleFromSnapshot` merges an `ArticleSnapshot` into the matching item in `items`.
- [ ] Create `portal/src/store/orchestrationSlice.ts`:
  - State: `runId: string | null`, `status: RunStatus | null`, `currentStage: StageName | null`, `stageStatuses: Record<StageName, StageStatus>`, `overallProgress: number`, `isPolling: boolean`, `pollError: string | null`, `pollFailureCount: number`, `cancellationPending: boolean`.
  - Actions: `setRun`, `updateFromSnapshot`, `setPolling`, `setPollError`, `incrementPollFailure`, `resetPollFailure`, `setCancellationPending`, `clearOrchestration`.
  - Thunk: `startRun` — calls `POST /api/orchestration/runs` with current article IDs; on success sets `runId`, sets `isPolling: true`, dispatches `startSnapshotPolling`.
  - Thunk: `cancelRun` — calls `POST /api/orchestration/runs/{runId}/cancel`; on 202 sets `cancellationPending: true` in the slice.
  - Thunk: `startSnapshotPolling` — see Phase 5 for implementation details.
- [ ] Create `portal/src/store/promptsSlice.ts`:
  - State: `defaults: PromptConfiguration | null`, `session: PromptConfiguration | null`, `drafts: PromptConfiguration | null`, `hasUnsavedChanges: { approver: boolean, stateAssigner: boolean }`, `isSessionModified: { approver: boolean, stateAssigner: boolean }`, `validationErrors: Record<string, string>`.
  - Actions: `setDefaults`, `setSessionPrompts`, `setDraftPrompts`, `updateApproverDraft`, `updateStateAssignerDraft`, `markUnsavedChanges`, `markApplied`, `resetPromptGroup`, `resetAllToDefaults`.
  - `hasUnsavedChanges` means local textarea/draft differs from the last applied session prompt. It drives Apply button enablement and unsaved-change warnings.
  - `isSessionModified` means the applied session prompt differs from the durable defaults. It drives the "Default"/"Modified" status badges.
  - `markApplied(scope)` copies the draft into `session`, clears `hasUnsavedChanges[scope]`, and recomputes `isSessionModified[scope]` by comparing the applied session prompt to `defaults`.
  - `resetPromptGroup(group: "approver" | "stateAssigner")` copies `defaults[group]` back into both `session[group]` and `drafts[group]`, clears `hasUnsavedChanges[group]`, and sets `isSessionModified[group] = false`.
  - `resetAllToDefaults()` copies all defaults into `session` and `drafts`, clears all unsaved-change flags, and sets all session-modified flags to false.
  - Thunk: `loadPrompts` — calls `GET /api/prompts`; populates `defaults`, `session`, `drafts`, and `isSessionModified` from backend `isDefault` flags or prompt comparison.
  - Thunk: `applyPrompts(scope)` — calls `PUT /api/prompts`; on success dispatches `markApplied(scope)`.
  - Thunk: `resetPromptsGroup(scope)` — calls `POST /api/demo/reset` with the appropriate scope; then dispatches `resetPromptGroup`.
- [ ] Create `portal/src/store/uiSlice.ts` (not persisted):
  - State: `sidebarRoute: string`, `isFirstLaunchModalOpen: boolean`, `selectedExplanation: ScoreExplanation | null`, `toasts: Toast[]`, `isResponsiveSidebarOpen: boolean`.
  - Actions: `setSidebarRoute`, `openFirstLaunchModal`, `closeFirstLaunchModal`, `setSelectedExplanation`, `clearSelectedExplanation`, `addToast`, `dismissToast`, `toggleResponsiveSidebar`.
- [ ] Create `portal/src/lib/apiClient.ts`:
  - Export typed functions for every backend endpoint:
    - `getSession()`, `postFirstLaunch(isFirstTime: boolean)`, `postReset(scope: ResetScope)`
    - `postRssSearch(params)`, `postOrchestrationRun(params)`, `getRunStatus(runId)`, `getRunSnapshot(runId)`, `postCancelRun(runId)`
    - `getArticle(articleId)`, `getExplanation(articleId, stage)`
    - `getPrompts()`, `putPrompts(scope, prompts)`
  - All functions use `NEXT_PUBLIC_API_BASE_URL` as the base. Credentials (`include`) are set so the session cookie is sent.
  - On HTTP 429: extract `Retry-After` header and include it in the thrown error.
- [ ] Write unit tests for each slice:
  - Confirm initial state shape.
  - Confirm each action mutates the correct field.
  - Confirm reset actions restore to initial state.

### Phase 2 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all slice unit tests must pass.

### Phase 2 Commit Guidance

After all Phase 2 verification tasks pass:
- Stage store files, API client, and slice tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 3 — Root Layout and Right Sidebar

- [ ] Create `portal/src/app/layout.tsx` as the root App Router layout:
  - Wrap the tree with a Redux `<Provider>` and a `<PersistGate>` from `redux-persist`.
  - Render `<main>{children}</main>` for page content.
  - Render `<RightSidebar>` as a fixed or sticky panel to the right of `<main>`.
  - Render `<FirstLaunchModal>` at the root level so it overlays all pages.
  - Render a global toast/banner area (`<ToastArea>`).
  - Set the HTML `<title>` to "NewsNexus Lite".
- [ ] Create `portal/src/components/RightSidebar.tsx`:
  - Renders a vertical nav panel fixed to the right side of the viewport.
  - Contains three `<NavLink>` entries:
    - **Pipeline** → `/`
    - **AI Approver Prompts** → `/prompts/approver`
    - **State Assigner Prompts** → `/prompts/state-assigner`
  - Active link (current route) is visually distinguished.
  - On viewports narrower than `lg` breakpoint, the sidebar collapses to an icon drawer (hamburger/chevron toggle). The toggle dispatches `uiSlice.toggleResponsiveSidebar`.
  - Navigation preserves Redux session state (no full page reload — Next.js client-side navigation).
- [ ] Create `portal/src/components/ToastArea.tsx`:
  - Reads `ui.toasts` from the Redux store and renders each as a dismissible banner.
  - Rate-limit 429 messages use a distinct visual style.
- [ ] Write a component test for `<RightSidebar>`:
  - All three nav links are rendered.
  - The active link for the current route is marked active.
  - Sidebar collapses on narrow viewport (mock the viewport width).

### Phase 3 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm run build` — build succeeds.
- [ ] Run `npm test` — sidebar tests pass.
- [ ] Start the dev server (`npm run dev`) and manually confirm the right sidebar renders on `/`, `/prompts/approver`, and `/prompts/state-assigner`.

### Phase 3 Commit Guidance

After all Phase 3 verification tasks pass:
- Stage layout, sidebar, and toast components.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 4 — First-Launch Modal

- [ ] Create `portal/src/components/FirstLaunchModal.tsx`:
  - Renders only when `session.firstLaunchAnswered === false` (read from Redux).
  - Full-viewport overlay with a backdrop that blocks all pointer interaction (`pointer-events: none` on underlying content, or `aria-modal="true"` on the dialog).
  - Modal heading text exactly: **"Is this your first time?"**
  - Subtitle text exactly: **"Start with a clean demo, or continue this session."**
  - Two action buttons:
    - **Yes, reset demo**: calls `POST /api/demo/first-launch { isFirstTime: true }`, then dispatches `articlesSlice.clearArticles`, `orchestrationSlice.clearOrchestration`, `promptsSlice.resetAllToDefaults`, and `sessionSlice.setFirstLaunchAnswered(true)`. Closes the modal.
    - **No, continue**: calls `POST /api/demo/first-launch { isFirstTime: false }`, then dispatches `sessionSlice.setFirstLaunchAnswered(true)`. Closes the modal. Does not clear any state.
  - Focus is trapped inside the modal while it is open. On close, return focus to the previously focused element.
  - Pressing Escape does **not** dismiss the modal (the user must make a choice).
- [ ] In `portal/src/app/layout.tsx`, add a `useEffect` that dispatches `initSession` on mount:
  - If `session.firstLaunchAnswered` is already `true` (hydrated from sessionStorage), skip the modal.
  - If `session.firstLaunchAnswered` is `false` or the store is empty (fresh page load), show the modal.
- [ ] Write component tests for `<FirstLaunchModal>`:
  - Modal renders when `firstLaunchAnswered` is `false`.
  - Modal does not render when `firstLaunchAnswered` is `true`.
  - Clicking "Yes, reset demo" dispatches the correct actions.
  - Clicking "No, continue" dispatches only `setFirstLaunchAnswered(true)`.
  - Modal blocks keyboard focus from reaching elements behind it.

### Phase 4 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all modal tests pass.
- [ ] Start the dev server. Open the app in a fresh browser tab (no sessionStorage). Confirm the modal appears and blocks interaction.
- [ ] Select "No, continue" and confirm the modal dismisses. Refresh the page in the same browser tab/session and confirm the modal stays dismissed because `firstLaunchAnswered: true` is persisted to `sessionStorage`.
- [ ] Clear `sessionStorage` (or open a fresh browser session) and confirm the modal appears again.

### Phase 4 Commit Guidance

After all Phase 4 verification tasks pass:
- Stage `<FirstLaunchModal>` and related layout changes.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 5 — RSS Search Form

- [ ] Create `portal/src/components/RssSearchForm.tsx`:
  - Renders a text input bound to `rssSearch.query` in the Redux store.
  - Optional controls for language and region (hidden behind a "More options" toggle to keep the default view clean).
  - Submit button: **"Search RSS"**. Disabled while `isLoading` is true.
  - Reset Demo button: **"Reset Demo"**. On click:
    - If a run is active, first call `cancelRun` thunk and wait for it.
    - Then call `POST /api/demo/reset { scope: "all" }`.
    - Dispatch `articlesSlice.clearArticles`, `orchestrationSlice.clearOrchestration`, `promptsSlice.resetAllToDefaults`.
  - On form submit:
    - Dispatch `submitSearch` thunk.
    - On success: articles populate, orchestration is cleared.
    - On failure: show an inline error banner. Do not clear previously loaded articles.
    - When `response.truncated === true`: show an inline notice that results were limited to 10.
- [ ] Write tests for `<RssSearchForm>`:
  - Submit with empty query does not call the API.
  - Successful submit populates the articles slice (mock the thunk).
  - Failed submit sets `rssSearch.error` and does not clear articles.
  - Truncated response shows the truncation notice.
  - "Reset Demo" dispatches the correct actions.

### Phase 5 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all search form tests pass.
- [ ] Start the dev server. Submit a search query. Confirm articles appear in the table (requires backend running in mock mode).

### Phase 5 Commit Guidance

After all Phase 5 verification tasks pass:
- Stage `<RssSearchForm>` and related slice changes.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 6 — Article Table and Row Status

- [ ] Create `portal/src/components/ArticleTable.tsx`:
  - Renders a `<table>` with columns in this order: **Title**, **Source**, **Description**, **Location Score**, **Assigned State**, **Semantic Score**, **AI Approval Status**.
  - Reads `articles.items` from the Redux store.
  - If `articles.items` is empty: renders an empty state message ("Run a search to load articles for processing."). The orchestration Start Run button should be disabled in this state.
  - If `articles.items` has entries: renders one `<ArticleRow>` per article.
  - Applies no column sorting or filtering in V01.
- [ ] Create `portal/src/components/ArticleRow.tsx`:
  - Receives a single `Article` object as a prop.
  - Renders the article's row in the table.
  - Score columns (`Location Score`, `Semantic Score`) render a `<ScoreBubble>` component when a score is available, or a neutral placeholder while pending.
  - `Assigned State` column shows the assigned state abbreviation or a placeholder.
  - `AI Approval Status` column shows a status chip (approved/rejected/needs_review/pending/failed).
  - **Description** cell: renders a small info button `[i]` that reveals the description in a tooltip or inline expansion.
  - Row-level status badge (pending, processing, complete, skipped, failed) is shown on the left edge or as a colored row indicator.
  - Clicking anywhere on the row (except the Description button) dispatches `articlesSlice.toggleExpanded(article.id)`.
  - When the row is expanded, renders `<ArticleExpandedRow>` inline below the row cells (using a `<tr>` with `colspan` spanning all columns).
- [ ] Write tests for `<ArticleTable>`:
  - Empty state renders when `items` is empty.
  - Correct number of rows renders when `items` has articles.
  - Column headers match the required order.
- [ ] Write tests for `<ArticleRow>`:
  - Clicking the row dispatches `toggleExpanded`.
  - Score columns render `<ScoreBubble>` when a score exists.
  - Score columns render a placeholder when the score is pending.

### Phase 6 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all table and row tests pass.
- [ ] Start the dev server. Confirm article rows render after a search and that clicking a row expands it (expanded row content implemented in Phase 7).

### Phase 6 Commit Guidance

After all Phase 6 verification tasks pass:
- Stage table, row components, and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 7 — Expanded Row, Score Bubbles, and Explanation Panel

- [ ] Create `portal/src/components/ArticleExpandedRow.tsx`:
  - Receives the full `Article` object (from `articles.items` by ID).
  - Renders four sections:
    1. **Metadata**: title, source, description, URL (external link, opens in new tab), published date, current row status.
    2. **Processing timeline**: a horizontal row of five stage indicators in order (Scraping, Location, State, Semantic, AI Approver). Each indicator shows: icon for status (pending, running, complete, failed, skipped) and stage label. Running stage shows a subtle pulse animation.
    3. **Score area**: one `<ScoreBubble>` per scored stage (Location Score, Semantic Score, AI Approval). State Assigner shows the assigned state bubble. All bubbles begin in pending state and fill in as scores arrive.
    4. **Explanation panel**: conditionally rendered when `ui.selectedExplanation` is set and matches this article. Shows reasoning, confidence, prompt input, and prompt output. Identifies the stage that produced the result. Clears when the user clicks another bubble or clicks away.
  - The expanded row reads live from `articles.items` (updated by snapshot polling) so scores and statuses appear without needing a re-expand.
  - Collapsing the row (second click on the parent `<ArticleRow>`) does not clear `articles.items` data — only hides the expanded UI.
- [ ] Create `portal/src/components/ScoreBubble.tsx`:
  - Props: `score?: number`, `status: StageStatus`, `stage: StageName`, `articleId: string`.
  - Color mapping:
    - `score >= 0.80` → green
    - `score >= 0.50 && < 0.80` → amber
    - `score < 0.50` → red
    - `status === "pending"` or `status === "running"` → neutral gray, subtle pulse animation
    - `status === "failed"` → red outline with error icon
    - `status === "skipped"` → gray with dash indicator
  - Click handler: calls `GET /api/articles/{articleId}/explanations/{stage}` via the API client; on success dispatches `uiSlice.setSelectedExplanation` with the returned data.
  - Accessibility: `role="button"`, `aria-label` (e.g., `"Location Score 0.88"`), `tabIndex={0}`, keyboard-accessible (Enter and Space trigger the click handler).
- [ ] Write tests for `<ArticleExpandedRow>`:
  - Renders all four sections.
  - Processing timeline shows correct status icons for each stage status.
  - Score area renders `<ScoreBubble>` for each stage.
  - Explanation panel renders when `ui.selectedExplanation` matches this article and stage.
- [ ] Write tests for `<ScoreBubble>`:
  - Green class when score >= 0.80.
  - Amber class when 0.50 <= score < 0.80.
  - Red class when score < 0.50.
  - Pulse animation class when status is pending or running.
  - Failed state renders error icon.
  - Skipped state renders dash indicator.
  - Click triggers API call and dispatches `setSelectedExplanation`.
  - Keyboard Enter triggers the same action as a click.

### Phase 7 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all expanded row and bubble tests pass.
- [ ] Start the dev server with mock backend. Run a search and start a pipeline run. Confirm score bubbles fill in as stages complete and that clicking a bubble shows the explanation panel.

### Phase 7 Commit Guidance

After all Phase 7 verification tasks pass:
- Stage expanded row, score bubble, and explanation panel components.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 8 — Orchestration Control Panel

- [ ] Create `portal/src/components/OrchestrationPanel.tsx`:
  - Positioned alongside the article table (sticky/fixed so it remains visible while scrolling).
  - **Stage list**: five rows in order (Scraping, Location Scorer, State Assigner, Semantic Scorer, AI Approver). Each row shows the stage number, name, and animated status indicator (pending, running, complete, failed, skipped). The running stage pulses.
  - **Overall progress**: percentage bar and numeric label (e.g., "42%").
  - **Current stage label** (e.g., "Current: Semantic Scorer").
  - **Start Run button**:
    - Disabled when: no articles are loaded, or a run is currently active.
    - On click: dispatches `orchestrationSlice.startRun` thunk with `articles.items.map(a => a.id)`.
  - **Stop Run button**:
    - Visible and enabled only when `orchestration.runId` is set and `orchestration.status === "running"`.
    - On click: dispatches `orchestrationSlice.cancelRun` thunk.
    - After cancel, shows a "Cancelling…" indicator until the snapshot confirms `status: "cancelled"`. At that point, show "Cancelled".
  - When `cancellationPending` is `true` in the orchestration slice, the Stop Run button text changes to "Cancelling…" and is disabled.
- [ ] Write tests for `<OrchestrationPanel>`:
  - Start Run is disabled when `articles.items` is empty.
  - Start Run is disabled when a run is active.
  - Stop Run is not visible when no run is active.
  - Stop Run is visible and enabled when run status is "running".
  - Stop Run changes to "Cancelling…" and is disabled when `cancellationPending` is true.
  - Stage indicators reflect the correct status from `orchestration.stageStatuses`.

### Phase 8 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all orchestration panel tests pass.
- [ ] Start the dev server with mock backend. Start a run and confirm:
  - Stage indicators animate through each stage.
  - Overall progress updates.
  - Stop Run stops the run and the panel shows the cancelled state.

### Phase 8 Commit Guidance

After all Phase 8 verification tasks pass:
- Stage `<OrchestrationPanel>` and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 9 — Snapshot Polling Strategy

- [ ] Implement the `startSnapshotPolling` thunk in `orchestrationSlice.ts`:
  - Uses a `setInterval`-like loop (or a recursive `setTimeout`) to call `GET /api/orchestration/runs/{runId}/snapshot` every `NEXT_PUBLIC_SNAPSHOT_INTERVAL_MS` ms (default 5000 ms).
  - On each successful snapshot response:
    - Dispatch `orchestrationSlice.updateFromSnapshot` with the `run` portion.
    - Dispatch `articlesSlice.updateArticleFromSnapshot` for each article in the `articles` portion.
    - Dispatch `orchestrationSlice.resetPollFailure`.
    - If `run.status` is `"complete"`, `"failed"`, or `"cancelled"`: stop the polling loop and dispatch `orchestrationSlice.setPolling(false)`.
  - On polling failure:
    - Dispatch `orchestrationSlice.incrementPollFailure` and `orchestrationSlice.setPollError(message)`.
    - Do **not** clear any existing article data.
    - After three consecutive failures: dispatch a toast via `uiSlice.addToast` with a stale-data warning (include a "last updated" timestamp). Switch to exponential backoff: start at 10s, cap at 30s.
  - Duplicate poll guard: check `orchestration.isPolling` before starting a new loop. If already polling, do not start another loop.
  - Stop conditions: run reaches terminal status, user initiates reset or new search, cancel is confirmed.
- [ ] In the `submitSearch` thunk: before dispatching the new search, if a run is active, dispatch `cancelRun` and wait for confirmation before proceeding.
- [ ] In the "Reset Demo" handler: before clearing state, dispatch `cancelRun` if a run is active; then cancel the polling loop by dispatching `setPolling(false)`.
- [ ] Add a run-ID guard in `startSnapshotPolling` before dispatching article updates:
  - Compare the top-level `snapshot.run.runId` from `GET /api/orchestration/runs/{runId}/snapshot` against the current `orchestration.runId`.
  - If the top-level `snapshot.run.runId` is stale or does not match the current Redux run ID, discard the entire snapshot and do not dispatch `orchestrationSlice.updateFromSnapshot` or `articlesSlice.updateArticleFromSnapshot`.
  - Do **not** require or add an embedded article-level `runId`; the vetted backend contract keeps `runId` on the top-level `run` object, while each `ArticleSnapshot` contains only article and pipeline fields.
- [ ] Write tests for the polling logic:
  - Polling starts when `startRun` succeeds.
  - Polling stops when snapshot returns `status: "cancelled"`.
  - Three consecutive poll failures trigger the stale-data toast.
  - A second call to `startSnapshotPolling` while polling is active does not start a second loop.
  - Snapshot whose top-level `snapshot.run.runId` does not match the current `orchestration.runId` is discarded before article updates are dispatched.
  - On rate-limit 429 from the snapshot endpoint, the toast with the `Retry-After` message is dispatched.

### Phase 9 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all polling tests pass.
- [ ] Start the dev server with mock backend. Run a pipeline and observe:
  - Article table updates without page reload.
  - After run completes, polling stops (no further network requests to the snapshot endpoint).
  - Stopping a run mid-run stops polling after the next snapshot confirms "cancelled".

### Phase 9 Commit Guidance

After all Phase 9 verification tasks pass:
- Stage polling implementation and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 10 — AI Approver Prompts Page

- [ ] Create `portal/src/app/prompts/approver/page.tsx`:
  - Uses Next.js App Router file-based routing. Route: `/prompts/approver`.
  - On mount: dispatches `promptsSlice.loadPrompts` thunk if `prompts.session` is null.
- [ ] Create `portal/src/components/ApproverPromptsPage.tsx` (the page's primary component):
  - **Session status badge**: "Default" (green) or "Modified" (amber) based on `prompts.isSessionModified.approver`, not `hasUnsavedChanges`.
  - **Gateway Prompt editor**:
    - Label: "Gateway Prompt".
    - A multiline `<textarea>` pre-filled with `prompts.session.approver.gatewayPrompt`.
    - On change: updates local component state or `prompts.drafts`, and sets `hasUnsavedChanges.approver = true`; it must not update the applied `prompts.session` values until Apply succeeds.
  - **Hazard-Specific Prompts** expandable table with exactly three rows: **Chemical**, **Wildfire**, **Severe Weather**.
    - Each row shows the hazard name and an expand/collapse toggle.
    - When expanded, the row reveals a multiline `<textarea>` for that hazard's prompt text.
    - Local state tracks which rows are expanded.
  - **Action buttons**:
    - `[Apply to Session]`: calls `PUT /api/prompts { scope: "approver", prompts: { gateway, hazards } }`. On success, dispatches `promptsSlice.markApplied("approver")`, which clears unsaved changes and recomputes the session "Modified" badge from applied session prompts versus defaults.
    - `[Reset Approver Prompts]`: calls `POST /api/demo/reset { scope: "approverPrompts" }`. On success, dispatches `promptsSlice.resetPromptGroup("approver")`. Resets the local textarea content to match the default.
  - Prompt editors must support multiline text and preserve newlines during the session.
  - When the session prompt differs from the default, the page shows a "Session modified" indicator on the affected editor.
- [ ] Write tests for `<ApproverPromptsPage>`:
  - Renders the gateway prompt textarea with the current session value.
  - Renders three hazard rows.
  - Expanding a hazard row reveals the hazard prompt textarea.
  - "Apply to Session" calls `PUT /api/prompts` with the correct scope and payload.
  - "Reset Approver Prompts" calls the reset API and resets the local textarea content.
  - Session status badge remains tied to applied session state: after editing but before Apply, unsaved-change indicator appears; after Apply, badge shows "Modified" if the applied value differs from defaults.

### Phase 10 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all approver prompts page tests pass.
- [ ] Start the dev server. Navigate to `/prompts/approver` via the sidebar. Confirm:
  - Gateway prompt textarea is populated.
  - Each hazard row expands to reveal its prompt.
  - Editing before Apply shows an unsaved-change indicator; clicking "Apply to Session" changes the session status badge to "Modified" when the applied value differs from defaults.
  - "Reset Approver Prompts" restores the default and clears the "Modified" badge.

### Phase 10 Commit Guidance

After all Phase 10 verification tasks pass:
- Stage the AI Approver prompts page component and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 11 — AI State Assigner Prompts Page

- [ ] Create `portal/src/app/prompts/state-assigner/page.tsx`:
  - Route: `/prompts/state-assigner`.
  - On mount: dispatches `promptsSlice.loadPrompts` if prompts are not yet loaded.
- [ ] Create `portal/src/components/StateAssignerPromptsPage.tsx`:
  - **Session status badge**: "Default" or "Modified" based on `prompts.isSessionModified.stateAssigner`, not `hasUnsavedChanges`.
  - **State Assignment Prompt** (single editable field):
    - Label: "State Assignment Prompt".
    - Multiline `<textarea>` pre-filled with `prompts.session.stateAssigner.assignmentPrompt`.
    - On change: updates local component state or `prompts.drafts`, and sets `hasUnsavedChanges.stateAssigner = true`; it must not update applied `prompts.session` values until Apply succeeds.
  - **Supporting Details** panel (read-only, sourced from `prompts.defaults.stateAssigner.supportingDetails`):
    - Shows `promptId`, `outputRules`, and version metadata.
    - Clearly labeled as "Read-only — sourced from NewsNexus12 defaults".
  - **Action buttons**:
    - `[Apply to Session]`: calls `PUT /api/prompts { scope: "stateAssigner", prompts: { assignmentPrompt } }`. On success dispatches `promptsSlice.markApplied("stateAssigner")`, which clears unsaved changes and recomputes session-modified/default state.
    - `[Reset State Assigner Prompt]`: calls `POST /api/demo/reset { scope: "stateAssignerPrompts" }`. On success dispatches `promptsSlice.resetPromptGroup("stateAssigner")`. Resets local textarea to default.
  - Prompt editor must support multiline text and preserve formatting during the session.
- [ ] Write tests for `<StateAssignerPromptsPage>`:
  - Renders the single assignment prompt textarea.
  - Supporting details panel shows read-only metadata.
  - "Apply to Session" calls `PUT /api/prompts` with `scope: "stateAssigner"`.
  - "Reset State Assigner Prompt" restores the default.
  - Session status badge remains tied to applied session state: after editing but before Apply, unsaved-change indicator appears; after Apply, badge shows "Modified" if the applied value differs from defaults.

### Phase 11 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all state assigner prompts page tests pass.
- [ ] Start the dev server. Navigate to `/prompts/state-assigner`. Confirm:
  - Single textarea is populated with the session prompt.
  - Supporting details panel is read-only.
  - Edit, apply, and reset behave correctly.

### Phase 11 Commit Guidance

After all Phase 11 verification tasks pass:
- Stage the State Assigner prompts page component and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 12 — Empty States, Error Handling, and Rate Limit Messaging

- [ ] Confirm `<ArticleTable>` empty state is implemented (done in Phase 6):
  - "Run a search to load articles for processing." message renders when `articles.items` is empty.
  - "Start Run" is disabled.
- [ ] Add empty state when `articles.items` is empty after a search that returned zero results:
  - Message: "No articles found for this query." Orchestration remains disabled.
- [ ] Add error state for RSS search failure (done in `<RssSearchForm>` Phase 5):
  - Inline error banner appears; previous articles remain visible.
- [ ] Implement global 429 rate-limit error handling in `apiClient.ts`:
  - When any API call returns HTTP 429: extract the `Retry-After` header value.
  - Dispatch `uiSlice.addToast` with message: **"Too many requests — please wait before trying again."** Include the retry-after duration if available.
  - Do not clear any existing UI state on 429.
- [ ] Add handling for polling stale-data warnings (done in Phase 9):
  - After three consecutive poll failures: show a non-blocking warning in the orchestration panel with a "last updated" timestamp.
  - The warning includes a "Retry" or "Refresh" action that re-triggers the snapshot fetch.
- [ ] Implement the reset-during-active-run flow (EC-011):
  - If the user clicks "Reset Demo" while a run is active: first call `cancelRun`, then clear state. Discard any late snapshot responses from the old run (run-ID guard in `articlesSlice`).
- [ ] Implement prompt-edit-during-active-run notice (EC-010):
  - On the prompt edit pages, if `orchestration.status === "running"`, display an inline notice: "Prompt edits will take effect when the next stage begins."
- [ ] Write integration-style tests for error flows:
  - 429 response dispatches the correct toast.
  - Empty search result renders the "No articles found" state.
  - Failed search renders the inline error and retains previous articles.
  - Reset during active run calls cancel before clearing state.

### Phase 12 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run type-check` — zero TypeScript errors.
- [ ] Run `npm test` — all error and empty-state tests pass.
- [ ] Run `npm run build` — full production build succeeds with zero errors and zero type errors.
- [ ] Start the dev server. Manually exercise:
  - Empty state before any search.
  - 0-result search.
  - Reset during an active mock run.
  - Prompt edit while a run is active (confirm the notice appears).

### Phase 12 Commit Guidance

After all Phase 12 verification tasks pass:
- Stage error handling, empty state, and rate-limit messaging changes.
- Commit message type: `feat`. Reference this file and phase.
