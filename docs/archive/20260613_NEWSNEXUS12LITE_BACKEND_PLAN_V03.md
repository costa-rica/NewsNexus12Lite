---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Backend Plan V03

## 1. Overview

This plan covers the standalone Express.js TypeScript API server for NewsNexus12Lite: session management, the PostgreSQL default store, the one-time copy script, a global rate limiter, and all REST endpoints including the stop/cancel contract. The Lite backend is a fully independent process with its own database; it shares no runtime connections to the NewsNexus12 production system. There is no authentication layer of any kind.

V03 corrects two concerns raised in the V02 assessment: the rate limiter terminology and the cancel endpoint response contract.

## 2. Technology Stack

| Component | Technology | Notes |
| --- | --- | --- |
| API server | Express.js 5 (TypeScript) | Mirrors NewsNexus12 api/ package conventions |
| ORM | Sequelize 6 + pg | Standalone Postgres instance, not shared with NewsNexus12 |
| Rate limiting | express-rate-limit 8 | Fixed-window enforcement; see §6 for behavior and rationale |
| Session storage | In-process memory map (server-side) | Keyed by session ID, surfaced to client as an HttpOnly cookie |
| Logging | Winston | Follows project LOGGING_NODE_JS_V08 standards |
| Copy script | Standalone ts-node script | Read-only against NewsNexus12; runs once per seed refresh |

## 3. Isolation Architecture

NewsNexus12Lite runs as a separate server instance with its own Postgres database. The only contact point with the NewsNexus12 ecosystem is the one-time copy script, which opens a read-only connection to the NewsNexus12 database, seeds prompt defaults into the Lite store, and then closes. At runtime the Lite backend has zero connections to the NewsNexus12 database or any of its services. There is no import from the NewsNexus12 `db-models` package at runtime; schema changes in NewsNexus12 cannot affect the Lite demo.

All Sequelize models are defined locally within the Lite `api/` package.

## 4. Database Schema (Postgres Default Store)

The Lite Postgres instance holds durable read-only defaults. The running application never writes to these tables; only the copy script and explicit admin operations do so.

### 4.1 Tables

**`default_prompts`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | |
| `prompt_key` | VARCHAR (unique) | One of: `approver_gateway`, `approver_chemical`, `approver_wildfire`, `approver_severe_weather`, `state_assigner` |
| `prompt_text` | TEXT | |
| `supporting_details` | JSONB | Read-only metadata: prompt ID, version, output rules |
| `source` | VARCHAR | `copied` (from NewsNexus12) or `authored` (fallback default) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**`article_fixtures`** (optional; used in mock pipeline mode)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | |
| `title` | TEXT | |
| `source` | VARCHAR | |
| `description` | TEXT | |
| `url` | VARCHAR | |
| `published_at` | TIMESTAMPTZ | |
| `raw_data` | JSONB | Full fixture payload for the pipeline to reference |
| `created_at` | TIMESTAMPTZ | |

### 4.2 Sequelize Models

One model per table, defined in `api/src/models/`. Model files follow the same naming conventions used in NewsNexus12 (`DefaultPrompt.ts`, `ArticleFixture.ts`) but are not imported from or shared with NewsNexus12.

## 5. Session Management

The backend maintains a lightweight in-memory session map (`Map<sessionId, SessionObject>`). A UUID session ID is generated on the first `GET /api/demo/session` call and returned to the client as an `HttpOnly`, `SameSite=Strict` cookie. All subsequent requests carry the cookie so the backend can look up the correct session.

A session object holds:

```typescript
{
  sessionId: string;
  firstLaunchAnswered: boolean;
  articles: Article[];              // up to 10 session-only article objects
  promptState: PromptConfiguration; // current session copy of prompts
  activeRunId: string | null;
  createdAt: string;
  lastAccessedAt: string;
}
```

Sessions are not persisted to Postgres. On server restart all in-memory sessions are lost and the demo reinitializes cleanly, which is acceptable behavior for a public demo.

## 6. Global Rate Limiting

The global public demo API cap is **200 requests per 60-minute window and 1,000 requests per 24-hour window, per IP**. Both caps apply to all HTTP endpoints without exception. There is no separate higher-limit tier for polling or read-only endpoints.

### 6.1 Fixed-Window Implementation

Both limits are implemented with `express-rate-limit 8` using its default in-memory store. `express-rate-limit` is a **fixed-window** limiter: each IP's counter resets at the top of the next fixed window (e.g., every hour on the clock, not 60 minutes rolling from the first request).

**Fixed-window behavior and accepted trade-off:** A request arriving at the very end of one window and the next arriving at the start of the next window are not counted together, which means a burst of up to 400 requests across a window boundary is theoretically possible. For this demo context this trade-off is acceptable: the demo is a low-volume public tool, not a billing-grade enforcement surface. Fixed-window semantics are well-matched to `express-rate-limit`'s built-in behavior and require no external store.

Two middleware instances are applied globally:

- **Hourly window**: 200 requests per 60-minute fixed window per IP.
- **Daily window**: 1,000 requests per 24-hour fixed window per IP.

Both are applied in series via `app.use(hourlyLimiter, dailyLimiter)`. A request must pass both windows to proceed. When either limit is exceeded the server responds with HTTP 429 and a `Retry-After` header showing the number of seconds until the current window resets.

### 6.2 Budget Guidance for Polling Design

The snapshot endpoint (`GET /api/orchestration/runs/{runId}/snapshot`, §7.1) is designed as the single combined poll target during an active run, consolidating what would otherwise be two separate polling calls. At the recommended 5-second polling interval (see Frontend Plan V02), a 5-minute run costs approximately 60 snapshot requests. Combined with non-poll actions for the same flow, a single run stays within roughly 70–80 requests — comfortably under the hourly window cap for one or two runs per hour.

## 7. API Routes

All routes are mounted under `/api`. Response shape follows the NewsNexus12 convention: `{ result: true, data: {...} }` on success, `{ result: false, error: "..." }` on failure.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/demo/session` | Return or initialize session state, articles, run status, prompt default/modified flags |
| POST | `/api/demo/first-launch` | Accept `{ isFirstTime }` and reset session to defaults when true |
| POST | `/api/demo/reset` | Selective reset by `scope`: `all`, `articles`, `prompts`, `approverPrompts`, `stateAssignerPrompts` |
| POST | `/api/rss/search` | Proxy Google News RSS and return up to 10 articles with a `truncated` flag |
| POST | `/api/orchestration/runs` | Validate articles, create run, start async pipeline, return `runId` (HTTP 202) |
| GET | `/api/orchestration/runs/:runId` | Return current run status, stage statuses, overall progress, article progress counts |
| GET | `/api/orchestration/runs/:runId/snapshot` | Return run status and full article data in a single response (primary poll target) |
| POST | `/api/orchestration/runs/:runId/cancel` | Request cancellation of an active run; see §7.2 for response contract |
| GET | `/api/articles/:articleId` | Return a single article with full pipeline state for the expanded row |
| GET | `/api/articles/:articleId/explanations/:stage` | Return score explanation for a bubble click |
| GET | `/api/prompts` | Return current session prompts with `isDefault` flag per group |
| PUT | `/api/prompts` | Write session-only prompt edits for `approver` or `stateAssigner` scope |

Note: `GET /api/articles?runId={runId}` from V01 is replaced by the snapshot endpoint and is no longer a polling target. The individual article and explanation endpoints remain but are fetched on user action rather than on a polling loop.

### 7.1 Snapshot Endpoint

`GET /api/orchestration/runs/:runId/snapshot` is the consolidated poll endpoint. It returns:

```typescript
{
  run: {
    runId: string;
    status: "running" | "complete" | "failed" | "cancelled";
    cancellationPending: boolean;    // true when cancel requested, pipeline not yet at boundary
    currentStage: StageName | null;
    stageStatuses: Record<StageName, StageStatus>;
    overallProgress: number;         // 0–100
    startedAt: string;
    completedAt?: string;
    cancelledAt?: string;
  };
  articles: ArticleSnapshot[];       // all session articles with pipeline stage statuses and scores
}
```

`cancellationPending` is derived from the internal `run.cancellationRequested` flag: it is `true` after the cancel endpoint fires and `false` once the run reaches `cancelled` status. This field lets the frontend distinguish "cancellation is in flight" from "run is actually done."

An `ArticleSnapshot` includes: `id`, `title`, `source`, `rowStatus`, and per-stage `{ status, score?, assignedState?, confidence? }` for all five stages.

### 7.2 Stop/Cancel API Contract

**Endpoint:** `POST /api/orchestration/runs/:runId/cancel`

The cancel endpoint **acknowledges the cancellation request** without claiming terminal cancelled status. The pipeline reaches `cancelled` asynchronously at the next stage boundary.

**Response when the run is active:**

```typescript
HTTP 202
{
  runId: string;
  status: "running";          // reflects the actual current run status
  cancellationPending: true;  // signals that the request was accepted
}
```

**Response when the run is already in a terminal state** (`complete`, `failed`, `cancelled`): returns the current run status unchanged with HTTP 200. Idempotent — a second cancel on an already-cancelled run returns the existing cancelled state without error.

**Response when the run is not found for the current session:** HTTP 404.

**How a run reaches `cancelled` state:**

1. The cancel endpoint sets `run.cancellationRequested = true` on the in-memory run object and returns HTTP 202 immediately.
2. The pipeline execution loop (Pipeline Plan V02 §3–§4) checks `run.cancellationRequested` after completing each full stage across all articles.
3. When the flag is detected, the pipeline sets `run.status = "cancelled"` and `run.cancelledAt`, stops advancing to further stages, and exits.
4. Any stage currently in progress for individual articles completes normally before the cancellation check runs; this avoids partially-written article stage state.
5. The frontend continues polling. The next snapshot response carrying `status: "cancelled"` is the signal for the frontend to stop polling and reflect the final state.

`cancellationRequested` is an internal run-object field and is not exposed directly in API responses; it is surfaced as the derived `cancellationPending` boolean in the snapshot.

### 7.3 Article Limit Enforcement

`POST /api/rss/search` slices results to 10 before returning and sets `truncated: true` when the source returned more than 10. `POST /api/orchestration/runs` validates that `articleIds.length <= 10` and returns HTTP 400 with a clear error message if exceeded.

### 7.4 No Authentication

There is no JWT middleware, no auth routes, and no user table. All endpoints are public. The session ID cookie provides session continuity only, not access control. The cookie is `HttpOnly` and `SameSite=Strict`.

## 8. RSS Integration

`POST /api/rss/search` proxies the Google News RSS feed server-side. It constructs a query URL from `query`, optional `language`, and optional `region`, fetches the feed with `axios`, parses the XML response with `xml2js`, normalizes entries into the Article shape, and returns the first 10.

In mock pipeline mode (`PIPELINE_MODE=mock`), this endpoint returns `article_fixtures` from Postgres instead of hitting the live RSS feed, enabling a fully offline demo.

## 9. Copy Script

The copy script (`scripts/seed-defaults.ts`) is a standalone ts-node script that is not part of the running application.

**Execution flow:**

1. Open a read-only database connection to NewsNexus12 using credentials from a `.env.seed` file (never committed to the repository).
2. Query NewsNexus12 for: state assigner prompt, AI approver gateway prompt, and the three hazard-specific prompts (chemical, wildfire, severe weather).
3. For each prompt key: if a matching record exists in NewsNexus12, map it to the Lite `default_prompts` schema and set `source = "copied"`. If no record exists, substitute an authored default and set `source = "authored"`.
4. Upsert each record into `default_prompts` on `prompt_key` (insert or update; never duplicate).
5. Log a summary: count of copied records, count of authored fallbacks, and any errors.

The script is idempotent and is the only operation that writes to the Postgres default store. The hazard-prompt structure may not exist in NewsNexus12 (see PRD OQ-007), so those three rows will likely be authored defaults.

**Pre-implementation dependency (OQ-006, OQ-007):** The exact NewsNexus12 source tables and columns must be confirmed by reading the NewsNexus12 schema before the copy script is finalized.

## 10. Error Handling and Logging

All error handling follows `docs/ERROR_REQUIREMENTS.md`. Logging follows `docs/LOGGING_NODE_JS_V08.md`.

| Condition | Response |
| --- | --- |
| RSS fetch failure | HTTP 502; preserve prior session articles; include user-readable error |
| Session cookie missing | Generate a new session; return fresh state with `firstLaunchAnswered: false` |
| Session not found (expired / server restart) | Same as missing cookie |
| Rate limit exceeded | HTTP 429 with `Retry-After` header |
| Run not found | HTTP 404 |
| Cancel on non-existent run | HTTP 404 |
| `articleIds` exceeds 10 | HTTP 400 with message explaining the demo limit |
| Copy script: NewsNexus12 unreachable | Log error; halt script; do not partially seed |

## 11. Open Architecture Decisions

| Decision | Recommendation | Needs Confirmation? |
| --- | --- | --- |
| Session store | In-memory map for v01; Redis path documented for scale | No |
| Rate limit scope | Single global fixed-window limit: 200/hr + 1,000/day on all endpoints | Confirmed by operator |
| Rate limit store | `express-rate-limit` in-memory store; fixed-window semantics accepted for demo | No |
| Standalone Postgres vs reuse db-models | Standalone — required for isolation guarantee | No |
| Copy script NewsNexus12 source tables | Must be discovered by reading NewsNexus12 schema before implementation | Yes — blocks copy script impl |
| Cancel granularity | Between stages (not mid-article); avoids partial stage writes | No |
| Cancel response contract | HTTP 202 + `cancellationPending: true`; terminal `cancelled` delivered via snapshot | No |
