---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Pipeline Plan V01

## 1. Overview

This plan covers the orchestration and pipeline execution layer for NewsNexus12Lite: how article runs are created, how each of the five stages executes, how results are stored and exposed to polling, and how mock versus live AI mode is controlled. Unlike NewsNexus12, which uses separate `worker-node` and `worker-python` queue services, Lite embeds the pipeline directly in the Express backend. This simplifies the demo architecture while faithfully representing the NewsNexus12 processing flow.

## 2. Architecture Decision: Embedded Pipeline

NewsNexus12 uses separate worker services communicating over a queue. For Lite:

- The pipeline runs **in-process** within the Express backend as an async function chain, launched after `POST /api/orchestration/runs` returns HTTP 202.
- There are no separate worker processes, queue brokers, or inter-process communication.
- Results are written directly to the in-memory session object, which the polling endpoints read on every request.

This is appropriate for the demo because concurrent user volume is low, simplicity is a priority, and the polling-based frontend does not require push delivery. If future load requires scale-out, the embedded pipeline can be extracted to a worker without changing the API or frontend contracts.

## 3. Run Lifecycle

When `POST /api/orchestration/runs` is called:

1. Validate that `articleIds` contains 1–10 items (HTTP 400 if exceeded; this is the second enforcement point for the 10-article cap).
2. Create a run object in the session (see §3.1) and write it to `session.activeRunId`.
3. Snapshot the session prompts into `run.promptVersionSnapshot` at this moment (see §7).
4. Return `{ runId, status: "running" }` with HTTP 202 immediately.
5. Launch the pipeline loop asynchronously (`setImmediate` or a detached async IIFE) without blocking the response.

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
  promptVersionSnapshot: PromptConfiguration;  // see §7
}

type StageName = "scraping" | "locationScorer" | "stateAssigner" | "semanticScorer" | "aiApprover";
```

The run object is stored in the session map and read directly by `GET /api/orchestration/runs/:runId` and `GET /api/articles?runId=...` without any database query.

## 4. Stage Sequence

Stages execute in order. Each stage processes all articles before the next stage begins, matching the PRD section 15.1 sequential flow:

```
Scraping → Location Scorer → State Assigner → Semantic Scorer → AI Approver
```

### 4.1 Per-Stage Execution Loop

For each stage, the pipeline runner:

1. Sets `run.currentStage` to the stage name and `run.stageStatuses[stage] = "running"`.
2. Iterates through `articleIds` in order. For each article:
   a. If the article's prior required stage status is `failed`, set this stage's status to `skipped` for that article and continue.
   b. Set `session.articles[id].pipeline[stage].status = "running"`.
   c. Call the stage function (mock or live) and await the result.
   d. Write the result to `session.articles[id].pipeline[stage]` atomically.
   e. Update `run.articleProgress[id]` with the updated stage count.
3. After all articles complete the stage, set `run.stageStatuses[stage] = "complete"` (or `"failed"` if all articles failed the stage).
4. Advance to the next stage.

All writes to the session object are synchronous assignments. Because Node.js is single-threaded and the poll endpoints are called in the same event loop, there is no partial-read race condition. The poll endpoints always see a consistent session snapshot.

## 5. Stage Implementations

Each stage is a pure async function:

```typescript
async function runStageName(
  article: Article,
  prompts: PromptConfiguration,
  mode: "mock" | "live"
): Promise<StageResult>
```

### 5.1 Scraping

Fetches the full article content from `article.url` using `axios`. Extracts the body text (primary paragraph content) for downstream stages. Returns `{ status, scrapingSource, body, scrapedAt }`.

In mock mode: returns the fixture `description` as the body without making an HTTP request.

Failure condition: network timeout or non-200 response from the article URL marks this article as `failed` for scraping. Downstream stages are skipped for that article.

### 5.2 Location Scorer

Scores whether the article contains usable geographic location evidence on a 0–1 scale. Returns `{ status, locationScore, confidence, reasoning, promptInput, promptOutput }`.

In live mode: calls the AI model with an internal system prompt (not user-editable; part of the Lite codebase). The prompt instructs the model to score location specificity and return a structured JSON result.

In mock mode: returns a deterministic score from a preset fixture table keyed by article index position (see §6.2).

### 5.3 State Assigner

Assigns the most likely U.S. state from article evidence using the **session prompt** (`run.promptVersionSnapshot.stateAssigner.assignmentPrompt`). Returns `{ status, assignedState, confidence, reasoning, promptInput, promptOutput }`.

This is one of the two user-editable prompt stages. The prompt used is always the snapshot captured at run start (see §7), not the live session value.

In mock mode: returns a fixture state from the article fixture table.

### 5.4 Semantic Scorer

Scores the semantic relevance of the article to the demo subject domain. Returns `{ status, semanticScore, confidence, reasoning, promptInput, promptOutput }`.

In live mode: uses an internal system prompt (not user-editable). The model returns a structured JSON relevance score.

In mock mode: returns a deterministic score from the fixture table.

### 5.5 AI Approver

Executes in two sub-phases using the **session approver prompts** from `run.promptVersionSnapshot.approver`.

**Gateway phase:** Evaluates article relevance with `approver.gatewayPrompt`. If `gateway.isRelevant = false`, all three hazard prompts are skipped and the article's final status is set to `rejected`. The gateway result is stored as `pipeline.aiApprover.gateway`.

**Hazard phase** (runs only when gateway is relevant): Executes three hazard prompts in parallel:
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

The full AI Approver result is stored in `pipeline.aiApprover` and includes the gateway object, an array of hazard objects, and the `finalStatus` with `finalReasoning`.

## 6. Mock Mode vs Live Mode

### 6.1 Mode Configuration

Controlled by the environment variable `PIPELINE_MODE`. Accepted values: `mock` (default), `live`.

The mode can also be passed as an optional field on `POST /api/orchestration/runs` to allow per-run override (useful for testing and for the future admin toggle described in PRD FE-009). If absent, the server default from `PIPELINE_MODE` is used.

In live mode, an AI model API key must be present in the environment (`AI_API_KEY`). If absent and live mode is requested, the backend returns HTTP 400 with a message that live mode is not configured.

### 6.2 Mock Fixture Table

In mock mode, each stage returns deterministic results from a preset table indexed by article position (0–9). The table is designed to exercise all score states across the article set:

| Article index | Location Score | State | Semantic Score | Gateway Relevant | Final Approval |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.88 | TX | 0.91 | true | approved |
| 1 | 0.42 | null | 0.33 | false | rejected |
| 2 | 0.74 | CA | 0.65 | true | needs_review |
| 3 | 0.95 | FL | 0.88 | true | approved |
| 4 | 0.55 | null | 0.48 | true | rejected |
| 5–9 | Cycles through patterns above | | | | |

Each mock stage adds a configurable artificial delay per article (default: 400–900 ms, randomized per call) to produce realistic animated progress in the UI. The delay is configurable via the `MOCK_STAGE_DELAY_MS` environment variable.

### 6.3 Mock RSS

When `PIPELINE_MODE=mock`, `POST /api/rss/search` returns `article_fixtures` from Postgres instead of hitting Google RSS. This allows the demo to run fully offline with predictable fixture data.

## 7. Prompt Version Snapshot

At run creation, the pipeline captures the full current `session.promptState` into `run.promptVersionSnapshot`. All stage calls that use user-editable prompts (State Assigner, AI Approver gateway and hazards) read from the snapshot, not from the live session.

This resolves PRD OQ-001 in favor of **next-run semantics**: prompt edits made during an active run do not affect stages that have not yet started in the current run. The change applies on the next run start. The explanation endpoint (`GET /api/articles/:id/explanations/:stage`) returns the snapshot's `promptInput` so users can verify exactly which prompt text produced each result.

## 8. 10-Article Cap Enforcement

The cap is enforced at two independent points in the pipeline path:

1. `POST /api/rss/search` (Backend Plan §7.1): slices results to 10 before returning and sets `truncated: true`.
2. `POST /api/orchestration/runs` (this plan §3): validates `articleIds.length <= 10` and returns HTTP 400 if exceeded.

The second check ensures the cap cannot be bypassed by a client that constructs a custom run request.

## 9. Pipeline Error Handling

| Scenario | Behavior |
| --- | --- |
| Scraping fails for one article | Mark article's scraping as `failed`; skip all downstream stages for that article; other articles continue unaffected |
| Scoring stage fails for one article | Mark that article's stage as `failed`; log the error; other articles continue |
| AI Approver gateway call fails | Mark `aiApprover.status = "failed"` for that article; set `finalStatus = "failed"` |
| One hazard call fails after a relevant gateway | Store partial hazard results; set `finalStatus = "needs_review"` or `"failed"` per normalization rules |
| Run cancelled while processing | Set `run.status = "cancelled"` in the session; exit the stage loop after the current article stage completes; discard any further stage results for the old run |
| All articles fail a stage | Advance to the next stage; all articles are skipped at that stage; `run.stageStatuses[stage] = "failed"` |

Failed stage results for a given article do not overwrite previously completed stage results. The `pipeline` object for each article accumulates results as stages complete, and only the current stage's result is ever written or updated per article.

## 10. Real-Time Update Contract

The pipeline writes all results directly to the in-memory session object. The polling endpoints read this object on every GET request. There is no event bus, no server-sent events, and no WebSocket — the frontend polling loop is the sole consumer of pipeline output.

Results are written atomically (a single object assignment per stage per article) to prevent the polling endpoint from reading a partially populated stage result.

After each article stage completes:

- `session.articles[id].pipeline[stage]` is set to the complete stage result.
- `session.articles[id].rowStatus` is updated (e.g., `"processing"` while stages remain, `"complete"` when all stages finish).
- `run.articleProgress[id].completedStages` is incremented.
- `run.stageStatuses[stage]` updates to `"running"` (during) or `"complete"` / `"failed"` (after all articles finish that stage).

The frontend polling loop (Frontend Plan §7) reads `GET /api/orchestration/runs/:runId` for run-level data and `GET /api/articles?runId` for article snapshots every 2 seconds. The frontend does not need to be aware of the embedded pipeline architecture; it only sees the API responses.

## 11. Open Architecture Decisions

| Decision | Recommendation | Needs Confirmation? |
| --- | --- | --- |
| Embedded vs separate workers | Embedded in Express for demo simplicity; extractable later | No |
| Default mode: mock vs live | Mock default (`PIPELINE_MODE=mock`); live opt-in via env var | Confirm with Nick (OQ-009) |
| Prompt edit scope: mid-run vs next-run | Next-run only via snapshot at run start | Confirm with Nick (OQ-001) |
| Hazard prompts sourced from NewsNexus12 | Must verify NewsNexus12 schema; may need to author all three fresh | Yes — blocks copy script finalization (OQ-007) |
| Mock stage delay | 400–900 ms per article per stage; configurable via env var | No |
| Parallel hazard calls in AI Approver | Yes — run three hazard calls concurrently with `Promise.all` | No |
