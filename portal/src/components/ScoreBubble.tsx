"use client";

import { AlertCircle, Minus } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { useAppDispatch } from "@/hooks/store";
import { setSelectedExplanation } from "@/store/uiSlice";
import type { StageName, StageStatus } from "@/types";

function tone(score: number | undefined, status: StageStatus): string {
  if (status === "failed") {
    return "bad";
  }
  if (status === "pending" || status === "running") {
    return `pending${status === "running" ? " pulse" : ""}`;
  }
  if (status === "skipped") {
    return "pending";
  }
  if (score === undefined) {
    return "pending";
  }
  if (score >= 0.8) {
    return "good";
  }
  if (score >= 0.5) {
    return "medium";
  }
  return "bad";
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
  }

  return (
    <button
      className={`score-bubble ${tone(score, status)}`}
      type="button"
      aria-label={`${label} ${text}`}
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
