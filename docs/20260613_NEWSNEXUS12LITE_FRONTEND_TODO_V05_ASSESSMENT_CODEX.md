---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend TODO V05 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md`

## Qualifying Concerns

### 1. Root layout tasks mix server-only and client-only responsibilities

Phase 3 says to implement `portal/src/app/layout.tsx` as the root App Router layout and wrap the tree with Redux `<Provider>` plus `<PersistGate>` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:121`). Phase 4 then says to add a `useEffect` in that same `layout.tsx` to dispatch `initSession` on mount (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:173`).

Taken literally, this pushes React client-only behavior into the App Router root layout. An implementing agent may mark the root layout `"use client"` to make hooks and Redux Persist work, which risks losing the normal server-layout pattern for `<html>`, `<body>`, and metadata/title handling. Leaving it as a server component will not support `useEffect`, Redux Provider, or PersistGate directly.

The TODO should clarify the split: keep `app/layout.tsx` as the root server layout that renders `<html>`, `<body>`, and metadata/title, then mount a dedicated client component such as `Providers` or `ClientShell` inside `<body>` to own Redux `<Provider>`, `<PersistGate>`, `initSession`, `<RightSidebar>`, `<FirstLaunchModal>`, and `<ToastArea>`.

### 2. Global 429 toast handling in `apiClient.ts` risks an import cycle

Phase 2 defines `apiClient.ts` as a plain typed endpoint wrapper and says HTTP 429 should include `Retry-After` in the thrown error (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:92`). Phase 12 later says to implement global 429 handling in `apiClient.ts` by dispatching `uiSlice.addToast` directly (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:518`).

That leaves too much ambiguity because the Redux thunks import the API client, while the store combines slices and thunk logic. If `apiClient.ts` imports the store or `uiSlice` to dispatch toasts globally, it can create a circular dependency around `store -> slices/thunks -> apiClient -> store/uiSlice`, especially under Next.js client/server bundling.

The TODO should specify the architecture for rate-limit notifications. For example, keep `apiClient.ts` side-effect-light by throwing a typed `RateLimitError` with `retryAfter`, and have thunks/components catch that error and dispatch `uiSlice.addToast`; or explicitly define an injected `onRateLimit` callback that is registered after store creation. Either approach avoids making the API wrapper directly own Redux dispatch.

## Resolved Prior Concern

The V04 assessment concern is resolved. Phase 2 now states that `startRun` stores the `runId` and dispatches `startSnapshotPolling` without setting `isPolling: true` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:75`). Phase 9 also states that `startSnapshotPolling` performs the duplicate guard first, then sets `isPolling: true` only after the guard passes (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:385`), and the polling tests explicitly cover that sequence (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V05.md:394`).
