---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Backend Plan V02 Assessment

## Qualifying Concerns

### 1. Rate limiter implementation does not match the stated sliding-window cap

Backend Plan V02 says the public demo cap is a global 200 requests per hour and 1,000 requests per day per IP, and §6.1 specifies two `express-rate-limit` middleware instances implementing 60-minute and 24-hour **sliding** windows.

`express-rate-limit`'s standard `windowMs` limiter is a fixed-window limiter, not a sliding-window limiter. Implemented literally, this can allow bursts across window boundaries that exceed 200 requests in a rolling hour, despite the plan describing a sliding-window cap. This is a technology mismatch in the rate-limit design.

To make the plan feasible as written, it should either use fixed-window terminology and accept fixed-window behavior, or specify a sliding-window-capable store/algorithm for the hourly and daily limits.

### 2. Cancel endpoint response contract is internally inconsistent

Backend Plan V02 §7.2 defines `POST /api/orchestration/runs/:runId/cancel` as returning `{ runId, status: "cancelled", cancelledAt: "ISO timestamp" }` immediately. The same section then says the endpoint only sets `run.cancellationRequested = true`, returns immediately, and the pipeline later sets `run.status = "cancelled"` at a stage boundary.

Those two behaviors cannot both be true. If the endpoint returns terminal `cancelled` before the pipeline has reached the cancellation boundary, the API can report a terminal state while the current stage is still writing results. If the endpoint returns the current running status or a pending-cancellation status, then the response shape in §7.2 is wrong.

The frontend and pipeline V02 plans rely on continued polling until a snapshot confirms `status: "cancelled"`, so the backend plan should align the cancel response with that contract: the cancel endpoint should acknowledge the request without claiming terminal cancellation until the snapshot/run status actually reaches `cancelled`.
