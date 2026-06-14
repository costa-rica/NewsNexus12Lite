---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend Plan V01 Assessment

## Qualifying Concerns

### 1. Polling strategy exceeds the stated API cap

The operator constraint says the target API limits are 200/hour and 1,000/day. Frontend Plan V01 polls the run endpoint every 2 seconds and the articles endpoint every 2 seconds offset by 1 second, producing about 60 polling requests per minute during an active run before expanded-row detail calls.

That steady-state behavior reaches the 200/hour target in a few minutes. The plan only works if the backend exempts polling endpoints from the stated target limits, which is not part of the operator constraints. If the cap is intended to apply to public API requests generally, this frontend plan will not work as written.

### 2. Stop Run calls an endpoint/scope the backend plan does not define

The Orchestration Control Panel says Stop Run dispatches `POST /api/demo/reset { scope: "run" }` or a dedicated cancel endpoint if implemented. The backend plan defines neither a `run` reset scope nor a cancel endpoint.

Because the Stop Run button is planned as visible and enabled when a run is active, this creates a user-facing control that has no valid API contract and will fail unless the plans are reconciled.
