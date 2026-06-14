import type {
  ApproverPrompts,
  Article,
  PipelineRun,
  PipelineStageResult,
  SessionObject,
  StageName,
  StateAssignerPrompts
} from "../types";
import { STAGE_NAMES } from "./constants";
import { logger } from "./logger";
import { runAiApprover } from "./stages/aiApprover";
import { runLocationScorer } from "./stages/locationScorer";
import { runScraping } from "./stages/scraping";
import { runSemanticScorer } from "./stages/semanticScorer";
import { runStateAssigner } from "./stages/stateAssigner";

type PipelineMode = "mock" | "live";

function cancelRun(run: PipelineRun): void {
  run.status = "cancelled";
  run.currentStage = null;
  run.cancelledAt = new Date().toISOString();
}

function previousStageFailed(article: Article, stage: StageName): boolean {
  const index = STAGE_NAMES.indexOf(stage);
  if (index <= 0) {
    return false;
  }
  const previousStage = STAGE_NAMES[index - 1];
  return ["failed", "skipped"].includes(article.pipeline[previousStage].status);
}

function updateRowStatus(article: Article): void {
  if (Object.values(article.pipeline).some((stage) => stage.status === "failed")) {
    article.rowStatus = "failed";
    return;
  }
  if (Object.values(article.pipeline).every((stage) => stage.status === "complete" || stage.status === "skipped")) {
    article.rowStatus = "complete";
    return;
  }
  if (Object.values(article.pipeline).some((stage) => stage.status === "running" || stage.status === "complete")) {
    article.rowStatus = "processing";
    return;
  }
  article.rowStatus = "pending";
}

async function executeStage(
  stage: StageName,
  article: Article,
  mode: PipelineMode,
  articleIndex: number,
  stateAssignerPrompts: StateAssignerPrompts | null,
  approverPrompts: ApproverPrompts | null
): Promise<PipelineStageResult> {
  switch (stage) {
    case "scraping":
      return runScraping(article, null, mode, articleIndex);
    case "locationScorer":
      return runLocationScorer(article, null, mode, articleIndex);
    case "stateAssigner":
      return runStateAssigner(article, stateAssignerPrompts!, mode, articleIndex);
    case "semanticScorer":
      return runSemanticScorer(article, null, mode, articleIndex);
    case "aiApprover":
      return runAiApprover(article, approverPrompts!, mode, articleIndex);
  }
}

export async function runPipeline(
  run: PipelineRun,
  session: SessionObject,
  mode: PipelineMode
): Promise<void> {
  if (run.articleIds.length > 10) {
    run.status = "failed";
    run.failedAt = new Date().toISOString();
    logger.warn("Pipeline run exceeded Lite article cap", {
      runId: run.runId,
      articleCount: run.articleIds.length
    });
    return;
  }

  for (const stage of STAGE_NAMES) {
    if (run.cancellationRequested) {
      cancelRun(run);
      return;
    }

    run.currentStage = stage;
    run.stageStatuses[stage] = "running";
    let stateAssignerPrompts: StateAssignerPrompts | null = null;
    let approverPrompts: ApproverPrompts | null = null;

    if (stage === "stateAssigner") {
      stateAssignerPrompts = {
        assignmentPrompt: session.promptState.stateAssigner.assignmentPrompt
      };
    }

    if (stage === "aiApprover") {
      approverPrompts = {
        gatewayPrompt: session.promptState.approver.gatewayPrompt,
        hazardPrompts: { ...session.promptState.approver.hazardPrompts }
      };
    }

    let completedCount = 0;

    for (const [articleIndex, articleId] of run.articleIds.entries()) {
      const article = session.articles.find((item) => item.id === articleId);
      if (!article) {
        continue;
      }

      if (previousStageFailed(article, stage)) {
        article.pipeline[stage] = {
          status: "skipped",
          reasoning: "Skipped because the previous required stage failed."
        };
        run.articleProgress[articleId].completedStages += 1;
        run.articleProgress[articleId].status = "skipped";
        updateRowStatus(article);
        continue;
      }

      article.pipeline[stage] = { status: "running", startedAt: new Date().toISOString() };
      updateRowStatus(article);
      const result = await executeStage(
        stage,
        article,
        mode,
        articleIndex,
        stateAssignerPrompts,
        approverPrompts
      );
      article.pipeline[stage] = {
        ...result,
        completedAt: new Date().toISOString()
      };
      if (result.status === "complete") {
        completedCount += 1;
      } else {
        logger.warn("Article stage failed", {
          runId: run.runId,
          articleId,
          stage,
          error: result.error
        });
      }
      run.articleProgress[articleId].completedStages += 1;
      run.articleProgress[articleId].status = result.status;
      updateRowStatus(article);
    }

    run.stageStatuses[stage] = completedCount > 0 ? "complete" : "failed";

    if (run.cancellationRequested) {
      cancelRun(run);
      return;
    }
  }

  run.status = "complete";
  run.currentStage = null;
  run.completedAt = new Date().toISOString();
}
