---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: claude (sonnet-4-6)
modified_by: claude (sonnet-4-6)
---

# NewsNexus12Lite — Backend TODO V01

Source plan: `docs/20260613_NEWSNEXUS12LITE_BACKEND_PLAN_V03.md`

---

## Phase 1 — Project Scaffold and Configuration

- [ ] Create the `api/` directory at the repo root (mirrors NewsNexus12 `api/` package layout).
- [ ] Initialize `package.json` for the `api/` package with a name of `@newsnexus12lite/api`.
- [ ] Add runtime dependencies: `express` (v5), `express-rate-limit` (v8), `sequelize` (v6), `pg`, `pg-hstore`, `axios`, `xml2js`, `winston`, `cookie-parser`, `uuid`.
- [ ] Add dev dependencies: `typescript`, `ts-node`, `@types/express`, `@types/node`, `@types/xml2js`, `@types/uuid`, `@types/cookie-parser`, `eslint`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`.
- [ ] Add npm scripts: `dev` (ts-node with watch), `build` (tsc), `start` (compiled JS), `test` (jest), `lint` (eslint).
- [ ] Create `tsconfig.json` targeting ES2020, `commonjs` module, `strict: true`, output to `dist/`.
- [ ] Create `api/src/` directory structure:
  - `app.ts` — Express app factory (no `listen` call; importable for tests)
  - `server.ts` — entry point that calls `app.listen`
  - `models/` — Sequelize model files
  - `routes/` — Express router files
  - `middleware/` — rate-limiting and other middleware
  - `services/` — session map, RSS proxy, pipeline runner
  - `types/` — shared TypeScript interfaces
- [ ] Create `.env.example` documenting required environment variables:
  - `PORT` (default 4000)
  - `DATABASE_URL` — Lite Postgres connection string
  - `PIPELINE_MODE` — `mock` (default) or `live`
  - `AI_API_KEY` — required when `PIPELINE_MODE=live`
  - `MOCK_STAGE_DELAY_MS` — optional; default 400–900 ms range
  - `HOURLY_RATE_LIMIT` — optional override for hourly cap (default 200)
  - `DAILY_RATE_LIMIT` — optional override for daily cap (default 1000)
- [ ] Add `.env` and `.env.seed` to `.gitignore`.
- [ ] Create `api/src/types/index.ts` with shared interfaces:
  - `Article`, `ArticleSnapshot`, `PipelineStageResult`
  - `PromptConfiguration`, `SessionObject`
  - `PipelineRun`, `StageName`, `StageStatus`
  - `RunStatus` union type: `"running" | "complete" | "failed" | "cancelled"`
  - `ResetScope` union type: `"all" | "articles" | "prompts" | "approverPrompts" | "stateAssignerPrompts"`

### Phase 1 Verification

- [ ] Run `npm run lint` — resolve all ESLint errors.
- [ ] Run `npm run build` — confirm TypeScript compiles with zero errors.
- [ ] If test infrastructure exists, run `npm test` — confirm zero failing tests (no tests yet at this phase; confirm runner exits cleanly).

### Phase 1 Commit Guidance

After all Phase 1 verification tasks pass:
- Stage `api/` scaffold files (package.json, tsconfig.json, src/ structure, .env.example, .gitignore entries).
- Commit message type: `chore`. Title: `chore: scaffold api package for newsnexus12lite`. Body: reference this file and phase.

---

## Phase 2 — Database Models (Postgres Default Store)

- [ ] Configure Sequelize in `api/src/models/sequelize.ts`:
  - Initialize with `DATABASE_URL` from environment.
  - Set dialect to `postgres`, `logging: false` in production, `logging: console.log` in development.
  - Export the `sequelize` instance for use by models and the copy script.
- [ ] Create `api/src/models/DefaultPrompt.ts`:
  - Fields: `id` (UUID PK, `defaultValue: DataTypes.UUIDV4`), `promptKey` (STRING, unique, not null), `promptText` (TEXT, not null), `supportingDetails` (JSONB, allow null), `source` (STRING, not null — `"copied"` or `"authored"`), `createdAt`, `updatedAt`.
  - Valid `promptKey` values: `approver_gateway`, `approver_chemical`, `approver_wildfire`, `approver_severe_weather`, `state_assigner`.
  - Add a TypeScript enum or const for the valid keys.
- [ ] Create `api/src/models/ArticleFixture.ts`:
  - Fields: `id` (UUID PK), `title` (TEXT), `source` (STRING), `description` (TEXT), `url` (STRING), `publishedAt` (DATE, allow null), `rawData` (JSONB), `createdAt`.
  - `updatedAt: false` (fixtures are immutable after seeding).
- [ ] Create `api/src/models/index.ts` that imports and exports both models.
- [ ] Create a migration-style sync in `api/src/models/sync.ts` that runs `sequelize.sync({ alter: false })` in production and `sequelize.sync({ alter: true })` in development. Call this from `server.ts` before `app.listen`.
- [ ] Write unit tests in `api/src/models/__tests__/DefaultPrompt.test.ts`:
  - Test that `promptKey` column rejects values outside the valid set (if enforced at the model layer with a validator).
  - Test that `source` rejects values other than `"copied"` and `"authored"`.

### Phase 2 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — confirm zero TypeScript errors.
- [ ] Run `npm test` — all model tests must pass.
- [ ] Start the app locally (`npm run dev`) and confirm `sequelize.sync` creates the tables without error against a local Postgres instance.

### Phase 2 Commit Guidance

After all Phase 2 verification tasks pass:
- Stage all model files and tests.
- Commit message type: `feat`. Reference this file and phase in the body.

---

## Phase 3 — Session Management

- [ ] Create `api/src/services/sessionStore.ts`:
  - Export a `Map<string, SessionObject>` instance (module-level singleton).
  - Export `getSession(sessionId: string): SessionObject | undefined`.
  - Export `createSession(): SessionObject` — generates a UUID, initializes a fresh `SessionObject` with `firstLaunchAnswered: false`, empty `articles`, default `promptState` from Postgres defaults, and `activeRunId: null`.
  - Export `resetSession(session: SessionObject, scope: ResetScope): void` — applies the appropriate reset per scope.
- [ ] Create `api/src/middleware/session.ts`:
  - Express middleware that reads the `sessionId` cookie.
  - If cookie absent or session not found in the map, calls `createSession()`, stores it, and sets the `HttpOnly`, `SameSite=Strict` cookie on the response.
  - Attaches `session` to `res.locals.session` for downstream handlers.
- [ ] Mount `cookie-parser` and the session middleware globally in `app.ts` before all routes.
- [ ] Create `api/src/services/defaultPrompts.ts`:
  - Export `loadDefaultPrompts(): Promise<PromptConfiguration>` — queries `DefaultPrompt` model for all five keys and assembles a `PromptConfiguration` object.
  - Cache the result in memory after the first load (defaults never change at runtime).
  - Export `getDefaultPrompts(): PromptConfiguration` — synchronous accessor after the async load has completed.
- [ ] On server startup (before `app.listen`), call `loadDefaultPrompts()` so the cache is warm before any session is created.
- [ ] Write tests in `api/src/__tests__/sessionStore.test.ts`:
  - Test `createSession()` returns a valid `SessionObject` with correct initial values.
  - Test `getSession()` returns `undefined` for an unknown ID.
  - Test `resetSession(session, "all")` clears articles, resets promptState, and clears activeRunId.
  - Test `resetSession(session, "approverPrompts")` resets only the approver prompt group.

### Phase 3 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all session tests must pass.

### Phase 3 Commit Guidance

After all Phase 3 verification tasks pass:
- Stage session and defaultPrompts service files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 4 — Global Rate Limiting

- [ ] Create `api/src/middleware/rateLimiter.ts`:
  - Import `rateLimit` from `express-rate-limit`.
  - Create `hourlyLimiter`: 200 requests per 60-minute fixed window per IP. Read limit from `HOURLY_RATE_LIMIT` env var (default 200). Set `standardHeaders: true`, `legacyHeaders: false`.
  - Create `dailyLimiter`: 1,000 requests per 24-hour fixed window per IP. Read limit from `DAILY_RATE_LIMIT` env var (default 1000).
  - Both limiters must set a `Retry-After` header in seconds to the reset time of the current window when the limit is exceeded.
  - Both limiters respond with HTTP 429 and JSON body `{ result: false, error: "Rate limit exceeded. Retry after N seconds." }`.
  - Export both limiters as named exports.
- [ ] In `app.ts`, apply both limiters globally before route mounting: `app.use(hourlyLimiter, dailyLimiter)`. A request must pass both windows to proceed.
- [ ] Write tests in `api/src/middleware/__tests__/rateLimiter.test.ts`:
  - Test that a request under both limits proceeds (HTTP 200 or route handler result).
  - Test that a request exceeding the hourly limit returns HTTP 429 with a `Retry-After` header.
  - Test that a request exceeding the daily limit returns HTTP 429 with a `Retry-After` header.
  - Test that the response body matches the `{ result: false, error: "..." }` shape.

**Implementation note:** `express-rate-limit` uses a **fixed-window** counter. This means a burst of up to 400 requests is theoretically possible across an hourly window boundary. This trade-off is accepted per the plan (Backend Plan V03 §6.1) as appropriate for the demo context.

### Phase 4 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all rate-limiter tests must pass.

### Phase 4 Commit Guidance

After all Phase 4 verification tasks pass:
- Stage rate-limiter middleware and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 5 — Demo, Session, and Reset Endpoints

- [ ] Create `api/src/routes/demo.ts` and mount it at `/api/demo` in `app.ts`.
- [ ] Implement `GET /api/demo/session`:
  - Read session from `res.locals.session` (set by session middleware).
  - Load default prompts via `getDefaultPrompts()`.
  - Return `{ result: true, data: { session, articles, activeRunId, promptState, promptIsDefault } }`.
  - `promptIsDefault` is a per-group flag comparing session prompt values to the defaults.
- [ ] Implement `POST /api/demo/first-launch`:
  - Accept body `{ isFirstTime: boolean }`.
  - If `isFirstTime` is true, call `resetSession(session, "all")`.
  - Set `session.firstLaunchAnswered = true` in both branches.
  - Return `{ result: true, data: { firstLaunchAnswered: true } }`.
  - Return HTTP 400 if body is missing or `isFirstTime` is not a boolean.
- [ ] Implement `POST /api/demo/reset`:
  - Accept body `{ scope: ResetScope }`.
  - Validate that `scope` is one of the five valid values; return HTTP 400 if not.
  - Call `resetSession(session, scope)`.
  - Return `{ result: true, data: { scope, resetAt: new Date().toISOString() } }`.
- [ ] Write integration tests in `api/src/routes/__tests__/demo.test.ts` using `supertest`:
  - `GET /api/demo/session` returns a valid session object and sets a session cookie on first call.
  - `GET /api/demo/session` returns the same session on subsequent calls using the cookie.
  - `POST /api/demo/first-launch { isFirstTime: true }` resets articles and prompts.
  - `POST /api/demo/first-launch { isFirstTime: false }` does not reset state.
  - `POST /api/demo/reset { scope: "all" }` clears all session state.
  - `POST /api/demo/reset { scope: "approverPrompts" }` resets only approver prompts.
  - `POST /api/demo/reset` with invalid scope returns HTTP 400.

### Phase 5 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all demo route tests must pass.

### Phase 5 Commit Guidance

After all Phase 5 verification tasks pass:
- Stage demo route files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 6 — RSS Search Endpoint

- [ ] Create `api/src/routes/rss.ts` and mount it at `/api/rss` in `app.ts`.
- [ ] Implement `POST /api/rss/search`:
  - Accept body: `{ query: string, limit?: number, language?: string, region?: string }`.
  - Validate that `query` is a non-empty string; return HTTP 400 if not.
  - **Live mode** (`PIPELINE_MODE=live` or not `mock`):
    - Construct Google News RSS URL from `query`, `language`, `region`.
    - Fetch the feed with `axios` (set a reasonable timeout, e.g., 10s).
    - Parse XML with `xml2js`.
    - Normalize RSS items into `Article` objects: `id` (UUID), `title`, `source`, `description`, `url`, `publishedAt`.
    - Slice results to the first 10 items. Set `truncated: true` if the raw feed returned more than 10.
    - Return `{ result: true, data: { articles, truncated, query } }`.
    - On `axios` network failure or non-200 RSS response: return HTTP 502 with `{ result: false, error: "RSS feed unavailable" }`. Do not clear prior session articles (session articles are unchanged by a failed search).
  - **Mock mode** (`PIPELINE_MODE=mock`):
    - Return `ArticleFixture` records from Postgres (up to 10). Set `truncated: false` (fixtures are pre-limited).
    - Still validate `query` is present (for API consistency).
  - After a successful search, replace `session.articles` with the returned articles and clear `session.activeRunId`.
- [ ] Write tests in `api/src/routes/__tests__/rss.test.ts`:
  - Mock mode returns fixture articles from Postgres.
  - A search that returns more than 10 raw articles is sliced to 10 and sets `truncated: true`.
  - A missing or empty `query` returns HTTP 400.
  - RSS network failure returns HTTP 502 without modifying session articles.

### Phase 6 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all RSS route tests must pass.

### Phase 6 Commit Guidance

After all Phase 6 verification tasks pass:
- Stage RSS route files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 7 — Orchestration Run and Snapshot Endpoints

- [ ] Create `api/src/routes/orchestration.ts` and mount it at `/api/orchestration` in `app.ts`.
- [ ] Create `api/src/services/runStore.ts`:
  - Export a `Map<string, PipelineRun>` (module-level singleton, separate from session map).
  - Export `createRun(articleIds: string[]): PipelineRun`.
  - Export `getRun(runId: string): PipelineRun | undefined`.
- [ ] Implement `POST /api/orchestration/runs`:
  - Accept body: `{ articleIds: string[], stages?: StageName[], useSessionPrompts?: boolean, mode?: "mock" | "live" }`.
  - Validate `articleIds` is a non-empty array with **at most 10 items**. Return HTTP 400 with `{ result: false, error: "Demo is limited to 10 articles." }` if exceeded.
  - Validate that all `articleIds` exist in `session.articles`. Return HTTP 400 if any ID is unknown.
  - If `mode === "live"` and `AI_API_KEY` is absent from environment, return HTTP 400.
  - Create a `PipelineRun` object (see Pipeline Plan V02 §3.1) with `status: "running"`, all `stageStatuses` set to `"pending"`, `cancellationRequested: false`.
  - Store the run in the session via `session.activeRunId = run.runId` and in `runStore`.
  - Launch the pipeline loop asynchronously (detached async IIFE or `setImmediate`) — see Pipeline TODO for the loop implementation.
  - Return HTTP 202 immediately: `{ result: true, data: { runId, status: "running" } }`.
- [ ] Implement `GET /api/orchestration/runs/:runId`:
  - Look up run by `runId`; verify it belongs to the current session.
  - Return `{ result: true, data: { run } }` with run status, stage statuses, overall progress, article progress counts.
  - Return HTTP 404 if not found or wrong session.
- [ ] Implement `GET /api/orchestration/runs/:runId/snapshot` (primary poll target):
  - Look up run; verify session ownership.
  - Assemble response:
    ```
    {
      run: {
        runId, status, cancellationPending, currentStage,
        stageStatuses, overallProgress, startedAt, completedAt?, cancelledAt?
      },
      articles: ArticleSnapshot[]
    }
    ```
  - `cancellationPending` is derived: `true` when `run.cancellationRequested === true` and `run.status !== "cancelled"`.
  - Each `ArticleSnapshot` includes: `id`, `title`, `source`, `rowStatus`, and per-stage `{ status, score?, assignedState?, confidence? }` for all five stages.
  - Return HTTP 404 if run not found or wrong session.
- [ ] Write tests in `api/src/routes/__tests__/orchestration.test.ts`:
  - `POST /api/orchestration/runs` with 11 article IDs returns HTTP 400.
  - `POST /api/orchestration/runs` with 0 article IDs returns HTTP 400.
  - `POST /api/orchestration/runs` with `mode: "live"` and no `AI_API_KEY` returns HTTP 400.
  - `POST /api/orchestration/runs` with valid 3 article IDs returns HTTP 202 with a `runId`.
  - `GET /api/orchestration/runs/:runId` returns current run state.
  - `GET /api/orchestration/runs/:runId/snapshot` returns both run and article snapshots.
  - Both GET endpoints return HTTP 404 for an unknown `runId`.
  - Snapshot `cancellationPending` is `true` when `cancellationRequested` is set and run is not yet cancelled.

### Phase 7 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all orchestration route tests must pass.

### Phase 7 Commit Guidance

After all Phase 7 verification tasks pass:
- Stage orchestration route files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 8 — Cancel Endpoint

- [ ] Implement `POST /api/orchestration/runs/:runId/cancel` in `orchestration.ts`:
  - Look up run by `runId`; verify session ownership. Return HTTP 404 if not found.
  - **If run is in a terminal state** (`complete`, `failed`, `cancelled`): return HTTP 200 with the current run status unchanged. No mutation. This is the idempotent path.
  - **If run is active** (`status: "running"`):
    - Set `run.cancellationRequested = true` on the in-memory run object.
    - Return **HTTP 202** immediately:
      ```json
      {
        "result": true,
        "data": {
          "runId": "<id>",
          "status": "running",
          "cancellationPending": true
        }
      }
      ```
    - Do **not** wait for the pipeline loop to stop. The pipeline's cancellation check (between stages) will advance the run to `"cancelled"` asynchronously.
  - **If run is not found for the current session**: return HTTP 404.
- [ ] Write tests in `api/src/routes/__tests__/cancel.test.ts`:
  - Cancel an active run returns HTTP 202 with `status: "running"` and `cancellationPending: true`.
  - Cancel an already-cancelled run returns HTTP 200 with the terminal state (idempotent).
  - Cancel a completed run returns HTTP 200 with `status: "complete"`.
  - Cancel a non-existent run returns HTTP 404.
  - After a cancel call, the run object in memory has `cancellationRequested: true`.

### Phase 8 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all cancel endpoint tests must pass.

### Phase 8 Commit Guidance

After all Phase 8 verification tasks pass:
- Stage cancel endpoint additions and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 9 — Article and Explanation Endpoints

- [ ] Create `api/src/routes/articles.ts` and mount it at `/api/articles` in `app.ts`.
- [ ] Implement `GET /api/articles/:articleId`:
  - Look up the article in `session.articles` by ID.
  - Return `{ result: true, data: { article } }` with the full article object including all per-stage pipeline state.
  - Return HTTP 404 if not found.
- [ ] Implement `GET /api/articles/:articleId/explanations/:stage`:
  - Validate that `stage` is one of the five valid stage names.
  - Look up the article's stage result in session.
  - Return `{ result: true, data: { stage, score?, confidence?, reasoning, explanation?, promptInput, promptOutput, createdAt } }`.
  - Return HTTP 404 if article not found.
  - Return HTTP 404 if the stage has not yet produced a result (status is `pending` or `running`).
  - Return HTTP 422 if the stage is present but failed (include the error detail).
- [ ] Write tests in `api/src/routes/__tests__/articles.test.ts`:
  - `GET /api/articles/:id` returns the full article object for a known article.
  - `GET /api/articles/:id` returns HTTP 404 for an unknown ID.
  - `GET /api/articles/:id/explanations/:stage` returns explanation data when the stage has a result.
  - `GET /api/articles/:id/explanations/:stage` returns HTTP 404 when the stage has no result yet.
  - `GET /api/articles/:id/explanations/invalidStage` returns HTTP 400.

### Phase 9 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all article and explanation route tests must pass.

### Phase 9 Commit Guidance

After all Phase 9 verification tasks pass:
- Stage article route files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 10 — Prompt Endpoints

- [ ] Create `api/src/routes/prompts.ts` and mount it at `/api/prompts` in `app.ts`.
- [ ] Implement `GET /api/prompts`:
  - Read `session.promptState` (current session copy) and `getDefaultPrompts()`.
  - Compute `isDefault` per group: `true` if the session copy equals the default for that group.
  - Return `{ result: true, data: { prompts: session.promptState, isDefault: { approver, stateAssigner } } }`.
- [ ] Implement `PUT /api/prompts`:
  - Accept body: `{ scope: "approver" | "stateAssigner", prompts: {...} }`.
  - Validate `scope` is one of the two values; return HTTP 400 otherwise.
  - Validate `prompts` matches the expected shape for the scope; return HTTP 400 on schema mismatch.
  - Write the new prompts to `session.promptState[scope]` only. **Do not touch the `DefaultPrompt` Postgres table. Do not touch the other scope.**
  - Return `{ result: true, data: { scope, updatedAt: new Date().toISOString() } }`.
- [ ] Write tests in `api/src/routes/__tests__/prompts.test.ts`:
  - `GET /api/prompts` returns current session prompts and `isDefault` flags.
  - `GET /api/prompts` returns `isDefault: { approver: true, stateAssigner: true }` on a freshly reset session.
  - `PUT /api/prompts` with `scope: "approver"` updates only the approver session prompts.
  - `PUT /api/prompts` with `scope: "stateAssigner"` updates only the state assigner session prompt.
  - `PUT /api/prompts` with an invalid `scope` returns HTTP 400.
  - `PUT /api/prompts` does not modify Postgres `default_prompts` rows (query the model and assert it is unchanged).

### Phase 10 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all prompt route tests must pass.

### Phase 10 Commit Guidance

After all Phase 10 verification tasks pass:
- Stage prompt route files and tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 11 — Error Handling and Logging

- [ ] Create `api/src/middleware/errorHandler.ts`:
  - An Express error-handling middleware (four arguments: `err, req, res, next`).
  - Returns `{ result: false, error: err.message || "Internal server error" }` with an appropriate status code.
  - Logs the full error via Winston before responding.
  - Mount as the last middleware in `app.ts`.
- [ ] Create `api/src/services/logger.ts`:
  - Initialize a Winston logger following `docs/LOGGING_NODE_JS_V08.md` conventions.
  - Export the logger instance for use throughout `api/src/`.
- [ ] Add structured error logging to each route handler for unexpected errors (catch blocks forward to `next(err)`).
- [ ] Ensure all routes follow the response shape:
  - Success: `{ result: true, data: {...} }`
  - Failure: `{ result: false, error: "..." }`
- [ ] Confirm error table from Backend Plan V03 §10 is covered:
  - [ ] RSS fetch failure → HTTP 502.
  - [ ] Session cookie missing → new session, fresh state.
  - [ ] Session not found → same as missing cookie.
  - [ ] Rate limit exceeded → HTTP 429 + `Retry-After`.
  - [ ] Run not found → HTTP 404.
  - [ ] Cancel on non-existent run → HTTP 404.
  - [ ] `articleIds` exceeds 10 → HTTP 400 with explanatory message.
- [ ] Write tests for the error handler:
  - An unhandled thrown error returns HTTP 500 with `{ result: false, error: ... }`.
  - An error with a status property uses that status code.

### Phase 11 Verification

- [ ] Run `npm run lint` — resolve all errors.
- [ ] Run `npm run build` — zero TypeScript errors.
- [ ] Run `npm test` — all error-handling tests must pass.

### Phase 11 Commit Guidance

After all Phase 11 verification tasks pass:
- Stage error handler, logger, and related tests.
- Commit message type: `feat`. Reference this file and phase.

---

## Phase 12 — Copy Script

**Pre-implementation dependency:** Before writing the copy script, read the NewsNexus12 database schema (`/home/limited_user/applications/NewsNexus12`) to identify the source tables and columns for the state assigner and AI approver prompts. This is required by OQ-006 and OQ-007 from the PRD. The hazard prompt structure may not exist in NewsNexus12 and will need to be authored.

- [ ] Audit the NewsNexus12 schema to identify:
  - Source table(s) and column(s) for the state assigner prompt text and supporting details.
  - Source table(s) and column(s) for any approver gateway prompt.
  - Whether chemical, wildfire, and severe weather hazard prompts exist; if not, note that they will be authored.
- [ ] Create `scripts/seed-defaults.ts` (standalone ts-node script, **not part of the running app**):
  - Load source credentials from `.env.seed` (never the app's `.env`).
  - Open a **read-only** database connection to NewsNexus12 (use a read-only Postgres role or connect with only `SELECT` permission).
  - Query NewsNexus12 for each of the five prompt keys using the schema confirmed above.
  - For each prompt key:
    - If a record is found: map to the `default_prompts` schema and set `source = "copied"`.
    - If no record is found: use an authored default text and set `source = "authored"`.
  - Upsert each record into the Lite `default_prompts` table on `prompt_key` conflict (insert or update; never insert duplicates). This makes the script idempotent.
  - Log a summary after completion: count of copied records, count of authored fallbacks, any per-key errors.
  - On NewsNexus12 connection failure: log the error, halt the script, and do **not** partially seed the Lite database.
  - Close both database connections on exit (success or failure).
- [ ] Add a `seed` npm script to `package.json`: `"seed": "ts-node scripts/seed-defaults.ts"`.
- [ ] Document the script in a brief `scripts/README.md`:
  - Required `.env.seed` variables.
  - How to confirm idempotency (re-run and verify no duplicate rows).
  - What `source = "authored"` means and which keys it applies to.
- [ ] Manually verify idempotency: run the script twice against a test Lite database and confirm row counts are unchanged on the second run.

### Phase 12 Verification

- [ ] Run `npm run lint` — resolve all errors in `scripts/`.
- [ ] Run `npm run build` — confirm TypeScript compiles `scripts/seed-defaults.ts` without errors.
- [ ] Manually run `npm run seed` against a test database and confirm:
  - All five `prompt_key` rows are present.
  - Rows sourced from NewsNexus12 have `source = "copied"`.
  - Rows without a NewsNexus12 source have `source = "authored"`.
  - Running the script a second time produces no duplicate rows and no errors.

### Phase 12 Commit Guidance

After all Phase 12 verification tasks pass:
- Stage `scripts/seed-defaults.ts` and `scripts/README.md`.
- Commit message type: `feat`. Reference this file and phase.
- Do **not** commit `.env.seed` or any credentials.
