---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend TODO V06 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V06.md`

## Qualifying Concerns

### 1. The main `/` pipeline page is never created or wired

The frontend plan requires `/` to be the main pipeline page containing the RSS search form, article table, orchestration panel, and right sidebar. TODO V06 creates `<RssSearchForm>` in Phase 5, `<ArticleTable>` / `<ArticleRow>` in Phase 6, and `<OrchestrationPanel>` in Phase 8, but it never includes a task to create `portal/src/app/page.tsx` or a main page component that composes those pieces.

An implementing agent following the TODO literally could finish all component phases while leaving the root route as the scaffolded Next.js page or an empty page. That would break the planned `/` route and make several manual verification steps impossible, including confirming article rows render after search and confirming orchestration controls work in the main UI.

The TODO should add an explicit phase task to create the main App Router page at `portal/src/app/page.tsx`, render the pipeline layout with `<RssSearchForm>`, `<ArticleTable>`, and `<OrchestrationPanel>`, and verify `/` as the integrated pipeline page.

### 2. Prompt route tasks put client-only mount behavior directly in App Router pages

Phase 10 says `portal/src/app/prompts/approver/page.tsx` should dispatch `promptsSlice.loadPrompts` "on mount"; Phase 11 says the same for `portal/src/app/prompts/state-assigner/page.tsx`. In the Next.js App Router, `page.tsx` files are server components by default, so an implementer who puts `useEffect`, Redux hooks, or dispatch logic directly in those files without marking a client boundary will hit a build/runtime error.

This is similar to the V05 root-layout concern, but scoped to prompt pages. The TODO should clarify the boundary: either mark the prompt page files with `"use client"` if they own mount effects, or keep `page.tsx` as a server route wrapper that renders dedicated client components such as `<ApproverPromptsPage>` and `<StateAssignerPromptsPage>` where `loadPrompts` is dispatched.

## Resolved V05 Concerns

The V05 root layout concern is resolved. TODO V06 keeps `portal/src/app/layout.tsx` as a server layout and moves Redux, PersistGate, global UI, and `initSession` effects into a dedicated client shell.

The V05 429 import-cycle concern is resolved. TODO V06 requires `apiClient.ts` to throw a typed `RateLimitError` and explicitly forbids importing the Redux store or dispatching toasts directly from the API client.
