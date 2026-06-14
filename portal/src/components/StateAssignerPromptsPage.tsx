"use client";

import { useEffect } from "react";

import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { applyPrompts, loadPrompts, resetPromptGroup, updateStateAssignerDraft } from "@/store/promptsSlice";

export function StateAssignerPromptsPage() {
  const dispatch = useAppDispatch();
  const prompts = useAppSelector((state) => state.prompts);
  const running = useAppSelector((state) => state.orchestration.status === "running");
  const draft = prompts.drafts?.stateAssigner;

  useEffect(() => {
    if (!prompts.session) {
      void dispatch(loadPrompts());
    }
  }, [dispatch, prompts.session]);

  if (!draft) {
    return <div className="prompt-page">Loading prompts...</div>;
  }

  async function reset() {
    await apiClient.postReset("stateAssignerPrompts");
    dispatch(resetPromptGroup("stateAssigner"));
  }

  return (
    <section className="prompt-page stack">
      <div className="row">
        <h1>State Assigner Prompts</h1>
        <span className={`chip ${prompts.isSessionModified.stateAssigner ? "medium" : "good"}`}>
          {prompts.isSessionModified.stateAssigner ? "Modified" : "Default"}
        </span>
      </div>
      {running ? <div className="notice">Prompt edits will take effect when the next stage begins.</div> : null}
      {prompts.hasUnsavedChanges.stateAssigner ? <div className="notice">Unsaved changes</div> : null}
      <label>
        State Assignment Prompt
        <textarea
          className="textarea"
          value={draft.assignmentPrompt}
          onChange={(event) => dispatch(updateStateAssignerDraft(event.target.value))}
        />
      </label>
      <section className="notice">
        <h2>Supporting Details</h2>
        <p>Read-only - sourced from NewsNexus12 defaults</p>
        <pre>{JSON.stringify(prompts.defaults?.stateAssigner.supportingDetails ?? {}, null, 2)}</pre>
      </section>
      <div className="row">
        <button className="btn primary" type="button" disabled={!prompts.hasUnsavedChanges.stateAssigner} onClick={() => void dispatch(applyPrompts("stateAssigner"))}>
          Apply to Session
        </button>
        <button className="btn" type="button" onClick={() => void reset()}>
          Reset State Assigner Prompt
        </button>
      </div>
    </section>
  );
}
