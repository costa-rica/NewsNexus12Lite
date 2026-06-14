import { randomUUID } from "node:crypto";

import type { PipelineRun, SessionObject, StageStatus } from "../types";
import { cloneStageStatuses } from "./constants";

export const runStore = new Map<string, PipelineRun>();

export function createRun(sessionId: string, articleIds: string[], runId = randomUUID()): PipelineRun {
  const articleProgress: PipelineRun["articleProgress"] = {};
  for (const articleId of articleIds) {
    articleProgress[articleId] = {
      completedStages: 0,
      totalStages: 5,
      status: "pending" as StageStatus
    };
  }

  const run: PipelineRun = {
    runId,
    sessionId,
    articleIds,
    status: "running",
    cancellationRequested: false,
    currentStage: null,
    stageStatuses: cloneStageStatuses(),
    articleProgress,
    startedAt: new Date().toISOString()
  };

  runStore.set(run.runId, run);
  return run;
}

export function getRun(runId: string): PipelineRun | undefined {
  return runStore.get(runId);
}

export function getSessionRun(session: SessionObject, runId: string): PipelineRun | undefined {
  const run = getRun(runId);
  return run?.sessionId === session.sessionId ? run : undefined;
}
