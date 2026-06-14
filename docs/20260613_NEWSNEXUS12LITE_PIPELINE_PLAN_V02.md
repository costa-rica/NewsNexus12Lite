---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Pipeline Plan V02

## 1. Overview

This plan covers the orchestration and pipeline execution layer for NewsNexus12Lite: how article runs are created, how each of the five stages executes, how results are stored and exposed to polling, how cancellation is handled, and how mock versus live AI mode is controlled. Unlike NewsNexus12, which uses separate `worker-node` and `worker-python` queue services, Lite embeds the pipeline directly in the Express backend. This simplifies the demo architecture while faithfully representing the NewsNexus12 processing flow.

## 2. Architecture Decision: Embedded Pipeline

NewsNexus12 uses separate worker services communicating over a queue. For Lite:

- The pipeline runs **in-process** within the Express backend as an async function chain, launched after `POST /api/orchestration/runs` returns HTTP 202.
- There are no separate worker processes, queue brokers, or inter-process communication.
- Results are written directly to the in-memory session object, which the snapshot endpoint reads on every request.

This is appropriate for the demo because concurrent user volume is low, simplicity is a priority, and polling is the sole delivery mechanism. If future load requires scale-out, the embedded pipeline can be extracted to a worker without changing the API or frontend contracts.

## 3. Run Lifecycle

When `POST /api/orchestration/runs` is called:

1. Validate that `articleIds` contains 1–10 items (HTTP 400 if exceeded).
2. Create a run object in the session (see §3.1) and write it to `session.activeRunId`.
3. Return `{ runId, status: "running" }` with HTTP 202 immediately.
4. Launch the pipeline loop asynchronously (`setImmediate` or a detached async IIFE) without blocking the response.

Note: there is no global prompt snapshot at run creation. Stages that use user-editable prompts capture the current session prompt state at the moment the stage begins (see §7).

### 3.1 Run Object Schema

```typescript
interface PipelineRun {
  runId: string;
  status: "running" | "complete" | "failed" | "cancelled";
  currentStage: StageName | null;
  stageStatuses: Record<StageName, "pending" | "running" | "complete" | "failed" | "skipped">;
  articleProgress: Record<string, ArticleRunStatus>;
  startedAt: string;           // ISO timestamp
  completedAt?: string;
  cancelledAt?: string;
  cancellationRequested: boolean;  // set by cancel endpoint; checked between stages
}

type StageName = "scraping" | "locationScorer" | "stateAssigner" | "semanticScorer" | "aiApprover";
```

The run object is stored in the session map and read directly by `GET /api/orchestration/runs/:runId/snapshot` without any database query.

## 4. Stage Sequence

Stages execute in order. Each stage processes all articles before the next stage begins, matching PRD section 15.1:

```
Scraping → Location Scorer → State Assigner → Semantic Scorer → AI Approver
```

### 4.1 Per-Stage Execution Loop

For each stage, the pipeline runner:

1. **Checks for cancellation** (see §9): if `run.cancellationRequested` is true, the pipeline sets `run.status = "cancelled"`, records `run.cancelledAt`, and exits without advancing to this stage.
2. Sets `run.currentStage` to the stage name and `run.stageStatuses[stage] = "running"`.
3. For stages that use user-editable prompts (State Assigner, AI Approver), snapshots the current session prompt values into a local variable at this moment (see §7).
4. Iterates through `articleIds` in order. For each article:
   a. If the article's prior required stage status is `failed`, set this stage's status to `skipped` for that article and continue.
   b. Set `session.articles[id].pipeline[stage].status = "running"`.
   c. Call the stage function (mock or live) and await the result.
   d. Write the result to `session.articles[id].pipeline[stage]` atomically.
   e. Update `run.articleProgress[id]` with the updated stage count.
5. After all articles complete the stage, set `run.stageStatuses[stage] = "complete"` (or `"failed"` if all articles failed).
6. **Check for cancellation again** before advancing to the next stage.
7. Advance to the next stage.

All writes to the session object are synchronous assignments. Because Node.js is single-threaded, the poll endpoint always sees a consistent session snapshot.

## 5. Stage Implementations

Each stage is a pure async function:

```typescript
async function runStageName(
  article: Article,
  prompts: PromptConfiguration | null,  // null for non-editable stages
  mode: "mock" | "live"
): Promise<StageResult>
```

Stages that do not use user-editable prompts (Scraping, Location Scorer, Semantic Scorer) receive `null` for the prompts parameter. Stages that use editable prompts receive the per-stage snapshot captured at stage start (see §7).

### 5.1 Scraping

Fetches the full article content from `article.url` using `axios`. Extracts the body text for downstream stages. Returns `{ status, scrapingSource, body, scrapedAt }`.

In mock mode: returns the fixture `description` as the body without making an HTTP request.

Failure condition: network timeout or non-200 response marks the article as `failed` for scraping. Downstream stages are skipped for that article.

### 5.2 Location Scorer

Scores whether the article contains usable geographic location evidence on a 0–1 scale. Returns `{ status, locationScore, confidence, reasoning, promptInput, promptOutput }`.

In live mode: calls the AI model with an internal system prompt (not user-editable; part of the Lite codebase). In mock mode: returns a deterministic score from the fixture table (§6.2).

### 5.3 State Assigner

Assigns the most likely U.S. state from article evidence using the **current session prompt** captured at the start of the State Assigner stage (see §7). Returns `{ status, assignedState, confidence, reasoning, promptInput, promptOutput }`.

`promptInput` in the result includes the exact prompt text used, enabling the explanation endpoint to show which prompt produced this result.

In mock mode: returns a fixture state from the article fixture table.

### 5.4 Semantic Scorer

Scores the semantic relevance of the article to the demo subject domain. Returns `{ status, semanticScore, confidence, reasoning, promptInput, promptOutput }`.

In live mode: uses an internal system prompt (not user-editable). In mock mode: returns a deterministic score from the fixture table.

### 5.5 AI Approver

Executes in two sub-phases using the **current session approver prompts** captured at the start of the AI Approver stage (see §7).

**Gateway phase:** Evaluates article relevance with `approver.gatewayPrompt`. If `gateway.isRelevant = false`, all three hazard prompts are skipped and the article's final status is set to `rejected`. The gateway result is stored as `pipeline.aiApprover.gateway`.

**Hazard phase** (runs only when gateway is relevant): Executes three hazard prompts in parallel using `Promise.all`:
- Chemical: `approver.hazardPrompts.chemical`
- Wildfire: `approver.hazardPrompts.wildfire`
- Severe Weather: `approver.hazardPrompts.severeWeather`

Each hazard call returns `{ hazardType, status, score, confidence, reasoning, promptOutput }`.

**Final status normalization** (per PRD section 15.3):

| Condition | Final Status |
| --- | --- |
| Gateway not relevant | `rejected` |
| Gateway relevant + at least one hazard score >= 0.80 | `approved` |
| Gateway relevant + hazard scores ambiguous or low confidence | `needs_review` |
| Gateway relevant + no hazard matched | `rejected` |
| Required AI call failed | `failed` |

The full AI Approver result is stored in `pipeline.aiApprover` and includes the gateway object, an array of hazard objects, `finalStatus`, and `finalReasoning`.

## 6. Mock Mode vs Live Mode

### 6.1 Mode Configuration

Controlled by the environment variable `PIPELINE_MODE`. Accepted values: `mock` (default), `live`.

The mode can be passed as an optional field on `POST /api/orchestration/runs` to allow per-run override (useful for testing and the future admin toggle in PRD FE-009). If absent, the server default from `PIPELINE_MODE` is used.

In live mode, an AI model API key must be present in the environment (`AI_API_KEY`). If absent and live mode is requested, the backend returns HTTP 400.

### 6.2 Mock Fixture Table

In mock mode, each stage returns deterministic results indexed by article position (0–9):

| Article index | Location Score | State | Semantic Score | Gateway Relevant | Final Approval |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.88 | TX | 0.91 | true | approved |
| 1 | 0.42 | null | 0.33 | false | rejected |
| 2 | 0.74 | CA | 0.65 | true | needs_review |
| 3 | 0.95 | FL | 0.88 | true | approved |
| 4 | 0.55 | null | 0.48 | true | rejected |
| 5–9 | Cycles through patterns above | | | | |

Each mock stage adds a configurable artificial delay per article (default: 400–900 ms, randomized per call). Configurable via `MOCK_STAGE_DELAY_MS`.

### 6.3 Mock RSS

When `PIPELINE_MODE=mock`, `POST /api/rss/search` returns `article_fixtures` from Postgres instead of hitting Google RSS, enabling a fully offline demo.

## 7. Per-Stage Prompt Capture

The pipeline does not snapshot prompts globally at run creation. Instead, each stage that uses user-editable prompts captures the current session prompt values at the moment that stage begins. This implements PRD FR-086: "Pipeline runs must use the current session prompt values at the time a stage begins."

Stages subject to per-stage capture:
- **State Assigner** (§5.3): reads `session.promptState.stateAssigner.assignmentPrompt` at State Assigner stage start.
- **AI Approver** (§5.5): reads `session.promptState.approver.*` at AI Approver stage start.

Stages not subject to this rule (Scraping, Location Scorer, Semantic Scorer) use internal, non-user-editable prompts embedded in the Lite codebase.

**Explainability:** The prompt text used by each stage is included in the stage result's `promptInput` field. The explanation endpoint (`GET /api/articles/:id/explanations/:stage`) returns this stored `promptInput` so users can verify exactly which prompt text produced each score.

**Prompt edits during a run (EC-010):** If the user edits the State Assigner or AI Approver prompt while a run is active, the new prompt values will be read when those stages begin. If the stage has already started, the edit takes effect on the next run. The frontend may note "prompt edits apply when the next stage begins."

**OQ-001 resolution:** This plan adopts stage-start semantics, matching FR-086 directly. The V01 run-start snapshot approach is not used in V02.

## 8. 10-Article Cap Enforcement

The cap is enforced at two independent points:

1. `POST /api/rss/search` (Backend Plan V02 §7.3): slices results to 10 before returning and sets `truncated: true`.
2. `POST /api/orchestration/runs` (this plan §3): validates `articleIds.length <= 10` and returns HTTP 400 if exceeded.

## 9. Stop/Cancel Contract

### 9.1 Cancellation API

The cancel endpoint (`POST /api/orchestration/runs/:runId/cancel`, defined in Backend Plan V02 §7.2) sets `run.cancellationRequested = true` on the in-memory run object and returns immediately with the current status. It does not block for the pipeline to finish.

### 9.2 Pipeline Cancellation Check Points

The pipeline loop checks `run.cancellationRequested` at two points:

1. **Before each stage begins** (step 1 of §4.1): if the flag is set, the pipeline sets `run.status = "cancelled"`, records `run.cancelledAt`, and exits without processing any more stages.
2. **After each stage completes** (step 6 of §4.1): same check before advancing to the next stage.

The cancellation check runs between stages, not between individual article iterations within a stage. This ensures that stage results for all articles in the current stage are written before the run stops, avoiding partial stage state within a stage boundary.

### 9.3 How a Run Reaches `cancelled` State

1. User clicks Stop Run in the frontend.
2. Frontend calls `POST /api/orchestration/runs/{runId}/cancel`.
3. Backend sets `run.cancellationRequested = true` and returns immediately.
4. The currently executing stage finishes all its article iterations normally.
5. At the next stage boundary check, the pipeline detects the flag, sets `run.status = "cancelled"` and `run.cancelledAt`, and exits the loop.
6. The snapshot endpoint begins returning `status: "cancelled"`.
7. The frontend's next snapshot poll receives the cancelled status and stops the polling loop.
8. Article data retains whatever was successfully completed before cancellation.

### 9.4 Snapshot Visibility

The snapshot endpoint (`GET /api/orchestration/runs/:runId/snapshot`) reflects cancellation state as soon as `run.status` is set to `"cancelled"` in the session object. Because the pipeline loop and the HTTP request handler share the same Node.js event loop, there is no asynchronous delay: the snapshot will show `"cancelled"` on the first poll tick after the pipeline sets the flag.

## 10. Pipeline Error Handling

| Scenario | Behavior |
| --- | --- |
| Scraping fails for one article | Mark article's scraping as `failed`; skip all downstream stages for that article; other articles continue |
| Scoring stage fails for one article | Mark that article's stage as `failed`; log the error; other articles continue |
| AI Approver gateway call fails | Mark `aiApprover.status = "failed"` for that article; set `finalStatus = "failed"` |
| One hazard call fails after a relevant gateway | Store partial hazard results; set `finalStatus = "needs_review"` or `"failed"` per normalization rules |
| Run cancelled while processing | Set `run.status = "cancelled"` at next stage boundary; stop the loop; retain completed article results |
| All articles fail a stage | Advance to the next stage; all articles are skipped at that stage; `run.stageStatuses[stage] = "failed"` |

Failed stage results for an article do not overwrite previously completed stage results. The `pipeline` object for each article accumulates results as stages complete.

## 11. Real-Time Update Contract

The pipeline writes all results directly to the in-memory session object. The snapshot endpoint reads this object on every GET request. There is no event bus, no server-sent events, and no WebSocket.

Results are written atomically (a single object assignment per stage per article) to prevent the snapshot endpoint from reading a partially populated stage result.

After each article stage completes:

- `session.articles[id].pipeline[stage]` is set to the complete stage result.
- `session.articles[id].rowStatus` is updated (`"processing"` while stages remain, `"complete"` when all stages finish).
- `run.articleProgress[id].completedStages` is incremented.
- `run.stageStatuses[stage]` updates to `"running"` (during) or `"complete"` / `"failed"` (after all articles finish that stage).

The frontend snapshot polling loop (Frontend Plan V02 §7.1) reads `GET /api/orchestration/runs/:runId/snapshot` every 5 seconds. The snapshot includes both run state and article snapshots, so the frontend does not need a separate article-list poll. The frontend does not need to be aware of the embedded pipeline architecture; it only sees the API responses.

## 12. Open Architecture Decisions

| Decision | Recommendation | Needs Confirmation? |
| --- | --- | --- |
| Embedded vs separate workers | Embedded in Express for demo simplicity; extractable later | No |
| Default mode: mock vs live | Mock default (`PIPELINE_MODE=mock`); live opt-in via env var | Confirm with Nick (OQ-009) |
| Prompt capture timing | Stage-start capture per FR-086 | No — adopted in V02 |
| Cancellation granularity | Between stages (not between article iterations); avoids partial stage writes | No |
| Hazard prompts sourced from NewsNexus12 | Must verify NewsNexus12 schema; may need to author all three fresh | Yes — blocks copy script finalization (OQ-007) |
| Mock stage delay | 400–900 ms per article per stage; configurable via env var | No |
| Parallel hazard calls in AI Approver | Yes — run three hazard calls concurrently with `Promise.all` | No |
