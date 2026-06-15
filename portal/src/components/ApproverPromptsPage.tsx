"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { Label } from "@/components/ui/form/Label";
import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { applyPrompts, loadPrompts, resetPromptGroup, updateApproverDraft } from "@/store/promptsSlice";

const textareaClass =
  "min-h-48 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-theme-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

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
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-theme-sm text-gray-500 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">Loading prompts...</div>;
  }

  async function reset() {
    await apiClient.postReset("approverPrompts");
    dispatch(resetPromptGroup("approver"));
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">AI Approver Prompts</h1>
          <Badge color={prompts.isSessionModified.approver ? "warning" : "success"}>
            {prompts.isSessionModified.approver ? "Modified" : "Default"}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {running ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-theme-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              Prompt edits will take effect when the next stage begins.
            </div>
          ) : null}
          {prompts.hasUnsavedChanges.approver ? (
            <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400">
              Unsaved changes
            </div>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <Label htmlFor="gateway-prompt">Gateway Prompt</Label>
        <textarea
          id="gateway-prompt"
          className={textareaClass}
          value={draft.gatewayPrompt}
          onChange={(event) => dispatch(updateApproverDraft({ ...draft, gatewayPrompt: event.target.value }))}
        />
      </div>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-theme-lg font-semibold text-gray-900 dark:text-white">Hazard Prompts</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {(["chemical", "wildfire", "severeWeather"] as const).map((hazard) => (
            <div key={hazard} className="grid gap-3 p-6 md:grid-cols-[180px_minmax(0,1fr)]">
              <div>
                <Button
                  className="w-full md:w-auto"
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setExpanded((value) => ({ ...value, [hazard]: !value[hazard] }))}
                >
                  {expanded[hazard] ? "Hide" : "Edit"} {hazard}
                </Button>
              </div>
              <div className="min-w-0">
                {expanded[hazard] ? (
                  <textarea
                    className={textareaClass}
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
                  <p className="line-clamp-3 text-theme-sm text-gray-600 dark:text-gray-300">{draft.hazardPrompts[hazard].slice(0, 240)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={!prompts.hasUnsavedChanges.approver} onClick={() => void dispatch(applyPrompts("approver"))}>
          Apply to Session
        </Button>
        <Button variant="outline" type="button" onClick={() => void reset()}>
          Reset Approver Prompts
        </Button>
      </div>
    </section>
  );
}
