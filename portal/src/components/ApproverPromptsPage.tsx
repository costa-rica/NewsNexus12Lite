"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { applyPrompts, loadPrompts, resetPromptGroup, updateApproverDraft } from "@/store/promptsSlice";

export function ApproverPromptsPage() {
  const dispatch = useAppDispatch();
  const prompts = useAppSelector((state) => state.prompts);
  const running = useAppSelector((state) => state.orchestration.status === "running");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const draft = prompts.drafts?.approver;

  useEffect(() => {
    if (!prompts.session) {
      void dispatch(loadPrompts());
    }
  }, [dispatch, prompts.session]);

  if (!draft) {
    return <div className="prompt-page">Loading prompts...</div>;
  }

  async function reset() {
    await apiClient.postReset("approverPrompts");
    dispatch(resetPromptGroup("approver"));
  }

  return (
    <section className="prompt-page stack">
      <div className="row">
        <h1>AI Approver Prompts</h1>
        <span className={`chip ${prompts.isSessionModified.approver ? "medium" : "good"}`}>
          {prompts.isSessionModified.approver ? "Modified" : "Default"}
        </span>
      </div>
      {running ? <div className="notice">Prompt edits will take effect when the next stage begins.</div> : null}
      {prompts.hasUnsavedChanges.approver ? <div className="notice">Unsaved changes</div> : null}
      <label>
        Gateway Prompt
        <textarea
          className="textarea"
          value={draft.gatewayPrompt}
          onChange={(event) => dispatch(updateApproverDraft({ ...draft, gatewayPrompt: event.target.value }))}
        />
      </label>
      <table>
        <thead>
          <tr>
            <th>Hazard</th>
            <th>Prompt</th>
          </tr>
        </thead>
        <tbody>
          {(["chemical", "wildfire", "severeWeather"] as const).map((hazard) => (
            <tr key={hazard}>
              <td>
                <button className="btn" type="button" onClick={() => setExpanded((value) => ({ ...value, [hazard]: !value[hazard] }))}>
                  {hazard}
                </button>
              </td>
              <td>
                {expanded[hazard] ? (
                  <textarea
                    className="textarea"
                    value={draft.hazardPrompts[hazard]}
                    onChange={(event) =>
                      dispatch(
                        updateApproverDraft({
                          ...draft,
                          hazardPrompts: { ...draft.hazardPrompts, [hazard]: event.target.value }
                        })
                      )
                    }
                  />
                ) : (
                  <span>{draft.hazardPrompts[hazard].slice(0, 80)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button className="btn primary" type="button" disabled={!prompts.hasUnsavedChanges.approver} onClick={() => void dispatch(applyPrompts("approver"))}>
          Apply to Session
        </button>
        <button className="btn" type="button" onClick={() => void reset()}>
          Reset Approver Prompts
        </button>
      </div>
    </section>
  );
}
