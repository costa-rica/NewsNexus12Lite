import { Router } from "express";

import { STAGE_NAMES } from "../services/constants";
import { runPipeline } from "../services/pipelineRunner";
import { createRun, getSessionRun } from "../services/runStore";
import type { ArticleSnapshot, PipelineRun, StageName } from "../types";

export const orchestrationRouter = Router();

function overallProgress(run: PipelineRun): number {
  const total = run.articleIds.length * STAGE_NAMES.length;
  if (total === 0) {
    return 0;
  }
  const completed = Object.values(run.articleProgress).reduce(
    (sum, progress) => sum + progress.completedStages,
    0
  );
  return Math.round((completed / total) * 100);
}

function snapshotArticle(article: ArticleSnapshot): ArticleSnapshot {
  const pipeline = { ...article.pipeline };
  for (const stage of STAGE_NAMES) {
    const result = pipeline[stage];
    pipeline[stage] = {
      status: result.status,
      score: result.score ?? result.locationScore ?? result.semanticScore,
      assignedState: result.assignedState,
      confidence: result.confidence,
      finalStatus: result.finalStatus
    };
  }
  return {
    id: article.id,
    title: article.title,
    source: article.source,
    rowStatus: article.rowStatus,
    pipeline: pipeline as ArticleSnapshot["pipeline"]
  };
}

function publicRun(run: PipelineRun) {
  return {
    ...run,
    cancellationPending: run.cancellationRequested && run.status !== "cancelled",
    overallProgress: overallProgress(run)
  };
}

function defaultPipelineMode(): "mock" | "live" {
  return process.env.PIPELINE_MODE === "live" ? "live" : "mock";
}

orchestrationRouter.post("/runs", (req, res) => {
  if ("stages" in (req.body ?? {}) || "useSessionPrompts" in (req.body ?? {})) {
    res.status(400).json({ result: false, error: "Lite runs use the fixed stage sequence and per-stage prompt capture." });
    return;
  }
  const articleIds = req.body?.articleIds;
  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    res.status(400).json({ result: false, error: "articleIds must be a non-empty array." });
    return;
  }
  if (articleIds.length > 10) {
    res.status(400).json({ result: false, error: "Demo is limited to 10 articles. Please submit 10 or fewer article IDs." });
    return;
  }
  const articleIdSet = new Set(res.locals.session.articles.map((article) => article.id));
  if (!articleIds.every((id: unknown) => typeof id === "string" && articleIdSet.has(id))) {
    res.status(400).json({ result: false, error: "One or more article IDs are unknown for this session." });
    return;
  }
  const mode = req.body?.mode === "live" || req.body?.mode === "mock" ? req.body.mode : defaultPipelineMode();
  if (mode === "live" && !process.env.AI_API_KEY) {
    res.status(400).json({ result: false, error: "AI_API_KEY is required when mode is live." });
    return;
  }

  const run = createRun(res.locals.session.sessionId, articleIds);
  res.locals.session.activeRunId = run.runId;
  setImmediate(() => {
    void runPipeline(run, res.locals.session, mode);
  });
  res.status(202).json({ result: true, data: { runId: run.runId, status: run.status } });
});

orchestrationRouter.get("/runs/:runId", (req, res) => {
  const run = getSessionRun(res.locals.session, req.params.runId);
  if (!run) {
    res.status(404).json({ result: false, error: "Run not found." });
    return;
  }
  res.json({ result: true, data: { run: publicRun(run) } });
});

orchestrationRouter.get("/runs/:runId/snapshot", (req, res) => {
  const run = getSessionRun(res.locals.session, req.params.runId);
  if (!run) {
    res.status(404).json({ result: false, error: "Run not found." });
    return;
  }
  const selected = new Set(run.articleIds);
  const articles = res.locals.session.articles
    .filter((article) => selected.has(article.id))
    .map(snapshotArticle);
  res.json({ result: true, data: { run: publicRun(run), articles } });
});

orchestrationRouter.post("/runs/:runId/cancel", (req, res) => {
  const run = getSessionRun(res.locals.session, req.params.runId);
  if (!run) {
    res.status(404).json({ result: false, error: "Run not found." });
    return;
  }
  if (run.status !== "running") {
    res.json({ result: true, data: { runId: run.runId, status: run.status, cancellationPending: false } });
    return;
  }
  run.cancellationRequested = true;
  res.status(202).json({
    result: true,
    data: { runId: run.runId, status: run.status, cancellationPending: true }
  });
});

export function isStageName(value: string): value is StageName {
  return (STAGE_NAMES as string[]).includes(value);
}

export default orchestrationRouter;
