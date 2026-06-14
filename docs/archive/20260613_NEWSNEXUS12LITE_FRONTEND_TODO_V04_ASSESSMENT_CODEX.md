---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend TODO V04 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V04.md`

## Qualifying Concerns

### 1. `isPolling` sequencing can prevent the first snapshot loop from starting

Phase 2 defines `startRun` as setting `runId`, setting `isPolling: true`, and then dispatching `startSnapshotPolling` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V04.md:75`). Phase 9 then instructs `startSnapshotPolling` to check `orchestration.isPolling` before starting a new loop and return if polling is already active (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V04.md:385`).

Taken literally, the first successful run can set `isPolling` to `true` before the polling thunk starts. The duplicate poll guard would then treat the first polling request as a duplicate and skip creating the loop. That conflicts with the frontend plan's requirement that storing the returned `runId` starts the snapshot polling loop (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_PLAN_V02.md:116`) and risks breaking progressive article/table updates.

Phase 9 should clarify the intended sequence. For example: `startRun` should set the `runId` and dispatch `startSnapshotPolling`, while `startSnapshotPolling` performs the duplicate guard and sets `isPolling: true` only after it decides to create the loop. Alternatively, the guard should compare the active polling run ID against the new run ID rather than using a bare boolean that was already flipped by `startRun`.

## Resolved Prior Concern

The V03 assessment concern is resolved. Phase 12 now references the Phase 9 polling-layer guard in `startSnapshotPolling` and explicitly compares top-level `snapshot.run.runId` to the current `orchestration.runId` before article updates (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V04.md:526`). Phase 9 also says not to require or add article-level `runId` fields (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V04.md:389`).
