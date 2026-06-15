"use client";

import { AlertCircle, Minus } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { useAppDispatch } from "@/hooks/store";
import { openExplanationModal, setSelectedExplanation } from "@/store/uiSlice";
import type { StageName, StageStatus } from "@/types";

function tone(score: number | undefined, status: StageStatus): string {
  if (status === "failed") {
    return "border-error-200 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400";
  }
  if (status === "pending" || status === "running") {
    return `border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-800 dark:bg-white/5 dark:text-gray-400 ${
      status === "running" ? "animate-pulse" : ""
    }`;
  }
  if (status === "skipped") {
    return "border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-800 dark:bg-white/5 dark:text-gray-400";
  }
  if (score === undefined) {
    return "border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-800 dark:bg-white/5 dark:text-gray-400";
  }
  if (score >= 0.8) {
    return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400";
  }
  if (score >= 0.5) {
    return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400";
  }
  return "border-error-200 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400";
}

export function ScoreBubble({
  articleId,
  score,
  stage,
  status,
  label
}: {
  articleId: string;
  score?: number;
  stage: StageName;
  status: StageStatus;
  label: string;
}) {
  const dispatch = useAppDispatch();
  const text = status === "skipped" ? "skip" : score === undefined ? status : score.toFixed(2);

  async function openExplanation() {
    if (status === "pending" || status === "running" || status === "skipped") {
      return;
    }
    const data = await apiClient.getExplanation(articleId, stage);
    dispatch(setSelectedExplanation({ ...(data as object), articleId, stage }));
    dispatch(openExplanationModal());
  }

  return (
    <button
      className={`inline-flex min-h-8 min-w-12 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-theme-xs font-semibold transition hover:shadow-theme-xs disabled:opacity-80 ${tone(score, status)}`}
      type="button"
      aria-label={`${label} ${text}`}
      disabled={status === "pending" || status === "running" || status === "skipped"}
      onClick={() => void openExplanation()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void openExplanation();
        }
      }}
    >
      {status === "failed" ? <AlertCircle size={14} /> : status === "skipped" ? <Minus size={14} /> : text}
    </button>
  );
}
