"use client";

import { Play, Square } from "lucide-react";

import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { STAGES } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { cancelRun, startRun } from "@/store/orchestrationSlice";

export function OrchestrationPanel() {
  const dispatch = useAppDispatch();
  const articles = useAppSelector((state) => state.articles.items);
  const orchestration = useAppSelector((state) => state.orchestration);
  const active = orchestration.status === "running";
  const progress = Math.max(0, Math.min(100, orchestration.overallProgress));

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="grid gap-5">
        <div>
          <h2 className="text-theme-xl font-semibold text-gray-900 dark:text-white">Analysis Pipeline</h2>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">Current: {orchestration.currentStage ?? "Not running"}</p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-theme-sm">
            <span className="text-gray-500 dark:text-gray-400">Overall progress</span>
            <strong className="text-gray-900 dark:text-white">{progress}%</strong>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid gap-2">
          {STAGES.map((stage, index) => {
            const status = orchestration.stageStatuses[stage.key];
            const color = status === "complete" ? "success" : status === "failed" ? "error" : status === "running" ? "primary" : "light";
            return (
              <div
                key={stage.key}
                className={`flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-theme-sm dark:border-gray-800 ${
                  status === "running" ? "animate-pulse" : ""
                }`}
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {index + 1}. {stage.label}
                </span>
                <Badge color={color}>{status}</Badge>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={articles.length === 0 || active} onClick={() => void dispatch(startRun())} startIcon={<Play className="h-4 w-4" />}>
            Start Run
          </Button>
        {orchestration.runId && active ? (
          <Button
            variant="danger"
            type="button"
            disabled={orchestration.cancellationPending}
            onClick={() => void dispatch(cancelRun())}
            startIcon={<Square className="h-4 w-4" />}
          >
            {orchestration.cancellationPending ? "Cancelling..." : "Stop Run"}
          </Button>
        ) : null}
        </div>
        {orchestration.pollError ? (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {orchestration.pollError}
          </div>
        ) : null}
        {orchestration.status === "cancelled" ? (
          <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400">
            Cancelled
          </div>
        ) : null}
      </div>
    </aside>
  );
}
