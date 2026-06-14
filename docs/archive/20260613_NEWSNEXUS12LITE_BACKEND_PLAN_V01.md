---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Backend Plan V01

## 1. Overview

This plan covers the standalone Express.js TypeScript API server for NewsNexus12Lite: session management, the PostgreSQL default store, the one-time copy script, rate limiting, and all REST endpoints. The Lite backend is a fully independent process with its own database; it shares no runtime connections to the NewsNexus12 production system.

## 2. Technology Stack

| Component | Technology | Notes |
| --- | --- | --- |
| API server | Express.js 5 (TypeScript) | Mirrors NewsNexus12 api/ package conventions |
| ORM | Sequelize 6 + pg | Standalone Postgres instance, not shared with NewsNexus12 |
| Rate limiting | express-rate-limit 8 | Two windows: per-hour and per-day on write/expensive endpoints |
| Session storage | In-process memory map (server-side) | Keyed by session ID, surfaced to client as a cookie |
| Logging | Winston | Follows project LOGGING_NODE_JS_V08 standards |
| Copy script | Standalone ts-node script | Read-only against NewsNexus12; runs once per seed refresh |

## 3. Isolation Architecture

NewsNexus12Lite runs as a separate server instance with its own Postgres database. The only contact point with the NewsNexus12 ecosystem is the one-time copy script, which opens a read-only connection to the NewsNexus12 database, seeds prompt defaults into the Lite store, and then closes. At runtime the Lite backend has no connection to the NewsNexus12 database or any of its services.

All Sequelize models are defined locally within the Lite `api/` package. The Lite backend does not import from the NewsNexus12 `db-models` package at runtime, ensuring that schema changes in NewsNexus12 cannot affect the Lite demo.

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

The backend maintains a lightweight in-memory session map (`Map<sessionId, SessionObject>`). A UUID session ID is generated on the first `GET /api/demo/session` call and returned to the client as an `HttpOnly` cookie. All subsequent requests carry the cookie so the backend can look up the correct session.

A session object holds:

```typescript
{
  sessionId: string;
  firstLaunchAnswered: boolean;
  articles: Article[];           // up to 10 session-only article objects
  promptState: PromptConfiguration; // current session copy of prompts
  activeRunId: string | null;
  createdAt: string;
  lastAccessedAt: string;
}
```

Sessions are not persisted to Postgres. On server restart all in-memory sessions are lost and the demo reinitializes cleanly, which is acceptable behavior for a public demo. If future deployments require persistence across restarts, a Redis-backed session store can replace the in-memory map without changing the API contract.

## 6. Rate Limiting

Nick's constraint: **200 API calls per hour** and **1,000 API calls per day** per IP.

A key design consideration is that polling endpoints (GET run status, GET articles) fire every 1–2 seconds during an active run, which would consume the hourly budget within minutes if limits applied globally. To preserve a usable demo experience while still capping costly operations, the rate limiter applies two tiers using `express-rate-limit`.

### 6.1 Tier 1 — Write / Expensive Endpoints

These endpoints trigger backend computation, AI model calls, or RSS network requests.

Endpoints covered:
- `POST /api/demo/first-launch`
- `POST /api/demo/reset`
- `POST /api/rss/search`
- `POST /api/orchestration/runs`
- `PUT /api/prompts`

Limits: **200 requests per 60 minutes** per IP (hourly window) **and** **1,000 requests per 24 hours** per IP (daily window). Both windows are implemented as separate `express-rate-limit` middleware instances applied in series; a request must pass both to succeed. When either limit is exceeded the endpoint returns HTTP 429 with a `Retry-After` header.

### 6.2 Tier 2 — Read / Polling Endpoints

These endpoints return cached or in-memory session data and are lightweight.

Endpoints covered:
- `GET /api/demo/session`
- `GET /api/orchestration/runs/:runId`
- `GET /api/articles`
- `GET /api/articles/:articleId`
- `GET /api/articles/:articleId/explanations/:stage`
- `GET /api/prompts`

Limits: **2,000 requests per 15 minutes** per IP. This is generous enough that 1–2 second polling across multiple endpoints cannot realistically exhaust it, while still blocking abusive scripted scrapers.

### 6.3 Decision Point

If Nick intends the 200/hr and 1,000/day limits to apply to all HTTP requests including polling, the polling interval must increase to 5–10 seconds and the tier-2 limits must be tightened accordingly. This trade-off should be confirmed before implementation; the tiered approach above is the recommended default.

## 7. API Routes

All routes are mounted under `/api`. Response shape follows the NewsNexus12 convention: `{ result: true, data: {...} }` on success, `{ result: false, error: "..." }` on failure.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/demo/session` | Return or initialize session state, articles, run status, prompt default/modified flags |
| POST | `/api/demo/first-launch` | Accept `{ isFirstTime }` and reset session to defaults when true |
| POST | `/api/demo/reset` | Selective reset by `scope`: `all`, `articles`, `prompts`, `approverPrompts`, `stateAssignerPrompts` |
| POST | `/api/rss/search` | Proxy Google News RSS and return up to 10 articles with a `truncated` flag |
| POST | `/api/orchestration/runs` | Validate articles, create run, start async pipeline, return `runId` (HTTP 202) |
| GET | `/api/orchestration/runs/:runId` | Poll run status, current stage, stage statuses, overall progress, article progress counts |
| GET | `/api/articles` | Return article snapshots with score values and stage statuses for a run |
| GET | `/api/articles/:articleId` | Return a single article with full pipeline state for the expanded row |
| GET | `/api/articles/:articleId/explanations/:stage` | Return score explanation for a bubble click |
| GET | `/api/prompts` | Return current session prompts with `isDefault` flag per group |
| PUT | `/api/prompts` | Write session-only prompt edits for `approver` or `stateAssigner` scope |

### 7.1 Article Limit Enforcement

`POST /api/rss/search` fetches from the RSS source and slices the result to 10 before returning. The response includes `truncated: true` when the source returned more than 10 results.

`POST /api/orchestration/runs` validates that `articleIds.length <= 10` and returns HTTP 400 with a clear error message if the cap is exceeded. This second check prevents any client that bypasses the search endpoint from starting a run on more than 10 articles.

### 7.2 No Authentication

There is no JWT middleware, no auth routes, and no user table. All endpoints are public. The session ID cookie provides session continuity but confers no access control. The cookie is `HttpOnly` and `SameSite=Strict` to reduce CSRF exposure on the stateless demo.

## 8. RSS Integration

`POST /api/rss/search` proxies the Google News RSS feed server-side to avoid browser CORS restrictions. It constructs a query URL from the `query`, optional `language`, and optional `region` parameters, fetches the feed with `axios`, and parses the XML response with `xml2js`. The parsed entries are normalized into the Article shape (title, source, description, url, publishedAt) and the first 10 are returned.

In mock pipeline mode (see Pipeline Plan), this endpoint can be configured to return `article_fixtures` from Postgres instead of hitting the live RSS feed, enabling a fully offline demo.

## 9. Copy Script

The copy script (`scripts/seed-defaults.ts`) is a standalone ts-node script that is not part of the running application. It is run once per seed refresh by a developer or administrator.

**Execution flow:**

1. Open a read-only database connection to the NewsNexus12 Postgres instance using credentials supplied via a `.env.seed` file (never committed to the repository).
2. Query NewsNexus12 for the following prompt records: state assigner prompt, AI approver gateway prompt, and the three hazard-specific prompts (chemical, wildfire, severe weather).
3. For each prompt key: if a matching record exists in NewsNexus12, map its content to the Lite `default_prompts` schema and set `source = "copied"`. If no matching record exists, substitute an authored default text and set `source = "authored"`.
4. Upsert each record into the Lite `default_prompts` table on `prompt_key` (insert or update; never duplicate).
5. Log a summary: count of copied records, count of authored fallbacks, and any errors.

**Pre-implementation dependency (OQ-006, OQ-007):** The exact NewsNexus12 source tables and column names must be identified by reading the NewsNexus12 schema before this script can be finalized. The PRD notes that the gateway-plus-hazard-prompt structure may not exist in NewsNexus12, meaning the three hazard prompts may all be authored defaults. This discovery step must happen before implementation begins on the copy script.

The copy script is idempotent (re-running it refreshes defaults without duplicating rows) and is the only operation that ever writes to the Postgres default store.

## 10. Error Handling and Logging

All error handling follows `docs/ERROR_REQUIREMENTS.md`. Logging follows `docs/LOGGING_NODE_JS_V08.md`.

Key conditions:

| Condition | Response |
| --- | --- |
| RSS fetch failure | HTTP 502; preserve prior session articles; include user-readable error |
| Session cookie missing | Generate a new session; return fresh state with `firstLaunchAnswered: false` |
| Session not found (expired / server restart) | Same as missing cookie |
| Rate limit exceeded | HTTP 429 with `Retry-After` header |
| Run not found | HTTP 404 |
| `articleIds` exceeds 10 | HTTP 400 with message explaining the demo limit |
| Copy script: NewsNexus12 unreachable | Log error; halt script; do not partially seed |

## 11. Open Architecture Decisions

| Decision | Recommendation | Needs Confirmation? |
| --- | --- | --- |
| Session store | In-memory map for v01; Redis path documented for scale | No |
| Rate limit scope | Tiered: write endpoints at 200/hr + 1,000/day; read endpoints at 2,000/15min | Confirm with Nick |
| Standalone Postgres vs reuse db-models | Standalone — required for isolation guarantee | No |
| Copy script NewsNexus12 source tables | Must be discovered by reading NewsNexus12 schema before implementation | Yes — blocks copy script impl |
