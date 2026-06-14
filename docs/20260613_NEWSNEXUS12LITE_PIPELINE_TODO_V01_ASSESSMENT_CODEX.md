---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Pipeline TODO V01 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md`

## Qualifying Concerns

### 1. The pipeline cap guard references data that is not in the runner contract

Phase 5 instructs the implementing agent to add a guard at the top of `runPipeline` using `articleIds.length` (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:238-240`). But the TODO's runner signature is `runPipeline(run: PipelineRun, session: SessionObject, mode)` (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:67-70`), and the `PipelineRun` interface defined in Phase 1 does not include `articleIds` (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:14-35`).

An implementing agent must guess whether to add `articleIds` to `PipelineRun`, derive them from `run.articleProgress`, pass a fourth parameter, or read all session articles. This affects max-10 enforcement and stage iteration. The TODO should make the contract explicit, preferably by adding `articleIds: string[]` to `PipelineRun` or changing `runPipeline` to accept the ordered article IDs directly.

### 2. Cancellation tests contradict the stated stage-boundary semantics

Phase 7 correctly states that cancellation is checked before each stage and after all articles complete a stage, not between article iterations (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:311-318`). The next tests then include both "Cancellation set mid-run (after Stage 2 articles complete)" where Stage 2 is completed for all articles, and "Articles at Stage 1 (when Stage 2 cancellation fires) retain Stage 1 results; Stage 2 status remains pending" (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:323-328`).

Those two test expectations describe different timing models. If cancellation is only observed after Stage 2 completes, Stage 2 should not remain pending. If cancellation is observed before Stage 2 begins, then Stage 2 remains pending, but the test should say cancellation was already requested at the pre-Stage-2 boundary. As written, the TODO can produce a broken or contradictory test suite around the stop/cancel UX.

### 3. AI Approver hazard failure handling is ambiguous with `Promise.all`

Phase 3 requires the AI Approver hazard phase to execute all three hazard prompts concurrently using `Promise.all` (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:153-164`). Phase 8 requires that if one hazard call fails after a relevant gateway, the implementation stores partial successful hazard results and sets final status according to normalization (`docs/20260613_NEWSNEXUS12LITE_PIPELINE_TODO_V01.md:362-378`).

Plain `Promise.all` rejects on the first rejected hazard call and does not directly preserve partial successes. The TODO should specify the intended approach, such as wrapping each hazard promise so it resolves to a success/failure result or using `Promise.allSettled`, while still launching the calls concurrently. Without that clarification, the implementation is likely to either lose partial results or fail the Phase 8 error-handling requirements.
