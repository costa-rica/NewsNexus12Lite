---
created_at: 2026-06-13
updated_at: 2026-06-13
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Frontend TODO V01 Assessment — Codex

Source TODO: `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md`

## Qualifying Concerns

### 1. First-launch refresh verification contradicts the no-login session UX

Phase 4 correctly says that if `session.firstLaunchAnswered` is hydrated as `true` from `sessionStorage`, the modal should be skipped (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:169-171`). It also says the "No, continue" action dispatches `setFirstLaunchAnswered(true)` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:164-166`). However, the manual verification step then says to click "No, continue", refresh, and confirm the modal appears again (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:184-185`).

That conflicts with Frontend Plan V02 and PRD FR-006: once the user chooses Yes or No in the current session/page lifecycle and the value is persisted to `sessionStorage`, normal refresh/navigation should not show the modal again. This verification task would push an implementing agent toward breaking the intended first-launch behavior. It should instead verify that the modal stays dismissed after either Yes or No while the sessionStorage-backed session remains present.

### 2. Prompt dirty/default semantics are internally contradictory

Phase 2 defines `dirtyFlags` and says `applyPrompts(scope)` calls `markClean(scope)` on successful `PUT /api/prompts` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:78-84`). Phase 10 and Phase 11 use those same dirty flags to render a "Default" or "Modified" session status badge (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:416-430`, `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:463-474`), while their tests/manual checks expect the badge to show "Modified" after an edit/apply (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:437-448`, `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:481`).

This leaves the implementing agent without a coherent state model. If `dirtyFlags` mean "unsaved local edits", `markClean` after apply is correct but they cannot drive the required session "Modified" badge. If they mean "session differs from defaults", `markClean` after apply is wrong. The TODO should separate these concepts, e.g. `hasUnsavedChanges` for local textarea edits and `isDefault`/`isSessionModified` derived from session prompts versus defaults.

### 3. The TODO references a reset action that is never defined

Phase 4 and Phase 5 both require dispatching `promptsSlice.resetAllToDefaults` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:164-166`, `docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:201-204`), but Phase 2 only defines `setDefaults`, `setSessionPrompts`, `updateApproverPrompts`, `updateStateAssignerPrompt`, `markClean`, and `resetPromptGroup` (`docs/20260613_NEWSNEXUS12LITE_FRONTEND_TODO_V01.md:78-84`).

This is small but implementation-affecting: first-launch Yes and Reset Demo are core requirements, and the current task list calls an action that does not exist in the slice contract. The TODO should add `resetAllToDefaults` to Phase 2 with exact behavior, or change the later phases to dispatch the defined reset actions.
