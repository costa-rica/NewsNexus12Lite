---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend TODO V03 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V03.md`

## Qualifying Concerns

### 1. Phase 12 reintroduces ambiguity about where the stale run guard belongs

Phase 9 correctly resolves the V02 assessment concern by requiring `startSnapshotPolling` to compare the top-level `snapshot.run.runId` against the current Redux `orchestration.runId`, discard mismatched snapshots before any updates, and avoid adding an embedded article-level `runId` to `ArticleSnapshot` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V03.md:389`).

However, Phase 12 later says reset-during-active-run should discard late snapshots using a "run-ID guard in `articlesSlice`" (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V03.md:526`). That conflicts with Phase 9's corrected placement and can send an implementing agent back toward the V02 problem: putting run identity logic in the article reducer, where the planned `ArticleSnapshot` contract does not provide `runId`.

The backend and pipeline contracts keep `runId` on the top-level `snapshot.run` object, while `ArticleSnapshot` contains article and pipeline fields only (`docs/20260613_NEWSNEXUS12LITE_BACKEND_PLAN_V03.md:136`, `docs/20260613_NEWSNEXUS12LITE_BACKEND_PLAN_V03.md:153`, `docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V02.md:44`).

Phase 12 should be rewritten to reference the Phase 9 guard in `startSnapshotPolling`, or more generally "the polling-layer run-ID guard," rather than a guard in `articlesSlice`. The stale snapshot guard should continue to use only the top-level `snapshot.run.runId`.
