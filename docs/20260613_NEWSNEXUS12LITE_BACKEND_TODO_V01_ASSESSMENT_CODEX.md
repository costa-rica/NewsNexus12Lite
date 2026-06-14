---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Backend TODO V01 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_BACKEND_TODO_V01.md`

## Qualifying Concerns

### 1. Run ownership is underspecified and conflicts with the session-scoped plan

Backend TODO Phase 7 instructs the implementing agent to create a module-level `runStore` that is "separate from session map" and exposes `createRun(articleIds)` / `getRun(runId)` only (`docs/20260613_NEWSNEXUS12LITE_BACKEND_TODO_V01.md:246-249`). Later tasks require `GET /api/orchestration/runs/:runId`, snapshot, and cancel to "verify it belongs to the current session" (`docs/20260613_NEWSNEXUS12LITE_BACKEND_TODO_V01.md:259-264`, `docs/20260613_NEWSNEXUS12LITE_BACKEND_TODO_V01.md:304-305`), but the run schema and `runStore` API do not include `sessionId`, a parent session reference, or any other ownership field.

This leaves an implementing agent to infer ownership from `session.activeRunId` only, which becomes ambiguous after a new search/reset/start replaces the active run. It also diverges from Backend Plan V03 / Pipeline Plan V02, where run state is session-scoped and the snapshot endpoint reads the session-owned in-memory state. The TODO should explicitly define how run ownership is stored and checked, for example by storing runs under the session object or by adding a `sessionId`/owner field to `PipelineRun` and tests for cross-session access.

### 2. Orchestration request shape reintroduces rejected/legacy fields

Phase 7 says `POST /api/orchestration/runs` accepts `{ articleIds, stages?, useSessionPrompts?, mode? }` (`docs/20260613_NEWSNEXUS12LITE_BACKEND_TODO_V01.md:250-251`). The vetted Backend Plan V03 endpoint only requires article validation, run creation, and mode handling; Pipeline Plan V02 requires exactly five stages in a fixed order and explicitly rejects run-start/global prompt snapshot semantics in favor of per-stage prompt capture.

Leaving `stages?` and `useSessionPrompts?` in the backend TODO risks an implementation that supports custom stage subsets or prompt-capture behavior contrary to the vetted pipeline plan. The TODO should remove these fields or explicitly say they are rejected/ignored and must not alter the fixed five-stage sequence or FR-086 stage-start prompt capture.
