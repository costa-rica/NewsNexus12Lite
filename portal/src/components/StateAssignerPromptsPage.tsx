"use client";

import { useEffect } from "react";

import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { Label } from "@/components/ui/form/Label";
import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { applyPrompts, loadPrompts, resetPromptGroup, updateStateAssignerDraft } from "@/store/promptsSlice";

const textareaClass =
  "min-h-64 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-theme-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

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
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-theme-sm text-gray-500 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">Loading prompts...</div>;
  }

  async function reset() {
    await apiClient.postReset("stateAssignerPrompts");
    dispatch(resetPromptGroup("stateAssigner"));
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">State Assigner Prompts</h1>
          <Badge color={prompts.isSessionModified.stateAssigner ? "warning" : "success"}>
          {prompts.isSessionModified.stateAssigner ? "Modified" : "Default"}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {running ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-theme-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              Prompt edits will take effect when the next stage begins.
            </div>
          ) : null}
          {prompts.hasUnsavedChanges.stateAssigner ? (
            <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400">
              Unsaved changes
            </div>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <Label htmlFor="state-assignment-prompt">State Assignment Prompt</Label>
        <textarea
          id="state-assignment-prompt"
          className={textareaClass}
          value={draft.assignmentPrompt}
          onChange={(event) => dispatch(updateStateAssignerDraft(event.target.value))}
        />
      </div>
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-theme-lg font-semibold text-gray-900 dark:text-white">Supporting Details</h2>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">Read-only - sourced from NewsNexus12 defaults</p>
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-theme-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {JSON.stringify(prompts.defaults?.stateAssigner.supportingDetails ?? {}, null, 2)}
        </pre>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={!prompts.hasUnsavedChanges.stateAssigner} onClick={() => void dispatch(applyPrompts("stateAssigner"))}>
          Apply to Session
        </Button>
        <Button variant="outline" type="button" onClick={() => void reset()}>
          Reset State Assigner Prompt
        </Button>
      </div>
    </section>
  );
}
