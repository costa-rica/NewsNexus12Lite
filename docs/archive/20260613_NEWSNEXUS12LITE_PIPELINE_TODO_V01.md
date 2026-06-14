---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Pipeline TODO V01

Source plan: `docs/20260613_NEWSNEXUS12LITE_PIPELINE_PLAN_V02.md`

---

## Phase 1 — Pipeline Types and Run Object

- [ ] Create `api/src/types/pipeline.ts` (or extend `api/src/types/index.ts`):
  - Define `StageName` type alias: `"scraping" | "locationScorer" | "stateAssigner" | "semanticScorer" | "aiApprover"`.
  - Define `StageStatus` type alias: `"pending" | "running" | "complete" | "failed" | "skipped"`.
  - Define `RunStatus` type alias: `"running" | "complete" | "failed" | "cancelled"`.
  - Define `ArticleRunStatus` interface: `{ completedStages: number; totalStages: number; status: StageStatus }`.
  - Define `PipelineRun` interface:
    ```typescript
    interface PipelineRun {
      runId: string;
      status: RunStatus;
      currentStage: StageName | null;
      stageStatuses: Record<StageName, StageStatus>;
      articleProgress: Record<string, ArticleRunStatus>;
      startedAt: string;
      completedAt?: string;
      cancelledAt?: string;
      cancellationRequested: boolean;
    }
    ```
  - Define `StageResult` base interface and per-stage result interfaces:
    - `ScrapingResult`: `{ status, scrapingSource?, body?, scrapedAt? }`
    - `LocationScorerResult`: `{ status, locationScore?, confidence?, reasoning?, promptInput?, promptOutput? }`
    - `StateAssignerResult`: `{ status, assignedState?, confidence?, reasoning?, promptInput?, promptOutput? }`
    - `SemanticScorerResult`: `{ status, semanticScore?, confidence?, reasoning?, promptInput?, promptOutput? }`
    - `AiApproverResult`: `{ status, gateway?, hazards?, finalStatus?, finalReasoning? }`
  - Define `GatewayResult`, `HazardResult`, and `FinalApprovalStatus` types.
  - Define `ArticleSnapshot` interface (the shape returned in the snapshot endpoint): `{ id, title, source, rowStatus, pipeline: Record<StageName, { status, score?, assignedState?, confidence? }> }`.
- [ ] Create `api/src/services/runStore.ts` (if not already created in Backend TODO Phase 7):
  - Module-level `Map<string, PipelineRun>` named `runStore`.
  - `createRun(runId: string, articleIds: string[]): PipelineRun` — initializes a `PipelineRun` with all `stageStatuses` set to `"pending"`, all `articleProgress` initialized, `cancellationRequested: false`.
  - `getRun(runId: string): PipelineRun | undefined`.
- [ ] Write unit tests in `api/src/services/__tests__/runStore.test.ts`:
  - `createRun` initializes a valid `PipelineRun` with correct defaults.
  - `getRun` returns `undefined` for an unknown ID.
  - `getRun` returns the correct run after `createRun`.

### Phase 1 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — run store tests pass.

### Phase 1 Commit Guidance

After all Phase 1 verification tasks pass:
- Stage pipeline types and run store files.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 2 — Pipeline Runner and Stage Loop

- [ ] Create `api/src/services/pipelineRunner.ts`:
  - Export `runPipeline(run: PipelineRun, session: SessionObject, mode: "mock" | "live"): Promise<void>`.
  - This is the async function launched by `POST /api/orchestration/runs` after it returns HTTP 202.
  - Implement the stage sequence loop in order: `scraping → locationScorer → stateAssigner → semanticScorer → aiApprover`.
- [ ] Implement the per-stage execution loop inside `runPipeline` for each stage:
  1. **Cancellation check (before stage)**: if `run.cancellationRequested` is `true`, set `run.status = "cancelled"`, set `run.cancelledAt = new Date().toISOString()`, and return (exit the loop). Do not advance to this stage.
  2. Set `run.currentStage = stageName` and `run.stageStatuses[stageName] = "running"`.
  3. For stages that use user-editable prompts (**State Assigner** and **AI Approver**): read the current session prompt state at this moment and store in a local `const stagePrompts` variable (see Phase 4 for per-stage prompt capture).
  4. Iterate through all article IDs in order. For each article:
     a. If the article's preceding required stage has `status === "failed"`: set this stage's status to `"skipped"` for this article. Skip the stage function call. Continue to the next article.
     b. Set `session.articles[id].pipeline[stageName].status = "running"`.
     c. Call the stage function (see Phase 3 for implementations) and await the result.
     d. Write the result to `session.articles[id].pipeline[stageName]` as a **single atomic assignment** (assign the entire stage result object at once).
     e. Update `session.articles[id].rowStatus` to reflect overall article progress.
     f. Increment `run.articleProgress[id].completedStages`.
  5. After all articles complete the stage: set `run.stageStatuses[stageName]` to `"complete"` if any article succeeded, or `"failed"` if all articles failed for this stage.
  6. **Cancellation check (after stage)**: same check as step 1. If `cancellationRequested` is true, set cancelled state and return.
  7. Advance to the next stage.
- [ ] After all five stages complete (or after a failure exits the loop):
  - If no cancellation: set `run.status = "complete"` and `run.completedAt = new Date().toISOString()`.
  - Update `session.activeRunId` if appropriate.
- [ ] Write unit tests for `pipelineRunner.ts`:
  - The loop executes all five stages in order when no cancellation is set.
  - Cancellation before Stage 2 exits without running Stage 2–5.
  - Cancellation after Stage 3 exits without running Stage 4–5.
  - A stage failure for one article does not halt other articles at that stage.
  - A failed article's downstream stages are set to `"skipped"`.
  - `run.status` is `"complete"` after all stages finish without cancellation.
  - `run.status` is `"cancelled"` when `cancellationRequested` is set.
  - Stage result writes are atomic (the complete stage result object is assigned at once, not field by field).

**Architecture note:** All writes to `session` and `run` are synchronous JavaScript object assignments. Because Node.js is single-threaded, the snapshot endpoint never reads a partially-written stage result — it will see either the old value or the new complete value.

### Phase 2 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all pipeline runner tests pass.

### Phase 2 Commit Guidance

After all Phase 2 verification tasks pass:
- Stage `pipelineRunner.ts` and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 3 — Stage Implementations

Create `api/src/services/stages/` directory with one file per stage.

### 3.1 Scraping Stage

- [ ] Create `api/src/services/stages/scraping.ts`:
  - Export `runScraping(article: Article, prompts: null, mode: "mock" | "live"): Promise<ScrapingResult>`.
  - **Live mode**: fetch full article content from `article.url` using `axios` with a 10-second timeout. Extract meaningful body text (strip HTML tags). Return `{ status: "complete", scrapingSource: article.url, body: extractedText, scrapedAt: new Date().toISOString() }`.
  - **Mock mode**: return `{ status: "complete", scrapingSource: "fixture", body: article.description, scrapedAt: new Date().toISOString() }` without making an HTTP request.
  - **Failure condition**: network timeout, non-200 response, or empty body → return `{ status: "failed", error: "Scraping failed: <message>" }`. This causes all downstream stages to be skipped for this article.

### 3.2 Location Scorer Stage

- [ ] Create `api/src/services/stages/locationScorer.ts`:
  - Export `runLocationScorer(article: Article, prompts: null, mode: "mock" | "live"): Promise<LocationScorerResult>`.
  - **Live mode**: call the AI model API with an internal system prompt (not user-editable, embedded in the Lite codebase as a constant). Normalize the response to `{ status, locationScore, confidence, reasoning, promptInput, promptOutput }`.
  - **Mock mode**: return a deterministic result indexed by article position in the session (see Phase 6 fixture table).
  - Add the configurable artificial delay per article in mock mode (see Phase 6).

### 3.3 State Assigner Stage

- [ ] Create `api/src/services/stages/stateAssigner.ts`:
  - Export `runStateAssigner(article: Article, prompts: StateAssignerPrompts, mode: "mock" | "live"): Promise<StateAssignerResult>`.
  - **prompts parameter is required** (non-null): receives the per-stage prompt snapshot captured at State Assigner stage start (see Phase 4).
  - **Live mode**: call the AI model API using `prompts.assignmentPrompt` as the user prompt. Normalize the response to `{ status, assignedState, confidence, reasoning, promptInput, promptOutput }`.
  - `promptInput` in the result must contain the exact prompt text used (i.e., `prompts.assignmentPrompt`), enabling the explanation endpoint to show which prompt produced this result.
  - **Mock mode**: return a fixture state from the mock table (Phase 6). Still populate `promptInput` with the provided prompt text.

### 3.4 Semantic Scorer Stage

- [ ] Create `api/src/services/stages/semanticScorer.ts`:
  - Export `runSemanticScorer(article: Article, prompts: null, mode: "mock" | "live"): Promise<SemanticScorerResult>`.
  - **Live mode**: call the AI model API with an internal system prompt (not user-editable). Normalize response.
  - **Mock mode**: return a deterministic score from the fixture table (Phase 6).

### 3.5 AI Approver Stage

- [ ] Create `api/src/services/stages/aiApprover.ts`:
  - Export `runAiApprover(article: Article, prompts: ApproverPrompts, mode: "mock" | "live"): Promise<AiApproverResult>`.
  - **prompts parameter is required** (non-null): receives the per-stage prompt snapshot captured at AI Approver stage start (see Phase 4).
  - Executes in two sub-phases:
    1. **Gateway phase**: call `prompts.gatewayPrompt` via the AI model (live) or fixture (mock). If `gateway.isRelevant === false`: skip hazard prompts and set `finalStatus = "rejected"`.
    2. **Hazard phase** (only if gateway is relevant): execute the three hazard prompts concurrently using `Promise.all`:
       - Chemical: `prompts.hazardPrompts.chemical`
       - Wildfire: `prompts.hazardPrompts.wildfire`
       - Severe Weather: `prompts.hazardPrompts.severeWeather`
    3. **Normalization** (see table below). Assign `finalStatus` and `finalReasoning`.
  - Return the full result: `{ status: "complete", gateway, hazards, finalStatus, finalReasoning }`.
  - In mock mode: gateway relevance and hazard results are derived from the fixture table (Phase 6). Still populate `promptInput` fields for each call.
  - **AI Approver normalization rules:**

    | Condition | `finalStatus` |
    | --- | --- |
    | Gateway `isRelevant === false` | `"rejected"` |
    | Gateway relevant + at least one hazard `score >= 0.80` | `"approved"` |
    | Gateway relevant + hazard scores ambiguous or low confidence | `"needs_review"` |
    | Gateway relevant + no hazard matched | `"rejected"` |
    | Required AI call failed (gateway or hazard) | `"failed"` |

- [ ] Write tests for each stage implementation in `api/src/services/stages/__tests__/`:
  - Each stage in mock mode returns the correct fixture value for articles at positions 0–4.
  - Scraping failure sets `status: "failed"`.
  - State Assigner includes `promptInput` equal to the provided prompt text.
  - AI Approver gateway not-relevant path skips hazard calls and sets `finalStatus: "rejected"`.
  - AI Approver gateway relevant path calls all three hazard prompts in parallel.
  - AI Approver normalization correctly assigns each of the four `finalStatus` values.
  - A failed hazard call after a relevant gateway sets `finalStatus: "needs_review"` or `"failed"`.

### Phase 3 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all stage implementation tests pass.

### Phase 3 Commit Guidance

After all Phase 3 verification tasks pass:
- Stage all stage implementation files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 4 — Per-Stage Prompt Capture (FR-086)

This phase ensures the pipeline uses the correct session prompt values **at the time each editable stage begins**, not at run creation time.

- [ ] In `pipelineRunner.ts`, at the start of the **State Assigner** stage (step 3 of Phase 2's per-stage loop):
  - Read `session.promptState.stateAssigner.assignmentPrompt` at that exact moment.
  - Store in a local `const stageAssignerPrompts: StateAssignerPrompts = { assignmentPrompt: session.promptState.stateAssigner.assignmentPrompt }`.
  - Pass `stageAssignerPrompts` to each `runStateAssigner(article, stageAssignerPrompts, mode)` call for all articles in that stage.
  - The snapshot taken here is final for this stage run. If the user edits the prompt after this point, the change takes effect only at the next stage's start (or the next run).
- [ ] In `pipelineRunner.ts`, at the start of the **AI Approver** stage (step 3 of the per-stage loop):
  - Read `session.promptState.approver` (gateway + all three hazard prompts) at that exact moment.
  - Store in a local `const approverPrompts: ApproverPrompts = { ...session.promptState.approver }` (shallow copy to prevent later mutation from affecting this run).
  - Pass `approverPrompts` to each `runAiApprover(article, approverPrompts, mode)` call.
- [ ] Confirm that stages that do **not** use user-editable prompts (Scraping, Location Scorer, Semantic Scorer) pass `null` as the prompts argument. Internal system prompts for those stages are constants in the stage files.
- [ ] Write tests confirming per-stage capture behavior:
  - If the user updates the State Assigner prompt between run start and when the State Assigner stage begins, the stage uses the **updated** value (not the run-start value).
  - If the user updates the AI Approver prompts between run start and when the AI Approver stage begins, the stage uses the **updated** value.
  - Once a stage has snapshotted its prompts (stage start), subsequent prompt edits do not affect that stage's execution for the current run.
  - Non-editable stages receive `null` for prompts and do not access `session.promptState`.

**Implementation note:** This behavior directly implements PRD FR-086: "Pipeline runs must use the current session prompt values at the time a stage begins." The V01 alternative (snapshot at run creation) was explicitly rejected in Pipeline Plan V02 §7.

### Phase 4 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all prompt capture tests pass.

### Phase 4 Commit Guidance

After all Phase 4 verification tasks pass:
- Stage prompt capture implementation and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 5 — 10-Article Cap Enforcement

The 10-article cap is enforced at two independent points. One is in the backend route (Backend TODO Phase 7); this phase ensures the pipeline also enforces it.

- [ ] In `pipelineRunner.ts`, add a guard at the top of `runPipeline`:
  - If `articleIds.length > 10`: throw an error (or log and set `run.status = "failed"` with an error message). This is a defense-in-depth check since the route should have already rejected >10 articles with HTTP 400.
  - Log a warning if this guard is triggered (indicates a route-level bypass).
- [ ] In the `POST /api/orchestration/runs` route handler (Backend TODO Phase 7):
  - Validate `articleIds.length <= 10`. Return HTTP 400 with `{ result: false, error: "Demo is limited to 10 articles. Please submit 10 or fewer article IDs." }` if exceeded.
  - This is the primary enforcement point.
- [ ] Confirm the `POST /api/rss/search` handler (Backend TODO Phase 6) slices the RSS result to 10 before returning and sets `truncated: true` when the raw feed returned more than 10. This is the upstream enforcement point.
- [ ] Write tests confirming the cap:
  - `POST /api/rss/search` with a mocked feed of 15 items returns exactly 10 articles and `truncated: true`.
  - `POST /api/rss/search` with a mocked feed of 8 items returns 8 articles and `truncated: false`.
  - `POST /api/orchestration/runs` with 11 article IDs returns HTTP 400 with the error message.
  - `POST /api/orchestration/runs` with 10 article IDs returns HTTP 202.
  - `runPipeline` guard: if called with >10 articles (should never happen), it sets run status to failed.

### Phase 5 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all cap enforcement tests pass.

### Phase 5 Commit Guidance

After all Phase 5 verification tasks pass:
- Stage cap enforcement additions and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 6 — Mock Mode and Fixture Table

- [ ] Create `api/src/services/mockFixtures.ts`:
  - Export `MOCK_STAGE_RESULTS: MockFixtureRow[]` — an array of 5 entries (indices 0–4) with the fixture table from Pipeline Plan V02 §6.2:

    | Index | Location Score | State | Semantic Score | Gateway Relevant | Final Approval |
    | --- | --- | --- | --- | --- | --- |
    | 0 | 0.88 | TX | 0.91 | true | approved |
    | 1 | 0.42 | null | 0.33 | false | rejected |
    | 2 | 0.74 | CA | 0.65 | true | needs_review |
    | 3 | 0.95 | FL | 0.88 | true | approved |
    | 4 | 0.55 | null | 0.48 | true | rejected |

  - For articles at index 5–9: cycle through patterns 0–4 (i.e., `index % 5`).
  - Export `getMockFixture(articleIndex: number): MockFixtureRow` that applies the cycling logic.
  - Export `getMockDelay(): number` — returns a random delay between `MOCK_STAGE_DELAY_MS_MIN` and `MOCK_STAGE_DELAY_MS_MAX` (both read from environment variables; defaults: min 400, max 900). Used by each stage to simulate processing time.
- [ ] In `pipelineRunner.ts`, thread the `articleIndex` (position in the session article list, 0-based) alongside each article ID when iterating the stage loop. Pass `articleIndex` to mock stage functions so they can look up the correct fixture row.
- [ ] Update each stage function (Phase 3) to accept `articleIndex: number` and call `getMockFixture(articleIndex)` in mock mode.
- [ ] In each mock stage function, call `await new Promise(resolve => setTimeout(resolve, getMockDelay()))` before returning the fixture result to simulate realistic processing time.
- [ ] Implement **mock RSS** in `POST /api/rss/search`:
  - When `PIPELINE_MODE=mock`: return `ArticleFixture` records from Postgres (up to 10, populated by the copy script in Backend TODO Phase 12). If the `article_fixtures` table is empty, return a set of hard-coded fallback fixtures.
- [ ] Write tests for mock fixtures:
  - `getMockFixture(0)` returns location score 0.88, state TX, gateway relevant, final approved.
  - `getMockFixture(1)` returns location score 0.42, state null, gateway not relevant, final rejected.
  - `getMockFixture(5)` returns the same as `getMockFixture(0)` (cycling).
  - `getMockDelay()` returns a value within the configured range.
  - Each stage in mock mode adds a delay before returning (test with a fake timer or by mocking `getMockDelay` to return 0).

### Phase 6 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all mock fixture tests pass.
- [ ] Start the app in mock mode (`PIPELINE_MODE=mock`). Start a pipeline run and confirm: articles progress through stages with visible delays, scores match the fixture table, and the pipeline completes cleanly.

### Phase 6 Commit Guidance

After all Phase 6 verification tasks pass:
- Stage mock fixture file, stage delay logic, and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 7 — Cancellation Boundary Behavior

- [ ] In `pipelineRunner.ts`, confirm the cancellation check is implemented at **both** prescribed points (established in Phase 2; this phase verifies and hardens the behavior):
  - **Before each stage begins** (the first check in the per-stage loop body): if `run.cancellationRequested` is true at this point, the pipeline must not call any stage functions for this stage, must not update `run.currentStage`, and must immediately set `run.status = "cancelled"` and `run.cancelledAt`, then exit.
  - **After all articles complete a stage** (the second check, before advancing): same cancellation behavior.
- [ ] Confirm that the cancellation check does **not** run between individual article iterations within a stage. The stage loop must fully complete all articles before the cancellation check runs post-stage. This ensures no partial stage state (e.g., some articles completed a stage while others haven't been visited yet in that stage).
- [ ] Confirm the cancel endpoint behavior (Backend TODO Phase 8):
  - `POST /api/orchestration/runs/:runId/cancel` sets `run.cancellationRequested = true` and returns HTTP 202 with `{ runId, status: "running", cancellationPending: true }` immediately — it does not wait for the pipeline to stop.
  - After cancellation, `run.status` becomes `"cancelled"` at the next stage boundary in the pipeline loop.
  - Any snapshot polled after `run.status` is `"cancelled"` returns `status: "cancelled"` — this is the frontend's signal to stop polling.
- [ ] Confirm that article data accumulated before cancellation is preserved:
  - Articles that completed stages before cancellation retain their completed stage results.
  - `rowStatus` for those articles remains at their last valid state (not reverted).
  - Stages that never ran (due to cancellation) remain at `"pending"` status.
- [ ] Write tests for cancellation boundary behavior:
  - Cancellation set before Stage 1: pipeline exits without running any stage function. `run.status = "cancelled"`.
  - Cancellation set mid-run (after Stage 2 articles complete): pipeline finishes Stage 2 for all articles, then cancels at the post-Stage-2 boundary. Stage 3, 4, 5 are not called.
  - Articles that completed Stage 2 before cancellation retain Stage 2 results.
  - Articles at Stage 1 (when Stage 2 cancellation fires) retain Stage 1 results; Stage 2 status remains `"pending"`.
  - A second `POST /api/orchestration/runs/:runId/cancel` after the run is cancelled returns HTTP 200 with `status: "cancelled"` (idempotent).
  - Snapshot endpoint reflects `status: "cancelled"` as soon as `run.status` is set in the pipeline loop (same Node.js event loop tick).

### Phase 7 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all cancellation tests pass.
- [ ] Start the app in mock mode. Start a run with mock delays. Click Stop Run in the frontend during Stage 2 and confirm:
  - Stage 2 completes for all articles in progress.
  - Stage 3 does not start.
  - Article scores from completed stages remain visible.
  - The orchestration panel shows "Cancelled" after the next snapshot poll.

### Phase 7 Commit Guidance

After all Phase 7 verification tasks pass:
- Stage cancellation implementation and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 8 — Real-Time Update Contract and Pipeline Error Handling

- [ ] Confirm the real-time update contract in `pipelineRunner.ts` (see Pipeline Plan V02 §11):
  - After each article stage completes, the following writes happen in order (all synchronous):
    1. `session.articles[id].pipeline[stageName]` = complete stage result object (single assignment).
    2. `session.articles[id].rowStatus` = updated status (`"processing"` while more stages remain, `"complete"` when all stages done, `"failed"` if a stage failed and no more stages will run).
    3. `run.articleProgress[id].completedStages` += 1.
    4. `run.stageStatuses[stageName]` = `"running"` (remains running until all articles complete the stage).
  - After all articles complete the stage:
    5. `run.stageStatuses[stageName]` = `"complete"` or `"failed"`.
  - These writes are immediately visible to `GET /api/orchestration/runs/:runId/snapshot` on the next request.
  - There is no event bus, no WebSocket, and no server-sent events. The snapshot endpoint reads the shared in-memory session object directly.
- [ ] Implement pipeline error handling per Pipeline Plan V02 §10:
  - [ ] **Scraping failure for one article**: mark `session.articles[id].pipeline.scraping.status = "failed"`, log the error. Continue iterating the remaining articles. Other articles are unaffected.
  - [ ] **Scoring stage failure for one article**: mark that article's stage as `"failed"`, log the error. Continue to the next article. Other articles continue.
  - [ ] **AI Approver gateway failure**: set `session.articles[id].pipeline.aiApprover.status = "failed"` and `finalStatus = "failed"`. Log the error.
  - [ ] **One hazard call failure after a relevant gateway**: store partial hazard results (the calls that succeeded). Set `finalStatus` to `"needs_review"` or `"failed"` according to the normalization rules. Log the specific hazard failure.
  - [ ] **All articles fail a stage**: advance to the next stage. At the next stage, all articles will be skipped (their preceding required stage failed). Set `run.stageStatuses[stageName] = "failed"` for the stage where all failed.
  - [ ] **Failed stage results do not overwrite prior stage results**: the `pipeline` object accumulates results; a failure at Stage 3 does not clear Stage 1 or Stage 2 data for that article.
  - [ ] **Logging**: each article stage failure must be logged via Winston with: run ID, article ID, stage name, and error message.
- [ ] Write tests for error handling:
  - Scraping failure for article 0 does not affect articles 1–9.
  - Articles 1–9 with successful scraping continue through all stages.
  - Article 0's Location Scorer, State Assigner, Semantic Scorer, and AI Approver stages are all set to `"skipped"`.
  - AI Approver gateway failure sets `finalStatus = "failed"`.
  - One hazard failure after relevant gateway sets `finalStatus = "needs_review"`.
  - Prior stage results (Stage 1 and 2) are not cleared when Stage 3 fails for an article.
  - `run.stageStatuses[stage]` is `"failed"` when all articles fail that stage.
  - Error is logged for each article stage failure.

### Phase 8 Verification

- [ ] Run `npm run lint` — zero errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all real-time update and error handling tests pass.
- [ ] Run `npm run build` — final clean production build.
- [ ] Start the app in mock mode with a fixture that includes a simulated failure (temporarily set one mock result to `status: "failed"` for a stage). Confirm:
  - The failed article row shows the failed state in the UI.
  - Other articles continue processing.
  - Prior stage scores for the failed article remain visible in the expanded row.
  - The orchestration panel completes normally.

### Phase 8 Commit Guidance

After all Phase 8 verification tasks pass:
- Stage real-time update and error handling implementation with tests.
- Commit message type: `feat`. Reference this file and phase.
