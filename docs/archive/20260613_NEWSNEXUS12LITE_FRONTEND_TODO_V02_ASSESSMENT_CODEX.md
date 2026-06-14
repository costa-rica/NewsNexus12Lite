---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend TODO V02 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V02.md`

## Qualifying Concerns

### 1. Stale snapshot guard depends on a `runId` field that is not in the snapshot article contract

Phase 9 asks for a run-ID guard in `articlesSlice.updateArticleFromSnapshot` that ignores snapshots where the embedded `runId` does not match `orchestration.runId`, and it asks for a test where a snapshot with a stale `runId` is discarded (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V02.md:389`, `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V02.md:395`).

That guard is directionally aligned with Frontend Plan V02's requirement to discard stale responses, but the planned API shape does not embed `runId` in each `ArticleSnapshot`. Backend Plan V03 says the snapshot response contains a top-level `run.runId`, while each `ArticleSnapshot` includes only `id`, `title`, `source`, `rowStatus`, and per-stage status/score fields. Pipeline TODO V02 defines the same article snapshot shape without `runId`.

As written, an implementing agent must guess whether to modify the backend article snapshot contract, add `runId` to frontend-only article objects, or pass the response's top-level `run.runId` alongside each article update. Changing the backend shape would unnecessarily diverge from the vetted plans, while implementing the reducer exactly as written is impossible from the planned payload.

The TODO should keep the stale-response guard, but specify that `startSnapshotPolling` checks the top-level `snapshot.run.runId` against the current `orchestration.runId` before dispatching article updates, or passes that top-level run ID as metadata to `updateArticleFromSnapshot`. The test should assert stale response discard using the top-level snapshot `run.runId`, not an embedded article-level `runId`.
