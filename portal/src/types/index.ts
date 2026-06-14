export type StageName = "scraping" | "locationScorer" | "stateAssigner" | "semanticScorer" | "aiApprover";
export type StageStatus = "pending" | "running" | "complete" | "failed" | "skipped";
export type RunStatus = "running" | "complete" | "failed" | "cancelled";
export type RowStatus = "pending" | "processing" | "complete" | "failed" | "cancelled" | "skipped";
export type ResetScope = "all" | "articles" | "prompts" | "approverPrompts" | "stateAssignerPrompts";
export type PromptScope = "approver" | "stateAssigner";
export type HazardType = "chemical" | "wildfire" | "severeWeather";

export interface StageResult {
  status: StageStatus;
  score?: number;
  locationScore?: number;
  semanticScore?: number;
  assignedState?: string;
  confidence?: number;
  reasoning?: string;
  promptInput?: string;
  promptOutput?: unknown;
  finalStatus?: "approved" | "rejected" | "needs_review" | "failed";
  finalReasoning?: string;
  gateway?: Record<string, unknown>;
  hazards?: Array<Record<string, unknown>>;
  error?: string;
}

export interface Article {
  id: string;
  title: string;
  source: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  rowStatus: RowStatus;
  pipeline: Record<StageName, StageResult>;
}

export type ArticleSnapshot = Article;

export interface PromptConfiguration {
  approver: {
    gatewayPrompt: string;
    hazardPrompts: Record<HazardType, string>;
  };
  stateAssigner: {
    assignmentPrompt: string;
    supportingDetails?: unknown;
  };
  updatedAt?: string;
}

export interface RunSnapshot {
  run: {
    runId: string;
    status: RunStatus;
    cancellationPending: boolean;
    currentStage: StageName | null;
    stageStatuses: Record<StageName, StageStatus>;
    overallProgress: number;
    startedAt: string;
    completedAt?: string;
    cancelledAt?: string;
  };
  articles: ArticleSnapshot[];
}

export interface ScoreExplanation {
  articleId: string;
  stage: StageName;
  score?: number;
  assignedState?: string;
  confidence?: number;
  reasoning?: string;
  promptInput?: string;
  promptOutput?: unknown;
  finalStatus?: string;
  gateway?: Record<string, unknown>;
  hazards?: Array<Record<string, unknown>>;
}

export interface Toast {
  id: string;
  message: string;
  tone?: "info" | "error" | "rate-limit";
}
